#!/usr/bin/env python3
"""
Supabase에서 멤버 목록 조회 및 누락된 멤버 확인
"""

import os
from pathlib import Path
from supabase import create_client, Client
from dotenv import load_dotenv

# .env.local 파일 로드
env_path = Path(__file__).parent.parent / ".env.local"
load_dotenv(dotenv_path=env_path)

# Supabase 클라이언트 설정
SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

# 누락된 멤버 목록
MISSING_MEMBERS = [
    "김성목", "김운영", "김운희", "김윤희", "김재관", "김지희",
    "박성희", "서현숙", "오홍철", "이종숙", "이해연", "임산섭",
    "최광영", "최선규", "한민영"
]


def check_members():
    """데이터베이스의 멤버 확인"""

    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        print("❌ Supabase 인증 정보를 찾을 수 없습니다.")
        return

    try:
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

        # 모든 멤버 조회
        response = supabase.table("members").select("name, part").execute()
        all_members = response.data

        print(f"📊 데이터베이스 총 멤버: {len(all_members)}명\n")

        # 멤버 이름 집합
        existing_names = {member['name'] for member in all_members}

        # 누락된 멤버 확인
        print("❌ 누락된 멤버 (OCR 데이터에는 있지만 DB에 없음):")
        print("="*60)

        still_missing = []
        for name in MISSING_MEMBERS:
            if name not in existing_names:
                still_missing.append(name)
                print(f"  - {name}")

        if not still_missing:
            print("  (없음)")

        print(f"\n총 {len(still_missing)}명이 누락되었습니다.")

        # 유사한 이름 찾기 (오타 가능성)
        print("\n\n🔍 유사한 이름 검색:")
        print("="*60)

        for missing in still_missing:
            similar = [m for m in existing_names if missing[:2] in m or m[:2] in missing]
            if similar:
                print(f"{missing}:")
                for sim in similar:
                    print(f"  → {sim}")

    except Exception as e:
        print(f"❌ 오류 발생: {e}")


if __name__ == "__main__":
    check_members()
