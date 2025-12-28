"""
환경 설정 관리
Pydantic Settings를 사용하여 환경 변수 로드
"""
from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import List


class Settings(BaseSettings):
    """애플리케이션 설정"""

    # App
    APP_NAME: str = "Choir Seat ML Service"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False

    # Supabase
    SUPABASE_URL: str
    SUPABASE_ANON_KEY: str = ""  # 공개 키 (선택적)
    SUPABASE_SERVICE_ROLE_KEY: str

    # CORS
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

    # Model
    MODEL_PATH: str = "models/seat_recommender.joblib"
    MIN_TRAINING_SAMPLES: int = 10  # 개발용: 낮은 값, 프로덕션에서는 50-100 권장

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True
        extra = "ignore"  # 정의되지 않은 환경 변수 무시


@lru_cache()
def get_settings() -> Settings:
    """설정 싱글톤 반환"""
    return Settings()


settings = get_settings()
