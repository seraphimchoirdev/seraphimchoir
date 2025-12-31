#!/usr/bin/env python3
"""
ML 학습 데이터의 row 순서를 수정하는 스크립트
- 지휘자에 가까운 쪽(원본 이미지의 아래쪽)부터 row 1로 시작
- 기존 row 순서를 반전시킴
"""
import json
from pathlib import Path


def fix_row_order(filepath: str) -> None:
    """JSON 파일의 row 순서를 반전시킵니다."""
    with open(filepath, 'r', encoding='utf-8') as f:
        data = json.load(f)

    # grid_layout의 row_capacities 반전
    if 'grid_layout' in data and 'row_capacities' in data['grid_layout']:
        data['grid_layout']['row_capacities'] = list(reversed(data['grid_layout']['row_capacities']))

    # seats의 row 번호 반전
    total_rows = data['grid_layout']['rows']
    for seat in data.get('seats', []):
        old_row = seat['row']
        seat['row'] = total_rows - old_row + 1

    # seats를 새로운 row, col 순서로 정렬
    data['seats'] = sorted(data['seats'], key=lambda s: (s['row'], s['col']))

    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"Fixed row order: {Path(filepath).name}")


def main():
    ml_output_dir = Path(__file__).parent.parent / 'ml_output'

    for json_file in ml_output_dir.glob('ml_*.json'):
        fix_row_order(str(json_file))

    print("\nRow order fixed for all files!")


if __name__ == '__main__':
    main()
