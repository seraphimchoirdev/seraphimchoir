#!/usr/bin/env python3
"""
ML 학습 데이터의 행별 인원 분배 패턴 분석
총 인원수별로 어떻게 행을 구성했는지 패턴 추출
"""

import json
from pathlib import Path
from collections import defaultdict

def analyze_row_patterns():
    ml_file = Path(__file__).parent.parent / "training_data" / "ml_training_data.json"

    with open(ml_file, 'r', encoding='utf-8') as f:
        ml_data = json.load(f)

    print("🔍 행별 인원 분배 패턴 분석\n")
    print(f"총 {len(ml_data)}개 배치 패턴 분석\n")

    # 총 인원별 행 구성 패턴 저장
    patterns_by_total = defaultdict(list)

    for arrangement in ml_data:
        total = arrangement['metadata']['total_members']

        # 행별 인원 계산 (이제 row는 1부터 시작)
        row_counts = defaultdict(int)
        for seat in arrangement['seats']:
            row_counts[seat['row']] += 1

        # 행 수 (row는 1부터 시작하므로 max가 곧 행 수)
        num_rows = max(row_counts.keys())

        # 행별 인원 리스트 (1행부터 UI 순서대로)
        row_capacities = [row_counts[i] for i in range(1, num_rows + 1)]

        patterns_by_total[total].append({
            'rows': num_rows,
            'capacities': row_capacities
        })

    # 총 인원별 패턴 분석 및 출력
    print("=" * 80)
    print("📊 총 인원별 행 구성 패턴")
    print("=" * 80)

    learned_patterns = {}

    for total in sorted(patterns_by_total.keys()):
        patterns = patterns_by_total[total]
        print(f"\n{'='*80}")
        print(f"총 인원: {total}명 ({len(patterns)}회 관찰)")
        print(f"{'='*80}")

        # 행 수 분포
        rows_dist = defaultdict(int)
        for p in patterns:
            rows_dist[p['rows']] += 1

        most_common_rows = max(rows_dist.items(), key=lambda x: x[1])
        print(f"  행 수: {most_common_rows[0]}행 ({most_common_rows[1]}회)")

        # 해당 행 수의 패턴만 필터링
        filtered_patterns = [p for p in patterns if p['rows'] == most_common_rows[0]]

        # 행별 인원 분배 패턴
        print(f"\n  행별 인원 분배:")

        # 각 행별 평균 계산
        num_rows = most_common_rows[0]
        row_stats = defaultdict(list)

        for pattern in filtered_patterns:
            for row_idx, count in enumerate(pattern['capacities']):
                row_stats[row_idx].append(count)

        avg_capacities = []
        for row_idx in range(num_rows):
            counts = row_stats[row_idx]
            avg = sum(counts) / len(counts)
            min_val = min(counts)
            max_val = max(counts)

            avg_capacities.append(round(avg))

            print(f"    {row_idx}행: 평균 {avg:.1f}명 (범위: {min_val}-{max_val}명)")

        # 가장 일반적인 패턴 찾기 (합계가 정확히 일치하는 패턴만 선택)
        capacity_tuples = [tuple(p['capacities']) for p in filtered_patterns]

        # 합계가 total과 일치하는 패턴만 필터링
        valid_patterns = [ct for ct in capacity_tuples if sum(ct) == total]

        if not valid_patterns:
            print(f"\n  ⚠️  경고: 합계가 정확히 {total}명인 패턴이 없습니다!")
            # 가장 가까운 패턴을 찾아서 조정
            pattern_counts = defaultdict(int)
            for ct in capacity_tuples:
                pattern_counts[ct] += 1

            most_common = max(pattern_counts.items(), key=lambda x: x[1])
            base_pattern = list(most_common[0])
            current_sum = sum(base_pattern)
            diff = total - current_sum

            print(f"  조정 전: {base_pattern} = {current_sum}석 (차이: {diff})")

            # 차이를 뒤쪽 행부터 분배
            if diff > 0:
                for i in range(len(base_pattern) - 1, -1, -1):
                    if diff == 0:
                        break
                    base_pattern[i] += 1
                    diff -= 1
            elif diff < 0:
                for i in range(len(base_pattern) - 1, -1, -1):
                    if diff == 0:
                        break
                    base_pattern[i] -= 1
                    diff += 1

            best_pattern = tuple(base_pattern)
            print(f"  조정 후: {list(best_pattern)} = {sum(best_pattern)}석")
        else:
            pattern_counts = defaultdict(int)
            for ct in valid_patterns:
                pattern_counts[ct] += 1

            most_common_pattern = max(pattern_counts.items(), key=lambda x: x[1])
            best_pattern = most_common_pattern[0]
            print(f"\n  가장 일반적인 패턴: {list(best_pattern)} ({most_common_pattern[1]}회)")

        # 학습된 패턴 저장
        learned_patterns[total] = {
            'rows': most_common_rows[0],
            'capacities': list(best_pattern),
            'observations': len(patterns)
        }

        # 실제 관찰된 모든 패턴 출력
        if len(pattern_counts) > 1:
            print(f"\n  기타 관찰된 패턴:")
            for pattern, count in sorted(pattern_counts.items(), key=lambda x: x[1], reverse=True)[1:4]:
                print(f"    {list(pattern)} ({count}회)")

    # 학습된 패턴을 JSON으로 저장
    print("\n" + "=" * 80)
    print("💾 학습된 패턴 저장")
    print("=" * 80)

    output_file = Path(__file__).parent.parent / "training_data" / "row_distribution_patterns.json"

    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(learned_patterns, f, ensure_ascii=False, indent=2)

    print(f"\n✅ {len(learned_patterns)}개 패턴을 {output_file}에 저장했습니다.")

    # 패턴 특징 분석
    print("\n" + "=" * 80)
    print("📈 패턴 특징 분석")
    print("=" * 80)

    # 55명 이하와 56명 이상 패턴 비교
    small_group = {k: v for k, v in learned_patterns.items() if k <= 55}
    large_group = {k: v for k, v in learned_patterns.items() if k > 55}

    print(f"\n55명 이하 그룹 ({len(small_group)}개):")
    rows_5 = sum(1 for v in small_group.values() if v['rows'] == 5)
    rows_6 = sum(1 for v in small_group.values() if v['rows'] == 6)
    print(f"  5행: {rows_5}개, 6행: {rows_6}개")

    print(f"\n56명 이상 그룹 ({len(large_group)}개):")
    rows_5 = sum(1 for v in large_group.values() if v['rows'] == 5)
    rows_6 = sum(1 for v in large_group.values() if v['rows'] == 6)
    print(f"  5행: {rows_5}개, 6행: {rows_6}개")

    # 앞쪽 행과 뒤쪽 행의 인원 비교
    print(f"\n앞쪽 행 vs 뒤쪽 행 인원 비교 (56명 이상 그룹):")
    for total, pattern in sorted(large_group.items())[:5]:
        caps = pattern['capacities']
        front_avg = sum(caps[:2]) / 2
        back_avg = sum(caps[-2:]) / 2
        print(f"  {total}명: 앞쪽 평균 {front_avg:.1f}명, 뒤쪽 평균 {back_avg:.1f}명 ({list(caps)})")

if __name__ == "__main__":
    analyze_row_patterns()
