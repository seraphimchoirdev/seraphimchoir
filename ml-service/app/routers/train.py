"""
학습 라우터
모델 학습 API

개선 사항 (v2):
- 대원별 실제 통계 계산 (고정석 패턴, 선호 행/열)
- 컨텍스트 피처 추가 (파트 비율, 총 인원)
"""
import json
import os
from pathlib import Path
from collections import Counter, defaultdict
from typing import Dict, List, Any, Tuple
from fastapi import APIRouter, HTTPException

from app.schemas.request_response import TrainRequest, TrainResponse
from app.models.seat_recommender import recommender
from app.services.supabase_client import supabase_service
from app.config import settings

router = APIRouter()

# JSON 학습 데이터 경로 (ml-service 기준 상대 경로)
JSON_TRAINING_DATA_PATH = Path(__file__).parent.parent.parent.parent / "training_data" / "ml_output"


VALID_PARTS = {"SOPRANO", "ALTO", "TENOR", "BASS"}

# 고정석 판정 임계값
FIXED_SEAT_CONFIG = {
    "MIN_APPEARANCES": 3,      # 최소 3회 이상 출석
    "HIGH_CONSISTENCY": 0.8,   # 80% 이상이면 고정석
    "COL_TOLERANCE": 2,        # 열 일관성 계산 시 ±2열 허용
}


def calculate_member_statistics_from_json() -> Tuple[Dict[str, Dict[str, Any]], Dict[str, str]]:
    """
    모든 JSON 파일에서 대원별 통계 계산

    Returns:
        member_stats: 대원별 통계 딕셔너리
        member_parts: 대원별 파트 딕셔너리
    """
    member_history: Dict[str, List[Dict[str, int]]] = defaultdict(list)
    member_parts: Dict[str, str] = {}

    if not JSON_TRAINING_DATA_PATH.exists():
        return {}, {}

    json_files = list(JSON_TRAINING_DATA_PATH.glob("ml_*.json"))

    # 1단계: 모든 배치 기록 수집
    for json_file in json_files:
        try:
            with open(json_file, "r", encoding="utf-8") as f:
                data = json.load(f)

            for seat in data.get("seats", []):
                member_id = seat.get("member_id")
                part = seat.get("part")

                if not member_id or part not in VALID_PARTS:
                    continue

                member_history[member_id].append({
                    "row": seat.get("row"),
                    "col": seat.get("col")
                })
                member_parts[member_id] = part

        except Exception as e:
            print(f"[Stats] Error processing {json_file}: {e}")
            continue

    # 2단계: 통계 계산
    member_stats: Dict[str, Dict[str, Any]] = {}

    for member_id, history in member_history.items():
        if len(history) < 1:
            continue

        rows = [h["row"] for h in history]
        cols = [h["col"] for h in history]

        # 최빈 행 (가장 많이 앉은 행)
        row_counts = Counter(rows)
        preferred_row = row_counts.most_common(1)[0][0]
        row_consistency = row_counts[preferred_row] / len(rows)

        # 평균 열 및 열 일관성
        avg_col = sum(cols) / len(cols)
        preferred_col = round(avg_col)
        cols_in_range = sum(1 for c in cols if abs(c - avg_col) <= FIXED_SEAT_CONFIG["COL_TOLERANCE"])
        col_consistency = cols_in_range / len(cols)

        # 고정석 판정
        is_fixed_seat = (
            len(history) >= FIXED_SEAT_CONFIG["MIN_APPEARANCES"] and
            row_consistency >= FIXED_SEAT_CONFIG["HIGH_CONSISTENCY"] and
            col_consistency >= FIXED_SEAT_CONFIG["HIGH_CONSISTENCY"]
        )

        member_stats[member_id] = {
            "preferred_row": preferred_row,
            "preferred_col": preferred_col,
            "row_consistency": round(row_consistency * 100, 1),
            "col_consistency": round(col_consistency * 100, 1),
            "is_fixed_seat": is_fixed_seat,
            "total_appearances": len(history),
        }

    fixed_count = sum(1 for s in member_stats.values() if s["is_fixed_seat"])
    print(f"[Stats] Calculated stats for {len(member_stats)} members ({fixed_count} fixed seats)")

    return member_stats, member_parts


def calculate_arrangement_context(seats: List[Dict]) -> Dict[str, Any]:
    """
    배치 컨텍스트 계산 (파트 비율, 총 인원 등)
    """
    total = len(seats)
    if total == 0:
        return {
            "total_members": 0,
            "soprano_ratio": 0.25,
            "alto_ratio": 0.25,
            "tenor_ratio": 0.25,
            "bass_ratio": 0.25,
        }

    part_counts = Counter(s.get("part") for s in seats if s.get("part") in VALID_PARTS)

    return {
        "total_members": total,
        "soprano_ratio": part_counts.get("SOPRANO", 0) / total,
        "alto_ratio": part_counts.get("ALTO", 0) / total,
        "tenor_ratio": part_counts.get("TENOR", 0) / total,
        "bass_ratio": part_counts.get("BASS", 0) / total,
        "soprano_count": part_counts.get("SOPRANO", 0),
        "alto_count": part_counts.get("ALTO", 0),
        "tenor_count": part_counts.get("TENOR", 0),
        "bass_count": part_counts.get("BASS", 0),
    }


def load_training_data_from_json() -> list:
    """
    JSON 파일에서 학습 데이터 로드 (개선됨)
    - 대원별 실제 통계 포함
    - 배치 컨텍스트 피처 포함
    """
    training_data = []
    skipped_count = 0

    if not JSON_TRAINING_DATA_PATH.exists():
        print(f"[Train] JSON training data path not found: {JSON_TRAINING_DATA_PATH}")
        return training_data

    # 1. 먼저 모든 파일에서 대원별 통계 계산
    print("[Train] Calculating member statistics from all files...")
    member_stats, member_parts = calculate_member_statistics_from_json()

    # 2. 학습 데이터 생성
    json_files = sorted(JSON_TRAINING_DATA_PATH.glob("ml_*.json"))
    print(f"[Train] Found {len(json_files)} JSON training files")

    for json_file in json_files:
        try:
            with open(json_file, "r", encoding="utf-8") as f:
                data = json.load(f)

            seats = data.get("seats", [])

            # 배치 컨텍스트 계산
            context = calculate_arrangement_context(seats)

            for seat in seats:
                part = seat.get("part")
                member_id = seat.get("member_id")

                # 유효한 파트만 포함 (UNKNOWN, SPECIAL 등 제외)
                if part not in VALID_PARTS:
                    skipped_count += 1
                    continue

                # 대원 통계 조회 (없으면 기본값)
                stats = member_stats.get(member_id, {
                    "preferred_row": 3,
                    "preferred_col": 8,
                    "row_consistency": 50,
                    "col_consistency": 50,
                    "is_fixed_seat": False,
                    "total_appearances": 0,
                })

                training_data.append({
                    "member": {
                        "id": member_id,
                        "name": seat.get("member_name"),
                        "part": part,
                        "height": seat.get("height"),  # 미래 대비
                        "experience": seat.get("experience_years", 0),  # 미래 대비
                    },
                    "stats": stats,
                    "context": context,  # 배치 컨텍스트 추가
                    "seat_row": seat.get("row"),
                    "seat_col": seat.get("col"),
                })
        except Exception as e:
            print(f"[Train] Error loading {json_file}: {e}")
            continue

    if skipped_count > 0:
        print(f"[Train] Skipped {skipped_count} records with invalid parts")

    return training_data


@router.post("/train", response_model=TrainResponse)
async def train_model(request: TrainRequest):
    """모델 학습"""

    # 기존 모델이 있고 force가 아니면 에러
    if recommender.is_trained and not request.force:
        raise HTTPException(
            status_code=400,
            detail="모델이 이미 학습되어 있습니다. force=true로 덮어쓸 수 있습니다."
        )

    try:
        training_data = []
        data_source = "none"

        # 1. DB에서 학습 데이터 로드 시도
        print("[Train] Loading training data from DB...")
        try:
            seats_data = await supabase_service.get_all_seats()
            member_stats = await supabase_service.get_member_statistics()

            if seats_data and len(seats_data) > 0:
                stats_map = {stat["member_id"]: stat for stat in member_stats}

                for seat in seats_data:
                    member = seat.get("members", {})
                    if not member:
                        continue

                    training_data.append({
                        "member": {
                            "id": member.get("id"),
                            "name": member.get("name"),
                            "part": member.get("part"),
                            "height": member.get("height"),
                            "experience": member.get("experience"),
                        },
                        "stats": stats_map.get(member.get("id"), {}),
                        "seat_row": seat.get("seat_row"),
                        "seat_col": seat.get("seat_column"),
                    })
                data_source = "db"
                print(f"[Train] Loaded {len(training_data)} samples from DB")
        except Exception as db_error:
            print(f"[Train] DB load failed: {db_error}")

        # 2. DB 데이터가 부족하면 JSON 파일에서 로드
        if len(training_data) < settings.MIN_TRAINING_SAMPLES:
            print(f"[Train] DB data insufficient ({len(training_data)}), loading from JSON files...")
            json_data = load_training_data_from_json()
            if json_data:
                training_data = json_data  # JSON 데이터로 대체
                data_source = "json"
                print(f"[Train] Loaded {len(training_data)} samples from JSON files")

        print(f"[Train] Total training samples: {len(training_data)} (source: {data_source})")

        if len(training_data) < settings.MIN_TRAINING_SAMPLES:
            raise HTTPException(
                status_code=400,
                detail=f"최소 {settings.MIN_TRAINING_SAMPLES}개의 샘플이 필요합니다. (현재: {len(training_data)})"
            )

        # 모델 학습
        metrics = recommender.train(training_data)

        # 모델 저장
        recommender.save_model()

        return TrainResponse(
            success=True,
            message="모델 학습이 완료되었습니다.",
            samples_used=len(training_data),
            metrics=metrics,
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"학습 중 오류 발생: {str(e)}")


@router.get("/model/status")
async def model_status():
    """모델 상태 확인"""
    return {
        "is_trained": recommender.is_trained,
        "model_path": settings.MODEL_PATH,
    }
