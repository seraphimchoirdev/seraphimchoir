"""
헬스체크 라우터
서비스 상태 확인 API
"""
from fastapi import APIRouter

from app.config import settings
from app.schemas.request_response import HealthResponse
from app.models.seat_recommender import recommender
from app.services.supabase_client import supabase_service

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
async def health_check():
    """서비스 헬스체크"""
    db_connected = await supabase_service.health_check()
    model_loaded = recommender.is_trained

    # 상태 결정
    if db_connected and model_loaded:
        status = "healthy"
    elif db_connected or model_loaded:
        status = "degraded"
    else:
        status = "unhealthy"

    return HealthResponse(
        status=status,
        version=settings.APP_VERSION,
        model_loaded=model_loaded,
        database_connected=db_connected,
    )
