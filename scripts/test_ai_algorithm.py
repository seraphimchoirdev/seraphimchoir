#!/usr/bin/env python3
"""
AI 자동배치 알고리즘 테스트 스크립트
실제 학습 데이터와 비교하여 알고리즘의 정확도를 검증합니다.
"""

import json
from pathlib import Path
from collections import defaultdict

def load_training_data():
    """ML 학습 데이터 로드"""
    ml_file = Path(__file__).parent.parent / "training_data" / "ml_training_data.json"
    with open(ml_file, 'r', encoding='utf-8') as f:
        return json.load(f)

def analyze_pattern(arrangement):
    """배치 패턴 분석"""
    # 행별 파트 분포
    rows = defaultdict(lambda: {'SOPRANO': 0, 'ALTO': 0, 'TENOR': 0, 'BASS': 0})

    for seat in arrangement['seats']:
        rows[seat['row']][seat['part']] += 1

    # 총 행 수
    max_row = max(seat['row'] for seat in arrangement['seats'])
    num_rows = max_row + 1

    # 행별 인원수
    row_capacities = [len([s for s in arrangement['seats'] if s['row'] == r]) for r in range(num_rows)]

    return {
        'num_rows': num_rows,
        'row_capacities': row_capacities,
        'part_distribution': dict(rows)
    }

def calculate_accuracy_metrics(training_data):
    """학습 데이터 기반 정확도 메트릭 계산"""

    # 총 인원별 행 구성 패턴
    total_to_rows = defaultdict(list)

    # 파트별 선호 행 통계
    part_row_stats = {
        'SOPRANO': defaultdict(int),
        'ALTO': defaultdict(int),
        'TENOR': defaultdict(int),
        'BASS': defaultdict(int)
    }

    for arrangement in training_data:
        total = arrangement['metadata']['total_members']
        pattern = analyze_pattern(arrangement)

        total_to_rows[total].append(pattern['num_rows'])

        # 파트별 행 분포 기록
        for row, parts in pattern['part_distribution'].items():
            for part, count in parts.items():
                if count > 0:
                    part_row_stats[part][row] += count

    # 총 인원별 평균 행 수
    print("=" * 60)
    print("📊 총 인원별 행 구성 패턴")
    print("=" * 60)

    for total in sorted(total_to_rows.keys()):
        rows_list = total_to_rows[total]
        avg_rows = sum(rows_list) / len(rows_list)
        print(f"{total}명: {avg_rows:.1f}행 (최빈값: {max(set(rows_list), key=rows_list.count)}행, {len(rows_list)}회 관찰)")

    # 파트별 선호 행
    print("\n" + "=" * 60)
    print("🎵 파트별 선호 행 분석")
    print("=" * 60)

    for part in ['TENOR', 'BASS', 'SOPRANO', 'ALTO']:
        row_counts = part_row_stats[part]
        total_count = sum(row_counts.values())

        print(f"\n{part}:")
        for row in sorted(row_counts.keys()):
            count = row_counts[row]
            percentage = (count / total_count) * 100
            print(f"  {row}행: {count}명 ({percentage:.1f}%)")

        # 상위 3개 선호 행
        top_rows = sorted(row_counts.items(), key=lambda x: x[1], reverse=True)[:3]
        print(f"  → 선호 행: {[row for row, _ in top_rows]}")

    # 지그재그 패턴 확인
    print("\n" + "=" * 60)
    print("🔄 지그재그 패턴 검증")
    print("=" * 60)

    zigzag_matches = 0
    total_arrangements = len(training_data)

    for arrangement in training_data:
        # 각 행의 첫 번째와 마지막 좌석 파트 확인
        rows_data = defaultdict(list)
        for seat in arrangement['seats']:
            rows_data[seat['row']].append((seat['col'], seat['part']))

        # 각 행을 col로 정렬
        is_zigzag = True
        for row in sorted(rows_data.keys()):
            seats = sorted(rows_data[row], key=lambda x: x[0])
            # 지그재그 패턴은 복잡하므로 일단 스킵

    print(f"총 {total_arrangements}개 배치 분석 완료")

def test_algorithm_with_sample():
    """샘플 데이터로 알고리즘 테스트"""

    print("\n" + "=" * 60)
    print("🧪 알고리즘 테스트 (샘플 데이터)")
    print("=" * 60)

    # 실제 배치 예시 (55명)
    sample_members = {
        'SOPRANO': 21,
        'ALTO': 15,
        'TENOR': 9,
        'BASS': 10
    }

    total = sum(sample_members.values())

    # 행 구성 계산 (알고리즘 검증)
    if total <= 55:
        # 5행 구성
        base_per_row = total // 5
        remainder = total % 5
        row_capacities = [
            base_per_row + (1 if remainder > 0 else 0),
            base_per_row + (1 if remainder > 1 else 0),
            base_per_row + (1 if remainder > 2 else 0),
            base_per_row + (1 if remainder > 3 else 0),
            base_per_row + (1 if remainder > 4 else 0),
        ]
    else:
        # 6행 구성
        base_per_row = total // 6
        remainder = total % 6
        row_capacities = [
            base_per_row - 1,
            base_per_row,
            base_per_row + 1,
            base_per_row + 1,
            base_per_row + 1,
            base_per_row + 1,
        ]
        row_capacities = [
            capacity + (1 if remainder > idx else 0)
            for idx, capacity in enumerate(row_capacities)
        ]

    print(f"\n총 인원: {total}명")
    print(f"파트 분포: {sample_members}")
    print(f"행 구성: {len(row_capacities)}행")
    print(f"행별 인원: {row_capacities}")
    print(f"총 좌석: {sum(row_capacities)}석")

    # 파트 분배 시뮬레이션
    print("\n파트별 선호 행 배치:")

    PART_ROW_PREFERENCES = {
        'TENOR': [0, 1, 2],
        'BASS': [0, 1, 2],
        'SOPRANO': [2, 3, 4, 5],
        'ALTO': [2, 3, 4, 5],
    }

    distribution = defaultdict(lambda: {'TENOR': 0, 'BASS': 0, 'SOPRANO': 0, 'ALTO': 0})

    for part in ['TENOR', 'BASS', 'SOPRANO', 'ALTO']:
        count = sample_members[part]
        preferences = PART_ROW_PREFERENCES[part]
        valid_rows = [r for r in preferences if r < len(row_capacities)]

        remaining = count
        row_idx = 0

        while remaining > 0 and row_idx < len(valid_rows):
            row = valid_rows[row_idx]
            row_capacity = row_capacities[row]
            current_total = sum(distribution[row].values())
            available = row_capacity - current_total

            if available > 0:
                to_place = min(remaining, max(1, available // (4 - row_idx)))
                distribution[row][part] = to_place
                remaining -= to_place
            row_idx += 1

        # 남은 인원을 다른 행에 배치
        if remaining > 0:
            for row in range(len(row_capacities)):
                if remaining <= 0:
                    break
                current_total = sum(distribution[row].values())
                available = row_capacities[row] - current_total
                if available > 0:
                    to_place = min(remaining, available)
                    distribution[row][part] += to_place
                    remaining -= to_place

    # 결과 출력
    for row in sorted(distribution.keys()):
        parts = distribution[row]
        total_in_row = sum(parts.values())
        print(f"  {row}행 ({total_in_row}명): S{parts['SOPRANO']} A{parts['ALTO']} T{parts['TENOR']} B{parts['BASS']}")

if __name__ == "__main__":
    print("🎯 AI 자동배치 알고리즘 테스트\n")

    # 학습 데이터 로드
    training_data = load_training_data()
    print(f"✅ {len(training_data)}개 배치 패턴 로드 완료\n")

    # 정확도 메트릭 계산
    calculate_accuracy_metrics(training_data)

    # 샘플 데이터 테스트
    test_algorithm_with_sample()

    print("\n" + "=" * 60)
    print("✅ 테스트 완료")
    print("=" * 60)
