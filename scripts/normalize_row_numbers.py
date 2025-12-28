"""
모든 arrangement의 row 번호를 1부터 시작하도록 정규화

일부 arrangement는 row 2-6을 사용하는데, 이를 1-5로 변경
"""

import json

def normalize_row_numbers(input_file: str, output_file: str):
    print(f"🔧 row 번호 정규화 시작: {input_file}")

    with open(input_file, 'r', encoding='utf-8') as f:
        data = json.load(f)

    print(f"📊 총 {len(data)}개의 arrangement 처리")

    normalized_count = 0
    for idx, arrangement in enumerate(data):
        seats = arrangement.get('seats', [])

        if not seats:
            continue

        # 최소 row 찾기
        min_row = min(seat['row'] for seat in seats)

        if min_row > 1:
            # row를 1부터 시작하도록 shift
            shift = min_row - 1
            print(f"  ⚠️  {arrangement['arrangement_id']}: row {min_row}부터 시작 → 1부터 시작으로 shift (-{shift})")

            for seat in seats:
                seat['row'] = seat['row'] - shift

            # grid_layout도 업데이트 필요
            grid_layout = arrangement.get('grid_layout', {})
            rows_used = set(seat['row'] for seat in seats)
            max_row = max(rows_used)

            # row_capacities 재계산
            row_counts = {}
            for seat in seats:
                row = seat['row']
                row_counts[row] = row_counts.get(row, 0) + 1

            new_capacities = [row_counts.get(row, 0) for row in range(1, max_row + 1)]
            grid_layout['rows'] = max_row
            grid_layout['row_capacities'] = new_capacities

            normalized_count += 1

    # 저장
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"\n✅ 정규화 완료! {normalized_count}개 arrangement의 row 번호 정규화됨")
    print(f"📝 결과 저장: {output_file}")

    # 검증
    print("\n🔍 검증 (모든 arrangement의 min_row 확인):")
    for arr in data:
        seats = arr.get('seats', [])
        if not seats:
            continue

        min_row = min(seat['row'] for seat in seats)
        max_row = max(seat['row'] for seat in seats)

        if min_row != 1:
            print(f"  ❌ {arr['arrangement_id']}: min_row={min_row} (should be 1)")
        elif max_row > 6:
            print(f"  ⚠️  {arr['arrangement_id']}: max_row={max_row} (> 6)")

    print("\n✅ 모든 arrangement가 row 1부터 시작합니다!")

if __name__ == '__main__':
    input_path = 'training_data/ml_training_data.json'
    output_path = 'training_data/ml_training_data.json'

    normalize_row_numbers(input_path, output_path)
