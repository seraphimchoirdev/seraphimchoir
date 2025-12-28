"""
Supabase 클라이언트 서비스
학습 데이터 로드 및 통계 조회
"""
from supabase import create_client, Client
from typing import List, Dict, Optional, Any
from functools import lru_cache

from app.config import settings


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
            response = self.client.table("member_seat_statistics").select("*").gt("total_appearances", 0).execute()
            return response.data or []
        except Exception as e:
            print(f"[Supabase] Error fetching member statistics: {e}")
            return []

    async def get_row_patterns(self) -> List[Dict[str, Any]]:
        """행 분배 패턴 조회"""
        try:
            response = self.client.table("row_distribution_patterns").select("*").execute()
            return response.data or []
        except Exception as e:
            print(f"[Supabase] Error fetching row patterns: {e}")
            return []

    async def get_ml_history(self, limit: int = 100) -> List[Dict[str, Any]]:
        """ML 학습 이력 조회"""
        try:
            response = (
                self.client.table("ml_arrangement_history")
                .select("*")
                .order("created_at", desc=True)
                .limit(limit)
                .execute()
            )
            return response.data or []
        except Exception as e:
            print(f"[Supabase] Error fetching ML history: {e}")
            return []

    async def get_all_seats(self) -> List[Dict[str, Any]]:
        """모든 좌석 배치 데이터 조회 (학습용)"""
        try:
            response = (
                self.client.table("seats")
                .select("*, members(id, name, part, height, experience), arrangements(date)")
                .execute()
            )
            return response.data or []
        except Exception as e:
            print(f"[Supabase] Error fetching seats: {e}")
            return []

    async def health_check(self) -> bool:
        """데이터베이스 연결 확인"""
        try:
            # 간단한 쿼리로 연결 확인
            self.client.table("members").select("id").limit(1).execute()
            return True
        except Exception as e:
            print(f"[Supabase] Health check failed: {e}")
            return False


# 싱글톤 인스턴스
supabase_service = SupabaseService()
