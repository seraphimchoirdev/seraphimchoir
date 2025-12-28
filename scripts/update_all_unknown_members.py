#!/usr/bin/env python3
"""
ML training data에서 UNKNOWN 또는 unknown_ member_id를 가진 모든 멤버를
Supabase에서 조회하여 실제 정보로 업데이트
"""

import json
import os
from pathlib import Path
from supabase import create_client, Client
from dotenv import load_dotenv
from difflib import SequenceMatcher

# .env.local 파일 로드
env_path = Path(__file__).parent.parent / ".env.local"
load_dotenv(dotenv_path=env_path)

# Supabase 클라이언트 설정
SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")


def similarity(a: str, b: str) -> float:
    """두 문자열의 유사도 계산 (0~1)"""
    return SequenceMatcher(None, a, b).ratio()


def get_member_info_from_db():
    """데이터베이스에서 모든 멤버 정보 조회"""

    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        print("❌ Supabase 인증 정보를 찾을 수 없습니다.")
        return {}

    try:
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
        response = supabase.table("members").select("id, name, part").execute()

        # 이름 -> 멤버 정보 매핑
        member_info = {}
        for member in response.data:
            member_info[member['name']] = {
                'id': member['id'],
                'part': member['part']
            }

        print(f"✅ 데이터베이스에서 {len(member_info)}명의 정보를 가져왔습니다.\n")
        return member_info

    except Exception as e:
        print(f"❌ 데이터베이스 조회 실패: {e}")
        return {}


def find_best_match(name: str, all_members: dict) -> tuple:
    """
    주어진 이름과 가장 유사한 멤버를 찾음
    Returns: (best_match_name, similarity_score, member_info)
    """
    best_match = None
    best_score = 0
    best_info = None

    for db_name, info in all_members.items():
        score = similarity(name, db_name)

        # 성이 같으면 보너스 점수
        if len(name) > 0 and len(db_name) > 0 and name[0] == db_name[0]:
            score += 0.2

        if score > best_score:
            best_score = score
            best_match = db_name
            best_info = info

    return (best_match, best_score, best_info)


def update_ml_training_data():
    """ML training data의 UNKNOWN 정보를 실제 정보로 업데이트"""

    # 1. ML training data 로드
    ml_file = Path(__file__).parent.parent / "training_data" / "ml_training_data.json"

    with open(ml_file, 'r', encoding='utf-8') as f:
        ml_data = json.load(f)

    print(f"📂 ML 학습 데이터 로드: {len(ml_data)}개 배치\n")

    # 2. 데이터베이스에서 멤버 정보 조회
    member_info = get_member_info_from_db()

    if not member_info:
        print("❌ 멤버 정보를 가져올 수 없습니다.")
        return

    # 3. UNKNOWN 정보 업데이트
    updated_count = 0
    not_found = {}  # {name: count}
    fuzzy_matched = {}  # {original_name: (matched_name, similarity)}

    for arrangement in ml_data:
        for seat in arrangement['seats']:
            member_name = seat['member_name']
            needs_update = (
                seat.get('part') == 'UNKNOWN' or
                'unknown_' in str(seat.get('member_id', ''))
            )

            if needs_update:
                # 정확한 매칭 시도
                if member_name in member_info:
                    info = member_info[member_name]
                    seat['member_id'] = info['id']
                    seat['part'] = info['part']
                    updated_count += 1
                    print(f"✅ {member_name}: {info['part']}")
                else:
                    # 유사한 이름 찾기
                    best_match, score, best_info = find_best_match(member_name, member_info)

                    if score > 0.7:  # 70% 이상 유사도
                        fuzzy_matched[member_name] = (best_match, score)
                        print(f"🔍 '{member_name}' → '{best_match}' (유사도: {score:.2f})")
                    else:
                        not_found[member_name] = not_found.get(member_name, 0) + 1

    # 4. 유사 매칭 확인 및 적용
    if fuzzy_matched:
        print(f"\n{'='*60}")
        print("🔍 유사한 이름이 발견되었습니다:")
        print("='*60")

        for original, (matched, score) in fuzzy_matched.items():
            matched_info = member_info[matched]
            print(f"\n'{original}' → '{matched}' (유사도: {score:.2f}, 파트: {matched_info['part']})")

            # 자동 적용 (유사도 85% 이상)
            if score >= 0.85:
                for arrangement in ml_data:
                    for seat in arrangement['seats']:
                        if seat['member_name'] == original:
                            seat['member_id'] = matched_info['id']
                            seat['part'] = matched_info['part']
                            # 이름도 정확한 이름으로 업데이트
                            seat['member_name'] = matched
                            updated_count += 1
                print(f"  ✅ 자동 적용됨")

    # 5. 업데이트된 데이터 저장
    if updated_count > 0:
        with open(ml_file, 'w', encoding='utf-8') as f:
            json.dump(ml_data, f, ensure_ascii=False, indent=2)

        print(f"\n{'='*60}")
        print(f"✅ ML 학습 데이터 업데이트 완료: {ml_file}")
        print(f"📊 총 {updated_count}개의 좌석 정보가 업데이트되었습니다.")
    else:
        print("\n⚠️  업데이트할 데이터가 없습니다.")

    # 6. 여전히 찾지 못한 멤버 출력
    if not_found:
        print(f"\n⚠️  데이터베이스에서 찾을 수 없는 멤버 ({len(not_found)}명):")
        for name, count in sorted(not_found.items()):
            print(f"   - {name} ({count}회 출현)")

        # 유사한 이름 제안
        print("\n💡 유사한 이름 제안:")
        for name in not_found.keys():
            best_match, score, _ = find_best_match(name, member_info)
            if score > 0.5:
                print(f"   '{name}' → '{best_match}' (유사도: {score:.2f})")


if __name__ == "__main__":
    update_ml_training_data()
