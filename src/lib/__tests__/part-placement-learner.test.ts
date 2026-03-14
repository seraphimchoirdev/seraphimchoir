/**
 * Part Placement Learner 테스트
 *
 * 순수 함수 기반 파트별 배치 규칙 학습 로직 검증
 * 모킹 불필요 — 모든 함수가 타입 + 순수 계산만 수행
 */
import type { GridLayout } from '@/types/grid';

import {
  type ArrangementMetadata,
  type LearningInput,
  type SeatDataForLearning,
  getMemberCountRange,
  learnAllPartPlacementRules,
  learnFromSingleArrangement,
  learnPartPlacementRulesFromGroup,
} from '../part-placement-learner';

// ─── 테스트 데이터 팩토리 ──────────────────────────────────────────

const defaultGridLayout: GridLayout = {
  rows: 6,
  rowCapacities: [14, 14, 14, 14, 14, 14],
  zigzagPattern: 'none',
};

function createSeat(overrides: Partial<SeatDataForLearning> = {}): SeatDataForLearning {
  return {
    seat_row: 1,
    seat_column: 1,
    part: 'SOPRANO',
    arrangement_id: 'arr-1',
    ...overrides,
  };
}

function createGridLayouts(ids: string[] = ['arr-1']): Map<string, GridLayout> {
  const map = new Map<string, GridLayout>();
  for (const id of ids) {
    map.set(id, { ...defaultGridLayout });
  }
  return map;
}

/**
 * 특정 파트의 좌석을 행/열 패턴에 따라 대량 생성
 */
function createPartSeats(
  part: SeatDataForLearning['part'],
  positions: Array<{ row: number; col: number }>,
  arrangementId = 'arr-1'
): SeatDataForLearning[] {
  return positions.map((pos) =>
    createSeat({
      part,
      seat_row: pos.row,
      seat_column: pos.col,
      arrangement_id: arrangementId,
    })
  );
}

// ─── getMemberCountRange ───────────────────────────────────────────

describe('getMemberCountRange', () => {
  it('75 → "70-79"', () => {
    expect(getMemberCountRange(75)).toBe('70-79');
  });

  it('80 → "80-89"', () => {
    expect(getMemberCountRange(80)).toBe('80-89');
  });

  it('0 → "0-9"', () => {
    expect(getMemberCountRange(0)).toBe('0-9');
  });

  it('100 → "100-109"', () => {
    expect(getMemberCountRange(100)).toBe('100-109');
  });

  it('9 → "0-9"', () => {
    expect(getMemberCountRange(9)).toBe('0-9');
  });

  it('10 → "10-19"', () => {
    expect(getMemberCountRange(10)).toBe('10-19');
  });
});

// ─── learnPartPlacementRulesFromGroup ──────────────────────────────

describe('learnPartPlacementRulesFromGroup', () => {
  it('단일 파트 좌석 데이터 → 올바른 규칙 생성', () => {
    // 소프라노: 1-3행 좌측에 배치
    const seats = createPartSeats('SOPRANO', [
      { row: 1, col: 1 },
      { row: 1, col: 2 },
      { row: 2, col: 1 },
      { row: 2, col: 3 },
      { row: 3, col: 2 },
    ]);

    const rules = learnPartPlacementRulesFromGroup(seats, createGridLayouts());
    const soprano = rules.get('SOPRANO')!;

    expect(soprano.part).toBe('SOPRANO');
    expect(soprano.totalSeatsAnalyzed).toBe(5);
    expect(soprano.sampleCount).toBe(1);
    expect(soprano.preferredRows.length).toBeGreaterThan(0);
    expect(soprano.rowDistribution).toBeDefined();
  });

  it('좌측 70%+ 배치 → side="left"', () => {
    // 14열 행에서 1-3열에 배치 (중앙=7)
    const seats = createPartSeats('SOPRANO', [
      { row: 1, col: 1 },
      { row: 1, col: 2 },
      { row: 1, col: 3 },
      { row: 1, col: 4 },
      { row: 1, col: 5 },
      { row: 1, col: 6 },
      { row: 2, col: 1 },
      { row: 2, col: 2 },
      { row: 2, col: 3 },
      { row: 2, col: 4 },
    ]);

    const rules = learnPartPlacementRulesFromGroup(seats, createGridLayouts());
    expect(rules.get('SOPRANO')!.side).toBe('left');
  });

  it('우측 70%+ 배치 → side="right"', () => {
    // 14열 행에서 8-14열에 배치 (중앙=7)
    const seats = createPartSeats('ALTO', [
      { row: 1, col: 8 },
      { row: 1, col: 9 },
      { row: 1, col: 10 },
      { row: 1, col: 11 },
      { row: 1, col: 12 },
      { row: 1, col: 13 },
      { row: 2, col: 8 },
      { row: 2, col: 9 },
      { row: 2, col: 10 },
      { row: 2, col: 11 },
    ]);

    const rules = learnPartPlacementRulesFromGroup(seats, createGridLayouts());
    expect(rules.get('ALTO')!.side).toBe('right');
  });

  it('양측 분산 → side="both"', () => {
    // 좌우 고르게 배치
    const seats = createPartSeats('TENOR', [
      { row: 1, col: 1 },
      { row: 1, col: 2 },
      { row: 1, col: 3 },
      { row: 1, col: 10 },
      { row: 1, col: 11 },
      { row: 1, col: 12 },
    ]);

    const rules = learnPartPlacementRulesFromGroup(seats, createGridLayouts());
    expect(rules.get('TENOR')!.side).toBe('both');
  });

  it('0% 배치 행 → forbiddenRows에 포함', () => {
    // 1-2행에만 배치, 3-6행은 0%
    const seats = createPartSeats('SOPRANO', [
      { row: 1, col: 1 },
      { row: 1, col: 2 },
      { row: 2, col: 1 },
    ]);

    const rules = learnPartPlacementRulesFromGroup(seats, createGridLayouts());
    const soprano = rules.get('SOPRANO')!;

    expect(soprano.forbiddenRows).toContain(3);
    expect(soprano.forbiddenRows).toContain(4);
    expect(soprano.forbiddenRows).toContain(5);
    expect(soprano.forbiddenRows).toContain(6);
  });

  it('5% 미만 배치 행 → overflowRows에 포함', () => {
    // 100석 중 4행에 4석 (4%) → overflow
    const seats: SeatDataForLearning[] = [];
    // 1행: 40석
    for (let c = 1; c <= 10; c++) {
      for (const arrId of ['arr-1', 'arr-2', 'arr-3', 'arr-4']) {
        seats.push(
          createSeat({ part: 'SOPRANO', seat_row: 1, seat_column: c, arrangement_id: arrId })
        );
      }
    }
    // 2행: 40석
    for (let c = 1; c <= 10; c++) {
      for (const arrId of ['arr-1', 'arr-2', 'arr-3', 'arr-4']) {
        seats.push(
          createSeat({ part: 'SOPRANO', seat_row: 2, seat_column: c, arrangement_id: arrId })
        );
      }
    }
    // 3행: 16석
    for (let c = 1; c <= 4; c++) {
      for (const arrId of ['arr-1', 'arr-2', 'arr-3', 'arr-4']) {
        seats.push(
          createSeat({ part: 'SOPRANO', seat_row: 3, seat_column: c, arrangement_id: arrId })
        );
      }
    }
    // 4행: 4석 (4/100 = 4% < 5%)
    for (const arrId of ['arr-1', 'arr-2', 'arr-3', 'arr-4']) {
      seats.push(
        createSeat({ part: 'SOPRANO', seat_row: 4, seat_column: 1, arrangement_id: arrId })
      );
    }

    const layouts = createGridLayouts(['arr-1', 'arr-2', 'arr-3', 'arr-4']);
    const rules = learnPartPlacementRulesFromGroup(seats, layouts);
    const soprano = rules.get('SOPRANO')!;

    expect(soprano.overflowRows).toContain(4);
    expect(soprano.forbiddenRows).toContain(5);
    expect(soprano.forbiddenRows).toContain(6);
  });

  it('빈 파트 → createEmptyRule (confidenceScore=0)', () => {
    // ALTO 좌석 없음, SOPRANO만 존재
    const seats = createPartSeats('SOPRANO', [{ row: 1, col: 1 }]);

    const rules = learnPartPlacementRulesFromGroup(seats, createGridLayouts());
    const alto = rules.get('ALTO')!;

    expect(alto.totalSeatsAnalyzed).toBe(0);
    expect(alto.confidenceScore).toBe(0);
    expect(alto.side).toBe('both');
    expect(alto.preferredRows).toEqual([]);
  });

  it('앞줄(1-3행) 비율 계산', () => {
    // 1행: 3석, 2행: 2석, 3행: 1석, 4행: 4석 → 앞줄 = 60%
    const seats = createPartSeats('SOPRANO', [
      { row: 1, col: 1 },
      { row: 1, col: 2 },
      { row: 1, col: 3 },
      { row: 2, col: 1 },
      { row: 2, col: 2 },
      { row: 3, col: 1 },
      { row: 4, col: 1 },
      { row: 4, col: 2 },
      { row: 4, col: 3 },
      { row: 4, col: 4 },
    ]);

    const rules = learnPartPlacementRulesFromGroup(seats, createGridLayouts());
    expect(rules.get('SOPRANO')!.frontRowPercentage).toBe(60);
  });

  it('열 패턴: colRangeByRow 정확성', () => {
    const seats = createPartSeats('SOPRANO', [
      { row: 1, col: 2 },
      { row: 1, col: 5 },
      { row: 2, col: 3 },
      { row: 2, col: 4 },
    ]);

    const rules = learnPartPlacementRulesFromGroup(seats, createGridLayouts());
    const soprano = rules.get('SOPRANO')!;

    expect(soprano.colRangeByRow![1]).toEqual({ min: 2, max: 5, avg: 3.5, count: 2 });
    expect(soprano.colRangeByRow![2]).toEqual({ min: 3, max: 4, avg: 3.5, count: 2 });
  });

  it('열 패턴: avgCol 계산', () => {
    const seats = createPartSeats('SOPRANO', [
      { row: 1, col: 2 },
      { row: 1, col: 4 },
      { row: 2, col: 6 },
      { row: 2, col: 8 },
    ]);

    const rules = learnPartPlacementRulesFromGroup(seats, createGridLayouts());
    // (2+4+6+8)/4 = 5.0
    expect(rules.get('SOPRANO')!.avgCol).toBe(5);
  });

  it('열 패턴: colConsistency (일관된 데이터 → 높은 점수)', () => {
    // 모든 행에서 평균 열이 거의 동일 → 높은 일관성
    const seats = createPartSeats('SOPRANO', [
      { row: 1, col: 3 },
      { row: 1, col: 4 },
      { row: 2, col: 3 },
      { row: 2, col: 4 },
      { row: 3, col: 3 },
      { row: 3, col: 4 },
    ]);

    const rules = learnPartPlacementRulesFromGroup(seats, createGridLayouts());
    expect(rules.get('SOPRANO')!.colConsistency).toBeGreaterThanOrEqual(0.9);
  });

  it('열 패턴: colConsistency (분산된 데이터 → 낮은 점수)', () => {
    // 행별 평균 열이 크게 다름
    const seats = createPartSeats('SOPRANO', [
      { row: 1, col: 1 },
      { row: 2, col: 7 },
      { row: 3, col: 14 },
    ]);

    const rules = learnPartPlacementRulesFromGroup(seats, createGridLayouts());
    expect(rules.get('SOPRANO')!.colConsistency).toBeLessThan(0.5);
  });

  it('confidenceScore: 샘플 30개+ & 100석+ → 높은 점수', () => {
    const seats: SeatDataForLearning[] = [];
    const arrIds: string[] = [];

    // 30개 arrangement에서 총 120석
    for (let i = 1; i <= 30; i++) {
      const arrId = `arr-${i}`;
      arrIds.push(arrId);
      for (let c = 1; c <= 4; c++) {
        seats.push(
          createSeat({ part: 'SOPRANO', seat_row: 1, seat_column: c, arrangement_id: arrId })
        );
      }
    }

    const layouts = createGridLayouts(arrIds);
    const rules = learnPartPlacementRulesFromGroup(seats, layouts);

    // sampleScore=0.6, seatScore=min(120/100,1)*0.4=0.4 → 1.0
    expect(rules.get('SOPRANO')!.confidenceScore).toBe(1);
  });

  it('confidenceScore: 샘플 1개 → 낮은 점수', () => {
    const seats = createPartSeats('SOPRANO', [{ row: 1, col: 1 }]);

    const rules = learnPartPlacementRulesFromGroup(seats, createGridLayouts());
    // sampleScore=(1/30)*0.6=0.02, seatScore=(1/100)*0.4=0.004 → 0.024
    expect(rules.get('SOPRANO')!.confidenceScore).toBeLessThan(0.05);
  });

  it('5파트(SATB+SPECIAL) 모두 규칙 생성', () => {
    const seats = [
      createSeat({ part: 'SOPRANO', seat_row: 1, seat_column: 1 }),
      createSeat({ part: 'ALTO', seat_row: 1, seat_column: 8 }),
      createSeat({ part: 'TENOR', seat_row: 5, seat_column: 1 }),
      createSeat({ part: 'BASS', seat_row: 5, seat_column: 8 }),
      createSeat({ part: 'SPECIAL', seat_row: 3, seat_column: 7 }),
    ];

    const rules = learnPartPlacementRulesFromGroup(seats, createGridLayouts());

    expect(rules.size).toBe(5);
    expect(rules.has('SOPRANO')).toBe(true);
    expect(rules.has('ALTO')).toBe(true);
    expect(rules.has('TENOR')).toBe(true);
    expect(rules.has('BASS')).toBe(true);
    expect(rules.has('SPECIAL')).toBe(true);
  });

  it('gridLayout 없는 arrangement → side 계산에서 무시', () => {
    const seats = createPartSeats('SOPRANO', [
      { row: 1, col: 1 },
      { row: 1, col: 2 },
    ]);
    // 빈 gridLayouts → determineSide에서 total=0 → 'both'
    const emptyLayouts = new Map<string, GridLayout>();

    const rules = learnPartPlacementRulesFromGroup(seats, emptyLayouts);
    expect(rules.get('SOPRANO')!.side).toBe('both');
    expect(rules.get('SOPRANO')!.sidePercentage).toBe(50);
  });
});

// ─── learnAllPartPlacementRules ────────────────────────────────────

describe('learnAllPartPlacementRules', () => {
  function createInput(): LearningInput {
    const arrangements: ArrangementMetadata[] = [
      {
        arrangement_id: 'arr-1',
        service_type: '2부예배',
        total_members: 75,
        grid_layout: { ...defaultGridLayout },
      },
      {
        arrangement_id: 'arr-2',
        service_type: '2부예배',
        total_members: 78,
        grid_layout: { ...defaultGridLayout },
      },
    ];

    const seats: SeatDataForLearning[] = [
      ...createPartSeats(
        'SOPRANO',
        [
          { row: 1, col: 1 },
          { row: 1, col: 2 },
        ],
        'arr-1'
      ),
      ...createPartSeats(
        'SOPRANO',
        [
          { row: 1, col: 1 },
          { row: 1, col: 3 },
        ],
        'arr-2'
      ),
      ...createPartSeats('ALTO', [{ row: 1, col: 10 }], 'arr-1'),
    ];

    return { seats, arrangements };
  }

  it('예배유형 + 인원구간별 그룹화', () => {
    const input = createInput();
    const result = learnAllPartPlacementRules(input);

    // 모두 "2부예배::70-79" 그룹
    expect(result.stats.groupsLearned).toBe(1);
  });

  it('stats 정확성', () => {
    const input = createInput();
    const result = learnAllPartPlacementRules(input);

    expect(result.stats.totalArrangements).toBe(2);
    expect(result.stats.totalSeats).toBe(5);
    expect(result.stats.groupsLearned).toBe(1);
    expect(result.stats.partRulesGenerated).toBeGreaterThan(0);
  });

  it('빈 파트는 rules에서 제외 (totalSeatsAnalyzed === 0)', () => {
    const input = createInput();
    const result = learnAllPartPlacementRules(input);

    // TENOR, BASS, SPECIAL은 좌석 없으므로 제외
    const parts = result.rules.map((r) => r.part);
    expect(parts).toContain('SOPRANO');
    expect(parts).toContain('ALTO');
    expect(parts).not.toContain('TENOR');
    expect(parts).not.toContain('BASS');
    expect(parts).not.toContain('SPECIAL');
  });

  it('여러 그룹 → 그룹별 독립 규칙', () => {
    const arrangements: ArrangementMetadata[] = [
      {
        arrangement_id: 'arr-1',
        service_type: '1부예배',
        total_members: 60,
        grid_layout: { ...defaultGridLayout },
      },
      {
        arrangement_id: 'arr-2',
        service_type: '2부예배',
        total_members: 80,
        grid_layout: { ...defaultGridLayout },
      },
    ];

    const seats: SeatDataForLearning[] = [
      createSeat({ part: 'SOPRANO', seat_row: 1, seat_column: 1, arrangement_id: 'arr-1' }),
      createSeat({ part: 'SOPRANO', seat_row: 1, seat_column: 1, arrangement_id: 'arr-2' }),
    ];

    const result = learnAllPartPlacementRules({ seats, arrangements });

    // "1부예배::60-69" + "2부예배::80-89" = 2그룹
    expect(result.stats.groupsLearned).toBe(2);
    expect(result.rules.length).toBe(2);

    const serviceTypes = result.rules.map((r) => r.service_type);
    expect(serviceTypes).toContain('1부예배');
    expect(serviceTypes).toContain('2부예배');
  });

  it('DB 레코드 형식 검증 (snake_case)', () => {
    const input = createInput();
    const result = learnAllPartPlacementRules(input);
    const rule = result.rules[0];

    expect(rule).toHaveProperty('service_type');
    expect(rule).toHaveProperty('member_count_range');
    expect(rule).toHaveProperty('preferred_rows');
    expect(rule).toHaveProperty('overflow_rows');
    expect(rule).toHaveProperty('forbidden_rows');
    expect(rule).toHaveProperty('row_distribution');
    expect(rule).toHaveProperty('side_percentage');
    expect(rule).toHaveProperty('front_row_percentage');
    expect(rule).toHaveProperty('sample_count');
    expect(rule).toHaveProperty('total_seats_analyzed');
    expect(rule).toHaveProperty('confidence_score');
  });

  it('arrangement에 매핑되지 않는 seat은 무시', () => {
    const arrangements: ArrangementMetadata[] = [
      {
        arrangement_id: 'arr-1',
        service_type: '2부예배',
        total_members: 75,
        grid_layout: { ...defaultGridLayout },
      },
    ];

    const seats: SeatDataForLearning[] = [
      createSeat({ arrangement_id: 'arr-1' }),
      createSeat({ arrangement_id: 'arr-unknown' }), // 매핑 없음
    ];

    const result = learnAllPartPlacementRules({ seats, arrangements });
    // arr-unknown은 무시 → SOPRANO 1석만
    expect(result.rules.find((r) => r.part === 'SOPRANO')?.total_seats_analyzed).toBe(1);
  });
});

// ─── learnFromSingleArrangement ────────────────────────────────────

describe('learnFromSingleArrangement', () => {
  it('기존 데이터 + 새 데이터 병합 학습', () => {
    const existingSeats = createPartSeats(
      'SOPRANO',
      [
        { row: 1, col: 1 },
        { row: 1, col: 2 },
      ],
      'arr-1'
    );

    const newSeats = createPartSeats(
      'SOPRANO',
      [
        { row: 1, col: 1 },
        { row: 2, col: 3 },
      ],
      'arr-2'
    );

    const existingLayouts = createGridLayouts(['arr-1']);
    const metadata: ArrangementMetadata = {
      arrangement_id: 'arr-2',
      service_type: '2부예배',
      total_members: 75,
      grid_layout: { ...defaultGridLayout },
    };

    const rules = learnFromSingleArrangement(newSeats, metadata, existingSeats, existingLayouts);

    const soprano = rules.get('SOPRANO')!;
    // 기존 2 + 신규 2 = 4석
    expect(soprano.totalSeatsAnalyzed).toBe(4);
    // 2개 arrangement
    expect(soprano.sampleCount).toBe(2);
  });

  it('새 gridLayout이 Map에 추가됨', () => {
    const existingLayouts = createGridLayouts(['arr-1']);
    const metadata: ArrangementMetadata = {
      arrangement_id: 'arr-new',
      service_type: '2부예배',
      total_members: 75,
      grid_layout: { rows: 4, rowCapacities: [10, 10, 10, 10], zigzagPattern: 'even' },
    };

    // 새 배치에서 4행 사용
    const newSeats = createPartSeats('SOPRANO', [{ row: 4, col: 5 }], 'arr-new');

    const rules = learnFromSingleArrangement(newSeats, metadata, [], existingLayouts);
    const soprano = rules.get('SOPRANO')!;

    expect(soprano.totalSeatsAnalyzed).toBe(1);
  });
});
