"""
ML 학습 데이터에서 파트별 좌우(left/right) 배치 패턴 분석
"""

import json
from collections import defaultdict

def analyze_left_right_patterns():
    with open('training_data/ml_training_data.json', 'r', encoding='utf-8') as f:
        ml_data = json.load(f)

    print("🔍 파트별 좌우 배치 패턴 분석\n")
    print(f"총 {len(ml_data)}개 배치 패턴 분석\n")
    print("=" * 100)

    # 각 arrangement에서 파트별 좌우 분포 분석
    for arr in ml_data[:10]:  # 첫 10개만
        arr_id = arr['arrangement_id']
        total = arr['metadata']['total_members']

        print(f"\n{arr_id} ({total}명)")
        print("-" * 100)

        # 각 행별로 분석
        for row in range(1, arr['grid_layout']['rows'] + 1):
            row_seats = [s for s in arr['seats'] if s['row'] == row]
            if not row_seats:
                continue

            row_seats.sort(key=lambda s: s['col'])

            # 중앙점 계산
            max_col = max(s['col'] for s in row_seats)
            mid_point = max_col / 2

            # 좌우로 분류
            left_parts = defaultdict(int)
            right_parts = defaultdict(int)

            for seat in row_seats:
                if seat['col'] <= mid_point:
                    left_parts[seat['part']] += 1
                else:
                    right_parts[seat['part']] += 1

            # 출력
            left_str = ', '.join([f"{k[0]}:{v}" for k, v in sorted(left_parts.items())])
            right_str = ', '.join([f"{k[0]}:{v}" for k, v in sorted(right_parts.items())])

            print(f"  {row}행: 왼쪽[{left_str}] | 오른쪽[{right_str}]")

    print("\n\n" + "=" * 100)
    print("📊 전체 패턴 요약")
    print("=" * 100)

    # 전체 arrangement의 좌우 분포 집계
    total_left = defaultdict(int)
    total_right = defaultdict(int)

    for arr in ml_data:
        for seat in arr['seats']:
            # 각 행의 최대 col 찾기
            row_seats = [s for s in arr['seats'] if s['row'] == seat['row']]
            max_col = max(s['col'] for s in row_seats)
            mid_point = max_col / 2

            if seat['col'] <= mid_point:
                total_left[seat['part']] += 1
            else:
                total_right[seat['part']] += 1

    print("\n전체 좌석 수 기준:")
    print(f"  왼쪽: {dict(total_left)}")
    print(f"  오른쪽: {dict(total_right)}")

    print("\n파트별 좌우 비율:")
    for part in ['SOPRANO', 'ALTO', 'TENOR', 'BASS']:
        left = total_left.get(part, 0)
        right = total_right.get(part, 0)
        total = left + right
        if total > 0:
            left_pct = (left / total) * 100
            right_pct = (right / total) * 100
            print(f"  {part}: 왼쪽 {left_pct:.1f}% ({left}석), 오른쪽 {right_pct:.1f}% ({right}석)")

    # 패턴 결론
    print("\n" + "=" * 100)
    print("✅ 학습된 패턴:")
    print("=" * 100)

    soprano_left_pct = (total_left['SOPRANO'] / (total_left['SOPRANO'] + total_right['SOPRANO'])) * 100
    alto_right_pct = (total_right['ALTO'] / (total_left['ALTO'] + total_right['ALTO'])) * 100
    tenor_left_pct = (total_left['TENOR'] / (total_left['TENOR'] + total_right['TENOR'])) * 100
    bass_right_pct = (total_right['BASS'] / (total_left['BASS'] + total_right['BASS'])) * 100

    print(f"\n지휘자 왼쪽 (Left):")
    print(f"  - SOPRANO: {soprano_left_pct:.1f}% (주 배치 영역)")
    print(f"  - TENOR: {tenor_left_pct:.1f}% (주 배치 영역)")

    print(f"\n지휘자 오른쪽 (Right):")
    print(f"  - ALTO: {alto_right_pct:.1f}% (주 배치 영역)")
    print(f"  - BASS: {bass_right_pct:.1f}% (주 배치 영역)")

if __name__ == "__main__":
    analyze_left_right_patterns()
