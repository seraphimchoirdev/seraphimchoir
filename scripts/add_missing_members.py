#!/usr/bin/env python3
"""
누락된 멤버를 Supabase에 추가하는 스크립트
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

# 누락된 멤버 목록 (2024-12-01 업데이트)
MISSING_MEMBERS = [
    {"name": "김성목", "part": "TENOR"},
    {"name": "김운영", "part": "SOPRANO"},
    {"name": "김운희", "part": "SOPRANO"},
    {"name": "김윤희", "part": "SOPRANO"},
    {"name": "김재관", "part": "TENOR"},
    {"name": "김지희", "part": "SOPRANO"},
    {"name": "박성희", "part": "SOPRANO"},
    {"name": "서현숙", "part": "SOPRANO"},
    {"name": "오홍철", "part": "TENOR"},
    {"name": "이종숙", "part": "SOPRANO"},
    {"name": "이해연", "part": "ALTO"},
    {"name": "임산섭", "part": "BASS"},
    {"name": "최광영", "part": "BASS"},
    {"name": "최선규", "part": "BASS"},
    {"name": "한민영", "part": "BASS"}
]


def add_missing_members():
    """누락된 멤버를 데이터베이스에 추가"""

    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        print("❌ Supabase 인증 정보를 찾을 수 없습니다.")
        return

    try:
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

        # 기존 멤버 확인
        existing_response = supabase.table("members").select("name").execute()
        existing_names = {member['name'] for member in existing_response.data}

        print(f"📋 기존 멤버: {len(existing_names)}명")
        print(f"➕ 추가할 멤버: {len(MISSING_MEMBERS)}명\n")

        added_count = 0
        skipped_count = 0

        for member in MISSING_MEMBERS:
            if member['name'] in existing_names:
                print(f"⏭️  {member['name']} - 이미 존재함")
                skipped_count += 1
                continue

            # 멤버 추가 (기본 정보만)
            data = {
                "name": member['name'],
                "part": member['part'],
                "height": None,
                "experience_years": 0,
                "is_part_leader": False,
                "notes": "OCR 데이터에서 자동 추가됨"
            }

            try:
                supabase.table("members").insert(data).execute()
                print(f"✅ {member['name']} ({member['part']}) - 추가 완료")
                added_count += 1
            except Exception as e:
                print(f"❌ {member['name']} - 추가 실패: {e}")

        print(f"\n{'='*50}")
        print(f"✅ 추가 완료: {added_count}명")
        print(f"⏭️  건너뜀: {skipped_count}명")
        print(f"📊 총 멤버: {len(existing_names) + added_count}명")

    except Exception as e:
        print(f"❌ 오류 발생: {e}")


if __name__ == "__main__":
    add_missing_members()
