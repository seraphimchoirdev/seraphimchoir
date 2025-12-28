#!/usr/bin/env python3
"""
나머지 자리배치 이미지들을 일괄 OCR 처리하는 스크립트
Claude Vision API를 사용하여 이미지에서 텍스트 추출
"""

import json
import os
from pathlib import Path
from typing import List, Dict, Any

# 이미 처리된 날짜 확인
def get_processed_dates() -> set:
    """이미 OCR 처리된 날짜들을 반환"""
    ocr_file = Path(__file__).parent.parent / "training_data" / "seat_arrangements_ocr.json"

    if not ocr_file.exists():
        return set()

    with open(ocr_file, 'r', encoding='utf-8') as f:
        ocr_data = json.load(f)

    return {data['date'] for data in ocr_data}


def get_unprocessed_images(folder: str = "seatimg") -> List[Path]:
    """아직 처리되지 않은 이미지 파일들을 반환"""
    base_path = Path(__file__).parent.parent / folder

    # 모든 이미지 파일
    all_images = sorted(base_path.glob("*.jpeg"))

    processed_dates = get_processed_dates()

    print(f"📂 총 이미지: {len(all_images)}개")
    print(f"✅ 이미 처리됨: {len(processed_dates)}개")
    print(f"⏳ 처리 대기: {len(all_images)}개 (모두 처리)")

    return all_images


def main():
    """메인 실행 함수"""

    # 처리되지 않은 이미지 찾기
    unprocessed = get_unprocessed_images()

    if not unprocessed:
        print("✅ 모든 이미지가 이미 처리되었습니다.")
        return

    print(f"\n📋 처리할 이미지 목록:")
    for i, img in enumerate(unprocessed[:5], 1):
        print(f"  {i}. {img.name}")
    if len(unprocessed) > 5:
        print(f"  ... 외 {len(unprocessed) - 5}개")

    print(f"\n⚠️  주의: Claude Vision API를 사용하여 OCR 처리를 진행합니다.")
    print(f"예상 소요 시간: 약 {len(unprocessed) * 2}분")
    print(f"\n이 스크립트는 자동으로 실행되지 않습니다.")
    print(f"Claude Code의 Read tool을 사용하여 각 이미지를 읽고 OCR 처리하세요.")


if __name__ == "__main__":
    main()
