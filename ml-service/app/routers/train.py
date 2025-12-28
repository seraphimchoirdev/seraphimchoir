"""
학습 라우터
모델 학습 API
"""
import json
import os
from pathlib import Path
from fastapi import APIRouter, HTTPException

from app.schemas.request_response import TrainRequest, TrainResponse
from app.models.seat_recommender import recommender
from app.services.supabase_client import supabase_service
from app.config import settings

router = APIRouter()

# JSON 학습 데이터 경로 (ml-service 기준 상대 경로)
JSON_TRAINING_DATA_PATH = Path(__file__).parent.parent.parent.parent / "training_data" / "ml_output"


VALID_PARTS = {"SOPRANO", "ALTO", "TENOR", "BASS"}


def load_training_data_from_json() -> list:
    """JSON 파일에서 학습 데이터 로드"""
    training_data = []
    skipped_count = 0

    if not JSON_TRAINING_DATA_PATH.exists():
        print(f"[Train] JSON training data path not found: {JSON_TRAINING_DATA_PATH}")
        return training_data

    json_files = list(JSON_TRAINING_DATA_PATH.glob("ml_*.json"))
    print(f"[Train] Found {len(json_files)} JSON training files")

    for json_file in json_files:
        try:
            with open(json_file, "r", encoding="utf-8") as f:
                data = json.load(f)

            seats = data.get("seats", [])
            for seat in seats:
                part = seat.get("part")

                # 유효한 파트만 포함 (UNKNOWN, SPECIAL 등 제외)
                if part not in VALID_PARTS:
                    skipped_count += 1
                    continue

                training_data.append({
                    "member": {
                        "id": seat.get("member_id"),
                        "name": seat.get("member_name"),
                        "part": part,
                        "height": seat.get("height"),
                        "experience": seat.get("experience_years", 0),
                    },
                    "stats": {
                        "is_fixed_seat": False,
                        "total_appearances": 0,
                    },
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
