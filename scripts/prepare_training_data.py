#!/usr/bin/env python3
"""
OCR된 자리배치 데이터를 ML 학습용 포맷으로 변환하는 스크립트
데이터베이스의 멤버 정보와 매핑하여 파트, 키, 경력 등의 정보를 추가
"""

import json
import os
from pathlib import Path
from typing import List, Dict, Any
import asyncio
from supabase import create_client, Client
from dotenv import load_dotenv

# .env.local 파일 로드
env_path = Path(__file__).parent.parent / ".env.local"
load_dotenv(dotenv_path=env_path)

# Supabase 클라이언트 설정
SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")


async def get_members_from_db() -> Dict[str, Dict[str, Any]]:
    """
    데이터베이스에서 모든 멤버 정보를 가져옴
    Returns: {name: {id, part, height, experience, ...}}
    """
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        print("⚠️  Warning: Supabase credentials not found. Using mock data.")
        return {}

    try:
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
        response = supabase.table("members").select("*").execute()

        members_dict = {}
        for member in response.data:
            members_dict[member['name']] = {
                'id': member['id'],
                'part': member['part'],
                'height': member.get('height'),
                'experience': member.get('experience', 0),
                'is_leader': member.get('is_leader', False)
            }

        print(f"✅ 데이터베이스에서 {len(members_dict)}명의 멤버 정보를 가져왔습니다.")
        return members_dict

    except Exception as e:
        print(f"❌ 데이터베이스 연결 실패: {e}")
        return {}


def convert_to_ml_format(
    ocr_data: List[Dict[str, Any]],
    members_db: Dict[str, Dict[str, Any]]
) -> List[Dict[str, Any]]:
    """
    OCR 데이터를 ML 학습용 포맷으로 변환

    ML 모델 학습용 포맷:
    {
      "arrangement_id": "unique_id",
      "date": "2025-11-09",
      "metadata": {...},
      "grid_layout": {...},
      "seats": [
        {
          "member_id": "uuid",
          "member_name": "홍길동",
          "part": "TENOR",
          "height": 175,
          "experience_years": 3,
          "is_part_leader": false,
          "row": 0,
          "col": 0
        },
        ...
      ]
    }
    """
    ml_training_data = []

    for idx, data in enumerate(ocr_data):
        # Grid layout 구성 (6행)
        row_capacities = [row['count'] for row in data['rows']]

        ml_data = {
            "arrangement_id": f"ocr_{data['date']}_{idx}",
            "date": data["date"],
            "metadata": {
                "service": data.get("service", ""),
                "anthem": data.get("anthem", ""),
                "offering_hymn_leader": data.get("offering_hymn_leader", ""),
                "total_members": data["total"],
                "breakdown": data["breakdown"]
            },
            "grid_layout": {
                "rows": 6,
                "row_capacities": row_capacities,
                "zigzag_pattern": "even"  # 가정
            },
            "seats": []
        }

        # 각 행의 멤버들을 좌석으로 변환
        for row_idx, row_data in enumerate(data['rows']):
            for col_idx, member_name in enumerate(row_data['members']):
                # 데이터베이스에서 멤버 정보 찾기
                member_info = members_db.get(member_name)

                if member_info:
                    seat = {
                        "member_id": member_info['id'],
                        "member_name": member_name,
                        "part": member_info['part'],
                        "height": member_info.get('height'),
                        "experience_years": member_info.get('experience', 0),
                        "is_part_leader": member_info.get('is_leader', False),
                        "row": row_idx,  # 0-based
                        "col": col_idx    # 0-based
                    }
                else:
                    # DB에 없는 멤버는 기본값으로
                    print(f"⚠️  멤버 '{member_name}'의 정보를 데이터베이스에서 찾을 수 없습니다.")
                    seat = {
                        "member_id": f"unknown_{member_name}",
                        "member_name": member_name,
                        "part": "UNKNOWN",
                        "height": None,
                        "experience_years": 0,
                        "is_part_leader": False,
                        "row": row_idx,
                        "col": col_idx
                    }

                ml_data["seats"].append(seat)

        ml_training_data.append(ml_data)

    return ml_training_data


async def main():
    """메인 실행 함수"""

    # 1. OCR 데이터 로드
    ocr_file = Path(__file__).parent.parent / "training_data" / "seat_arrangements_ocr.json"
    with open(ocr_file, 'r', encoding='utf-8') as f:
        ocr_data = json.load(f)

    print(f"📂 OCR 데이터 로드: {len(ocr_data)}개 배치")

    # 2. 데이터베이스에서 멤버 정보 가져오기
    members_db = await get_members_from_db()

    # 3. ML 학습용 포맷으로 변환
    ml_data = convert_to_ml_format(ocr_data, members_db)

    # 4. 저장
    output_file = Path(__file__).parent.parent / "training_data" / "ml_training_data.json"
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(ml_data, f, ensure_ascii=False, indent=2)

    print(f"\n✅ ML 학습 데이터 생성 완료: {output_file}")
    print(f"📊 총 {len(ml_data)}개의 배치 패턴")

    # 통계 출력
    total_seats = sum(len(d['seats']) for d in ml_data)
    print(f"📍 총 {total_seats}개의 좌석 데이터")

    for i, data in enumerate(ml_data, 1):
        print(f"\n[{i}] {data['date']}")
        print(f"   총원: {data['metadata']['total_members']}명")
        print(f"   좌석: {len(data['seats'])}개")
        print(f"   행별 구성: {data['grid_layout']['row_capacities']}")


if __name__ == "__main__":
    asyncio.run(main())
