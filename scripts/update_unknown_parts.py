#!/usr/bin/env python3
"""
ML training data에서 UNKNOWN 파트를 가진 멤버들을
Supabase에서 조회하여 실제 파트 정보로 업데이트
"""

import json
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


def get_member_parts_from_db():
    """데이터베이스에서 모든 멤버의 파트 정보 조회"""

    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        print("❌ Supabase 인증 정보를 찾을 수 없습니다.")
        return {}

    try:
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
        response = supabase.table("members").select("name, part").execute()

        # 이름 -> 파트 매핑
        member_parts = {member['name']: member['part'] for member in response.data}

        print(f"✅ 데이터베이스에서 {len(member_parts)}명의 파트 정보를 가져왔습니다.\n")
        return member_parts

    except Exception as e:
        print(f"❌ 데이터베이스 조회 실패: {e}")
        return {}


def update_ml_training_data():
    """ML training data의 UNKNOWN 파트를 실제 파트로 업데이트"""

    # 1. ML training data 로드
    ml_file = Path(__file__).parent.parent / "training_data" / "ml_training_data.json"

    with open(ml_file, 'r', encoding='utf-8') as f:
        ml_data = json.load(f)

    print(f"📂 ML 학습 데이터 로드: {len(ml_data)}개 배치\n")

    # 2. 데이터베이스에서 파트 정보 조회
    member_parts = get_member_parts_from_db()

    if not member_parts:
        print("❌ 멤버 파트 정보를 가져올 수 없습니다.")
        return

    # 3. UNKNOWN 파트 업데이트
    updated_count = 0
    not_found = set()

    for arrangement in ml_data:
        for seat in arrangement['seats']:
            if seat.get('part') == 'UNKNOWN':
                member_name = seat['member_name']

                # 데이터베이스에서 파트 찾기
                if member_name in member_parts:
                    old_part = seat['part']
                    new_part = member_parts[member_name]
                    seat['part'] = new_part
                    updated_count += 1
                    print(f"✅ {member_name}: {old_part} → {new_part}")
                else:
                    not_found.add(member_name)

    # 4. 업데이트된 데이터 저장
    if updated_count > 0:
        with open(ml_file, 'w', encoding='utf-8') as f:
            json.dump(ml_data, f, ensure_ascii=False, indent=2)

        print(f"\n{'='*60}")
        print(f"✅ ML 학습 데이터 업데이트 완료: {ml_file}")
        print(f"📊 총 {updated_count}개의 좌석 파트 정보가 업데이트되었습니다.")
    else:
        print("\n⚠️  업데이트할 데이터가 없습니다.")

    # 5. 여전히 찾지 못한 멤버 출력
    if not_found:
        print(f"\n⚠️  데이터베이스에서 찾을 수 없는 멤버 ({len(not_found)}명):")
        for name in sorted(not_found):
            print(f"   - {name}")


if __name__ == "__main__":
    update_ml_training_data()
