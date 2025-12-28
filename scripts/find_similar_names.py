#!/usr/bin/env python3
"""
누락된 멤버와 유사한 이름을 Supabase에서 찾기
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

MISSING_NAMES = ["김윤희", "이해연"]


def find_similar_names():
    """유사한 이름 찾기"""

    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        print("❌ Supabase 인증 정보를 찾을 수 없습니다.")
        return

    try:
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
        response = supabase.table("members").select("name, part").execute()

        all_members = {member['name']: member['part'] for member in response.data}

        print(f"📊 데이터베이스 총 멤버: {len(all_members)}명\n")

        for missing_name in MISSING_NAMES:
            print(f"\n🔍 '{missing_name}' 검색:")
            print("="*60)

            # 정확히 일치하는 이름 찾기
            if missing_name in all_members:
                print(f"✅ 정확히 일치: {missing_name} ({all_members[missing_name]})")
                continue

            # 유사한 이름 찾기
            similar = []

            for db_name, part in all_members.items():
                # 성이 같은 경우
                if missing_name[0] == db_name[0]:
                    # 이름 부분 유사도 체크
                    if missing_name[1:] in db_name or db_name[1:] in missing_name[1:]:
                        similar.append((db_name, part, "성+이름 유사"))
                    elif len(missing_name) == len(db_name):
                        # 글자 수가 같고 일부 글자가 일치
                        match_count = sum(1 for i in range(len(missing_name)) if i < len(db_name) and missing_name[i] == db_name[i])
                        if match_count >= 2:
                            similar.append((db_name, part, f"{match_count}글자 일치"))

            if similar:
                print(f"📋 유사한 이름 ({len(similar)}개):")
                for name, part, reason in similar:
                    print(f"  → {name} ({part}) - {reason}")
            else:
                print("❌ 유사한 이름을 찾을 수 없습니다.")

            # 모든 '김'씨 또는 '이'씨 출력
            print(f"\n📋 데이터베이스의 모든 '{missing_name[0]}'씨:")
            same_surname = [f"{name} ({part})" for name, part in all_members.items() if name[0] == missing_name[0]]
            for name_info in sorted(same_surname)[:20]:  # 최대 20명만
                print(f"  - {name_info}")
            if len(same_surname) > 20:
                print(f"  ... 외 {len(same_surname) - 20}명")

    except Exception as e:
        print(f"❌ 오류 발생: {e}")


if __name__ == "__main__":
    find_similar_names()
