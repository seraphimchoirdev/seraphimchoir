"""
Choir Seat ML Service - FastAPI Application
AI 기반 찬양대 자리배치 추천 서비스

Features:
- RandomForest 기반 좌석 추천
- Supabase 연동으로 학습 데이터 로드
- 실시간 추천 및 모델 재학습 API
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.config import settings
from app.routers import recommend, train, health
from app.models.seat_recommender import recommender


@asynccontextmanager
async def lifespan(app: FastAPI):
    """애플리케이션 라이프사이클 관리"""
    # 시작 시: 모델 로드 시도
    print(f"[ML Service] Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    try:
        recommender.load_model()
        print("[ML Service] Model loaded successfully")
    except Exception as e:
        print(f"[ML Service] No pre-trained model found: {e}")
        print("[ML Service] Call /api/v1/train to train a new model")

    yield

    # 종료 시: 정리 작업
    print("[ML Service] Shutting down...")


app = FastAPI(
    title=settings.APP_NAME,
    description="AI 기반 찬양대 자리배치 추천 서비스",
    version=settings.APP_VERSION,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 라우터 등록
app.include_router(health.router, prefix="/api/v1", tags=["Health"])
app.include_router(recommend.router, prefix="/api/v1", tags=["Recommend"])
app.include_router(train.router, prefix="/api/v1", tags=["Train"])


@app.get("/")
async def root():
    """루트 엔드포인트"""
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "docs": "/docs",
        "health": "/api/v1/health",
    }
