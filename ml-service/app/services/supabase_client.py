"""
Supabase 클라이언트 서비스
학습 데이터 로드 및 통계 조회

보안 참고:
- Supabase Python SDK는 parameterized queries를 사용하여 SQL Injection 방지
- 입력값 검증을 추가하여 DoS 및 잘못된 요청 방지
"""
from supabase import create_client, Client
from typing import List, Dict, Optional, Any
from functools import lru_cache
import logging

from app.config import settings

# 보안: 에러 로깅 설정 (프로덕션에서 상세 에러 숨김)
logger = logging.getLogger(__name__)

# 입력값 검증 상수
MAX_LIMIT = 1000  # 최대 조회 제한
DEFAULT_LIMIT = 100


@lru_cache()
def get_supabase_client() -> Client:
    """Supabase 클라이언트 싱글톤"""
    return create_client(
        settings.SUPABASE_URL,
        settings.SUPABASE_SERVICE_ROLE_KEY
    )


class SupabaseService:
    """Supabase 데이터 서비스"""

    def __init__(self):
        self.client = get_supabase_client()

    async def get_member_statistics(self) -> List[Dict[str, Any]]:
        """대원별 좌석 통계 조회"""
        try:
            response = (
                self.client.table("member_seat_statistics")
                .select("*")
                .gt("total_appearances", 0)
                .limit(MAX_LIMIT)
                .execute()
            )
            return response.data or []
        except Exception as e:
            logger.error(f"[Supabase] Error fetching member statistics: {type(e).__name__}")
            return []

    async def get_row_patterns(self) -> List[Dict[str, Any]]:
        """행 분배 패턴 조회"""
        try:
            response = (
                self.client.table("row_distribution_patterns")
                .select("*")
                .limit(MAX_LIMIT)
                .execute()
            )
            return response.data or []
        except Exception as e:
            logger.error(f"[Supabase] Error fetching row patterns: {type(e).__name__}")
            return []

    async def get_ml_history(self, limit: int = DEFAULT_LIMIT) -> List[Dict[str, Any]]:
        """
        ML 학습 이력 조회

        Args:
            limit: 조회할 최대 레코드 수 (1-1000, 기본값 100)
        """
        # 입력값 검증: limit 범위 제한
        validated_limit = max(1, min(limit, MAX_LIMIT))
        if limit != validated_limit:
            logger.warning(f"[Supabase] limit adjusted: {limit} -> {validated_limit}")

        try:
            response = (
                self.client.table("ml_arrangement_history")
                .select("*")
                .order("created_at", desc=True)
                .limit(validated_limit)
                .execute()
            )
            return response.data or []
        except Exception as e:
            logger.error(f"[Supabase] Error fetching ML history: {type(e).__name__}")
            return []

    async def get_all_seats(self, limit: int = MAX_LIMIT) -> List[Dict[str, Any]]:
        """
        모든 좌석 배치 데이터 조회 (학습용)

        Args:
            limit: 조회할 최대 레코드 수 (1-1000, 기본값 1000)
        """
        # 입력값 검증: limit 범위 제한 (DoS 방지)
        validated_limit = max(1, min(limit, MAX_LIMIT))

        try:
            response = (
                self.client.table("seats")
                .select("*, members(id, name, part, height, experience), arrangements(date)")
                .limit(validated_limit)
                .execute()
            )
            return response.data or []
        except Exception as e:
            logger.error(f"[Supabase] Error fetching seats: {type(e).__name__}")
            return []

    async def health_check(self) -> bool:
        """데이터베이스 연결 확인"""
        try:
            # 간단한 쿼리로 연결 확인
            self.client.table("members").select("id").limit(1).execute()
            return True
        except Exception as e:
            logger.warning(f"[Supabase] Health check failed: {type(e).__name__}")
            return False


# 싱글톤 인스턴스
supabase_service = SupabaseService()
