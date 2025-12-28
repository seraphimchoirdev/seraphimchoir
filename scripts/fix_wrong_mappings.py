#!/usr/bin/env python3
"""
잘못 매칭된 멤버 이름을 올바른 이름으로 수정하는 스크립트
"""

import json
import os
from pathlib import Path
from supabase import create_client, Client
from dotenv import load_dotenv

# .env.local 파일 로드
env_path = Path(__file__).parent.parent / ".env.local"
load_dotenv(dotenv_path=env_path)

SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")


def fix_wrong_mappings():
    """잘못 매칭된 이름을 올바른 이름으로 수정"""

    # 잘못 매칭된 것들의 올바른 매핑
    corrections = {
        '김지영': [
            ('김운영', '김은영'),  # 김운영 -> 김은영
            ('김영정', '김영정'),  # 김영정 -> 김영정
        ],
        '김문희': [
            ('김운희', '김윤희'),  # 김운희 -> 김윤희
            ('김지희', '김진희'),  # 김지희 -> 김진희
        ],
        '이상미': [
            ('이상봉', '이강봉'),  # 이상봉 -> 이강봉 (이미 이강봉으로 매칭됨)
        ],
        '김은혜': [
            ('김혜경', '최해경'),  # 김혜경 -> 최해경
        ]
    }

    # Supabase에서 올바른 멤버 정보 가져오기
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    response = supabase.table("members").select("id, name, part").execute()

    member_info = {member['name']: {'id': member['id'], 'part': member['part']}
                   for member in response.data}

    # ML 학습 데이터 로드
    ml_file = Path(__file__).parent.parent / "training_data" / "ml_training_data.json"
    with open(ml_file, 'r', encoding='utf-8') as f:
        ml_data = json.load(f)

    print(f"📂 ML 학습 데이터 로드: {len(ml_data)}개 배치\n")

    # 수정 통계
    fix_stats = {}

    # 각 좌석 데이터 검사 및 수정
    for arrangement in ml_data:
        for seat in arrangement['seats']:
            current_name = seat['member_name']

            # 현재 이름이 잘못 매칭된 대상인지 확인
            for wrong_target, corrections_list in corrections.items():
                if current_name == wrong_target:
                    # 이 좌석이 원래 어떤 이름이었는지 확인 필요
                    # OCR 데이터와 비교해야 하지만, 여기서는 직접 수정
                    continue

            # 직접 이름 수정 (OCR 원본 이름 기준)
            # 김지영이지만 원래 김운영이나 김영정이었던 경우
            # 이건 OCR 데이터와 비교가 필요함

    # 다른 접근: OCR 데이터를 다시 읽어서 비교
    ocr_file = Path(__file__).parent.parent / "training_data" / "seat_arrangements_ocr.json"
    with open(ocr_file, 'r', encoding='utf-8') as f:
        ocr_data = json.load(f)

    # OCR 데이터와 ML 데이터를 매칭하여 원본 이름 복구
    for i, (ml_arrangement, ocr_arrangement) in enumerate(zip(ml_data, ocr_data)):
        # OCR 데이터에서 행별 멤버 리스트 생성
        ocr_members = []
        for row in ocr_arrangement['rows']:
            ocr_members.extend(row['members'])

        # ML 데이터의 각 좌석과 OCR 원본 비교
        for j, seat in enumerate(ml_arrangement['seats']):
            if j < len(ocr_members):
                ocr_name = ocr_members[j]
                current_name = seat['member_name']

                # 원본 이름과 현재 이름이 다르면 수정 대상 확인
                if ocr_name != current_name:
                    # 수정이 필요한 경우인지 확인
                    should_fix = False
                    correct_name = None

                    if ocr_name == '김운영' and current_name == '김지영':
                        correct_name = '김은영'
                        should_fix = True
                    elif ocr_name == '김영정' and current_name == '김지영':
                        correct_name = '김영정'
                        should_fix = True
                    elif ocr_name == '김운희' and current_name == '김문희':
                        correct_name = '김윤희'
                        should_fix = True
                    elif ocr_name == '김지희' and current_name == '김문희':
                        correct_name = '김진희'
                        should_fix = True
                    elif ocr_name == '이상봉' and current_name in ['이상미', '이강봉']:
                        correct_name = '이강봉'
                        should_fix = True
                    elif ocr_name == '김혜경' and current_name == '김은혜':
                        correct_name = '최해경'
                        should_fix = True

                    if should_fix and correct_name and correct_name in member_info:
                        # 수정
                        old_name = seat['member_name']
                        seat['member_name'] = correct_name
                        seat['member_id'] = member_info[correct_name]['id']
                        seat['part'] = member_info[correct_name]['part']

                        if ocr_name not in fix_stats:
                            fix_stats[ocr_name] = {'old': current_name, 'new': correct_name, 'count': 0}
                        fix_stats[ocr_name]['count'] += 1

                        print(f"✅ {ocr_name} → {current_name} ⇒ {correct_name} ({member_info[correct_name]['part']})")

    # 저장
    if fix_stats:
        with open(ml_file, 'w', encoding='utf-8') as f:
            json.dump(ml_data, f, ensure_ascii=False, indent=2)

        print(f"\n{'='*60}")
        print(f"✅ ML 학습 데이터 수정 완료")
        print(f"\n📊 수정 통계:")
        for ocr_name, stats in sorted(fix_stats.items()):
            print(f"  {ocr_name}: {stats['old']} → {stats['new']} ({stats['count']}회)")

        total_fixes = sum(s['count'] for s in fix_stats.values())
        print(f"\n총 {total_fixes}개 좌석 수정")
    else:
        print("\n⚠️  수정할 데이터가 없습니다.")


if __name__ == "__main__":
    fix_wrong_mappings()
