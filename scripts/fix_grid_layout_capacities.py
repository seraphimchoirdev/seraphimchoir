"""
grid_layout의 row_capacities를 실제 seats 데이터에서 계산하여 수정

변환 후 row는 1부터 시작하므로, row_capacities도 1행부터 시작
"""

import json

def fix_grid_layout_capacities(input_file: str, output_file: str):
    print(f"🔧 grid_layout.row_capacities 수정 시작: {input_file}")

    with open(input_file, 'r', encoding='utf-8') as f:
        data = json.load(f)

    print(f"📊 총 {len(data)}개의 arrangement 처리")

    for idx, arrangement in enumerate(data):
        seats = arrangement.get('seats', [])
        grid_layout = arrangement.get('grid_layout', {})

        if not seats:
            continue

        # 실제 사용된 행 찾기
        rows_used = set(seat['row'] for seat in seats)
        min_row = min(rows_used)
        max_row = max(rows_used)

        # 행별 인원 계산
        row_counts = {}
        for seat in seats:
            row = seat['row']
            row_counts[row] = row_counts.get(row, 0) + 1

        # row_capacities 생성 (1행부터 max_row까지)
        new_capacities = []
        for row in range(1, max_row + 1):
            new_capacities.append(row_counts.get(row, 0))

        # grid_layout 업데이트
        old_capacities = grid_layout.get('row_capacities', [])
        grid_layout['rows'] = max_row
        grid_layout['row_capacities'] = new_capacities

        if (idx + 1) % 10 == 0:
            print(f"  ✅ {idx + 1}/{len(data)} 수정 완료")

    # 저장
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"\n✅ 수정 완료! 결과 저장: {output_file}")

    # 검증
    print("\n🔍 검증 (첫 5개 arrangement):")
    for i, arrangement in enumerate(data[:5]):
        arr_id = arrangement['arrangement_id']
        total = arrangement['metadata']['total_members']
        rows = arrangement['grid_layout']['rows']
        capacities = arrangement['grid_layout']['row_capacities']
        capacity_sum = sum(capacities)

        status = "✅" if capacity_sum == total else "❌"
        print(f"  {i+1}. {arr_id}: {total}명, {rows}행, {capacities} = {capacity_sum}석 {status}")

if __name__ == '__main__':
    input_path = 'training_data/ml_training_data.json'
    output_path = 'training_data/ml_training_data.json'

    fix_grid_layout_capacities(input_path, output_path)
