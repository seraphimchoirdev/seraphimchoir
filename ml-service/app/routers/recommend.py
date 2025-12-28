"""
추천 라우터
AI 기반 좌석 배치 추천 API
"""
from fastapi import APIRouter, HTTPException
from typing import Dict

from app.schemas.request_response import (
    RecommendRequest,
    RecommendResponse,
    SeatRecommendation,
    GridLayout,
)
from app.models.seat_recommender import recommender
from app.services.supabase_client import supabase_service

router = APIRouter()


def calculate_quality_metrics(
    recommendations: list,
    members: list,
    grid_layout: dict
) -> Dict[str, float]:
    """품질 메트릭 계산"""
    total_members = len(members)
    placed_members = len(recommendations)

    # 배치율
    placement_rate = placed_members / total_members if total_members > 0 else 0

    # 파트 균형도
    part_counts = {}
    for rec in recommendations:
        part = rec["part"]
        part_counts[part] = part_counts.get(part, 0) + 1

    if part_counts:
        avg_size = sum(part_counts.values()) / len(part_counts)
        variance = sum((c - avg_size) ** 2 for c in part_counts.values()) / len(part_counts)
        part_balance = max(0, 1 - (variance / (avg_size ** 2))) if avg_size > 0 else 0
    else:
        part_balance = 0

    return {
        "placementRate": placement_rate,
        "partBalance": part_balance,
        "heightOrder": 0.8,  # TODO: 실제 계산
        "leaderPosition": 0.85,  # TODO: 실제 계산
    }


@router.post("/recommend", response_model=RecommendResponse)
async def get_recommendation(request: RecommendRequest):
    """좌석 배치 추천"""

    # 모델 확인
    if not recommender.is_trained:
        raise HTTPException(
            status_code=503,
            detail="모델이 학습되지 않았습니다. /api/v1/train을 먼저 호출하세요."
        )

    try:
        # 대원 통계 조회
        db_stats = await supabase_service.get_member_statistics()
        member_stats = {stat["member_id"]: stat for stat in db_stats}

        # 대원 데이터 변환
        members = [
            {
                "id": m.id,
                "name": m.name,
                "part": m.part.value,
                "height": m.height,
                "experience": m.experience,
                "is_leader": m.is_leader,
            }
            for m in request.members
        ]

        # 그리드 레이아웃 설정
        if request.grid_layout:
            grid_layout = {
                "rows": request.grid_layout.rows,
                "row_capacities": request.grid_layout.row_capacities,
                "zigzag_pattern": request.grid_layout.zigzag_pattern,
            }
        else:
            # 기본 레이아웃: 인원수 기반 추론
            total = len(members)
            rows = 6 if total > 55 else 5
            capacity = (total + rows - 1) // rows
            grid_layout = {
                "rows": rows,
                "row_capacities": [capacity] * rows,
                "zigzag_pattern": "even",
            }

        # 추천 생성
        recommendations = recommender.recommend(members, member_stats, grid_layout)

        # 품질 메트릭 계산
        metrics = calculate_quality_metrics(recommendations, members, grid_layout)

        # 품질 점수
        quality_score = (
            metrics["placementRate"] * 0.5 +
            metrics["partBalance"] * 0.3 +
            0.8 * 0.2
        )

        # 미배치 대원
        placed_ids = {r["member_id"] for r in recommendations}
        unassigned = [m["id"] for m in members if m["id"] not in placed_ids]

        return RecommendResponse(
            seats=[
                SeatRecommendation(
                    member_id=r["member_id"],
                    member_name=r["member_name"],
                    part=r["part"],
                    row=r["row"],
                    col=r["col"],
                )
                for r in recommendations
            ],
            grid_layout=GridLayout(
                rows=grid_layout["rows"],
                row_capacities=grid_layout["row_capacities"],
                zigzag_pattern=grid_layout["zigzag_pattern"],
            ),
            quality_score=quality_score,
            metrics=metrics,
            metadata={
                "totalMembers": len(members),
                "placedMembers": len(recommendations),
                "statsLoaded": len(member_stats),
            },
            unassigned_members=unassigned,
            source="python-ml",
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
