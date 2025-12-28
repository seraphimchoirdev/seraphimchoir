"""
ML 학습 데이터를 UI 맵핑에 맞게 변환

변환 규칙:
1. row: 0→6, 1→5, 2→4, 3→3, 4→2, 5→1 (역순)
2. col: 0→1, 1→2, 2→3... (1부터 시작)
3. row_capacities 배열: reverse
"""

import json
import sys

def transform_ml_data(input_file: str, output_file: str):
    print(f"🔄 ML 데이터 변환 시작: {input_file}")

    # Load original data
    with open(input_file, 'r', encoding='utf-8') as f:
        data = json.load(f)

    print(f"📊 총 {len(data)}개의 arrangement 데이터 로드")

    # Transform each arrangement
    for idx, arrangement in enumerate(data):
        grid_layout = arrangement.get('grid_layout', {})
        seats = arrangement.get('seats', [])

        # Get number of rows
        num_rows = grid_layout.get('rows', 6)

        # 1. Reverse row_capacities
        if 'row_capacities' in grid_layout:
            grid_layout['row_capacities'] = list(reversed(grid_layout['row_capacities']))

        # 2. Transform each seat
        for seat in seats:
            # row: 0→6, 1→5, 2→4, 3→3, 4→2, 5→1
            # Formula: new_row = num_rows - old_row
            old_row = seat.get('row', 0)
            seat['row'] = num_rows - old_row

            # col: 0→1, 1→2, 2→3...
            # Formula: new_col = old_col + 1
            old_col = seat.get('col', 0)
            seat['col'] = old_col + 1

        if (idx + 1) % 10 == 0:
            print(f"  ✅ {idx + 1}/{len(data)} 변환 완료")

    # Save transformed data
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"\n✅ 변환 완료! 결과 저장: {output_file}")
    print(f"📝 총 {len(data)}개 arrangement, {sum(len(a['seats']) for a in data)}개 seat 변환됨")

    # Verification
    print("\n🔍 변환 검증 (첫 번째 arrangement):")
    first = data[0]
    print(f"  Arrangement ID: {first['arrangement_id']}")
    print(f"  Rows: {first['grid_layout']['rows']}")
    print(f"  Row Capacities (UI 순서): {first['grid_layout']['row_capacities']}")
    print(f"\n  첫 5개 좌석:")
    for i, seat in enumerate(first['seats'][:5]):
        print(f"    {i+1}. {seat['member_name']} ({seat['part']}) - Row {seat['row']}, Col {seat['col']}")

    # Verify row/col ranges
    all_rows = set()
    all_cols = set()
    for arrangement in data:
        for seat in arrangement['seats']:
            all_rows.add(seat['row'])
            all_cols.add(seat['col'])

    print(f"\n  Row 범위: {min(all_rows)} ~ {max(all_rows)}")
    print(f"  Col 범위: {min(all_cols)} ~ {max(all_cols)}")

    if min(all_rows) == 1 and min(all_cols) == 1:
        print("\n✅ 검증 통과: Row와 Col이 모두 1부터 시작합니다!")
    else:
        print(f"\n❌ 검증 실패: Row 최소값={min(all_rows)}, Col 최소값={min(all_cols)}")

if __name__ == '__main__':
    input_path = 'training_data/ml_training_data.json'
    output_path = 'training_data/ml_training_data.json'  # 같은 파일에 덮어쓰기

    transform_ml_data(input_path, output_path)
