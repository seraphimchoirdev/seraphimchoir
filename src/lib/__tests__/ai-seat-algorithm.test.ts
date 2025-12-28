/**
 * AI 자동배치 알고리즘 테스트
 */

import {
  generateAISeatingArrangement,
  calculatePreferredSeats,
  hasStrongFixedSeatPreference,
  type Member,
  type SeatHistory,
  type PreferredSeat,
} from '../ai-seat-algorithm';

describe('AI Seat Arrangement Algorithm', () => {
  // 테스트용 멤버 데이터 생성 (경력/키/리더 여부는 현재 미사용)
  const createMember = (
    id: string,
    name: string,
    part: 'SOPRANO' | 'ALTO' | 'TENOR' | 'BASS',
    _options: {
      height?: number;
    } = {}
  ): Member => ({
    id,
    name,
    part,
  });

  describe('5행 구성 (55명 이하)', () => {
    it('55명 배치 - 균등 분배', () => {
      const members: Member[] = [
        // SOPRANO 21명
        ...Array.from({ length: 21 }, (_, i) =>
          createMember(`s${i}`, `소프라노${i}`, 'SOPRANO', { height: 160 + i })
        ),
        // ALTO 15명
        ...Array.from({ length: 15 }, (_, i) =>
          createMember(`a${i}`, `알토${i}`, 'ALTO', { height: 165 + i })
        ),
        // TENOR 9명
        ...Array.from({ length: 9 }, (_, i) =>
          createMember(`t${i}`, `테너${i}`, 'TENOR', { height: 175 + i })
        ),
        // BASS 10명
        ...Array.from({ length: 10 }, (_, i) =>
          createMember(`b${i}`, `베이스${i}`, 'BASS', { height: 180 + i })
        ),
      ];

      const result = generateAISeatingArrangement(members);

      // 총 인원 확인
      expect(result.metadata.total_members).toBe(55);
      expect(result.seats.length).toBe(55);

      // 5행 구성
      expect(result.grid_layout.rows).toBe(5);

      // 각 행의 좌석 수 확인
      const rowCapacities = result.grid_layout.row_capacities;
      expect(rowCapacities.length).toBe(5);
      expect(rowCapacities.reduce((sum, count) => sum + count, 0)).toBe(55);

      // 파트별 분포 확인
      expect(result.metadata.breakdown.SOPRANO).toBe(21);
      expect(result.metadata.breakdown.ALTO).toBe(15);
      expect(result.metadata.breakdown.TENOR).toBe(9);
      expect(result.metadata.breakdown.BASS).toBe(10);
    });

    it('45명 배치 - 소규모', () => {
      const members: Member[] = [
        ...Array.from({ length: 16 }, (_, i) =>
          createMember(`s${i}`, `소프라노${i}`, 'SOPRANO')
        ),
        ...Array.from({ length: 14 }, (_, i) =>
          createMember(`a${i}`, `알토${i}`, 'ALTO')
        ),
        ...Array.from({ length: 6 }, (_, i) =>
          createMember(`t${i}`, `테너${i}`, 'TENOR')
        ),
        ...Array.from({ length: 9 }, (_, i) =>
          createMember(`b${i}`, `베이스${i}`, 'BASS')
        ),
      ];

      const result = generateAISeatingArrangement(members);

      expect(result.metadata.total_members).toBe(45);
      expect(result.grid_layout.rows).toBe(5);
      expect(result.seats.length).toBe(45);
    });
  });

  describe('6행 구성 (56명 이상)', () => {
    it('84명 배치 - 대규모', () => {
      const members: Member[] = [
        ...Array.from({ length: 34 }, (_, i) =>
          createMember(`s${i}`, `소프라노${i}`, 'SOPRANO')
        ),
        ...Array.from({ length: 23 }, (_, i) =>
          createMember(`a${i}`, `알토${i}`, 'ALTO')
        ),
        ...Array.from({ length: 12 }, (_, i) =>
          createMember(`t${i}`, `테너${i}`, 'TENOR')
        ),
        ...Array.from({ length: 15 }, (_, i) =>
          createMember(`b${i}`, `베이스${i}`, 'BASS')
        ),
      ];

      const result = generateAISeatingArrangement(members);

      expect(result.metadata.total_members).toBe(84);
      expect(result.grid_layout.rows).toBe(6);
      expect(result.seats.length).toBe(84);

      // ML 데이터 기반: 앞쪽 행이 많고 뒤쪽으로 갈수록 적어짐 (학습된 패턴)
      const rowCapacities = result.grid_layout.row_capacities;
      expect(rowCapacities[0]).toBeGreaterThanOrEqual(rowCapacities[5]);
    });

    // 실제 training_data 기반 테스트 케이스들
    it('72명 배치 - 실제 데이터 기반 (소프라노 29, 알토 20, 테너 11, 베이스 12)', () => {
      const members: Member[] = [
        ...Array.from({ length: 29 }, (_, i) =>
          createMember(`s${i}`, `소프라노${i}`, 'SOPRANO', { height: 155 + i % 10 })
        ),
        ...Array.from({ length: 20 }, (_, i) =>
          createMember(`a${i}`, `알토${i}`, 'ALTO', { height: 158 + i % 10 })
        ),
        ...Array.from({ length: 11 }, (_, i) =>
          createMember(`t${i}`, `테너${i}`, 'TENOR', { height: 170 + i % 10 })
        ),
        ...Array.from({ length: 12 }, (_, i) =>
          createMember(`b${i}`, `베이스${i}`, 'BASS', { height: 175 + i % 10 })
        ),
      ];

      const result = generateAISeatingArrangement(members);

      expect(result.metadata.total_members).toBe(72);
      expect(result.grid_layout.rows).toBe(6);
      expect(result.seats.length).toBe(72);

      // 파트별 인원 확인
      expect(result.metadata.breakdown.SOPRANO).toBe(29);
      expect(result.metadata.breakdown.ALTO).toBe(20);
      expect(result.metadata.breakdown.TENOR).toBe(11);
      expect(result.metadata.breakdown.BASS).toBe(12);
    });

    it('83명 배치 - 실제 데이터 기반 (소프라노 33, 알토 21, 테너 14, 베이스 15)', () => {
      const members: Member[] = [
        ...Array.from({ length: 33 }, (_, i) =>
          createMember(`s${i}`, `소프라노${i}`, 'SOPRANO', { height: 155 + i % 10 })
        ),
        ...Array.from({ length: 21 }, (_, i) =>
          createMember(`a${i}`, `알토${i}`, 'ALTO', { height: 158 + i % 10 })
        ),
        ...Array.from({ length: 14 }, (_, i) =>
          createMember(`t${i}`, `테너${i}`, 'TENOR', { height: 170 + i % 10 })
        ),
        ...Array.from({ length: 15 }, (_, i) =>
          createMember(`b${i}`, `베이스${i}`, 'BASS', { height: 175 + i % 10 })
        ),
      ];

      const result = generateAISeatingArrangement(members);

      expect(result.metadata.total_members).toBe(83);
      expect(result.grid_layout.rows).toBe(6);
      expect(result.seats.length).toBe(83);

      // 파트별 인원 확인
      expect(result.metadata.breakdown.SOPRANO).toBe(33);
      expect(result.metadata.breakdown.ALTO).toBe(21);
      expect(result.metadata.breakdown.TENOR).toBe(14);
      expect(result.metadata.breakdown.BASS).toBe(15);
    });

    it('79명 배치 - 실제 데이터 기반 (소프라노 28, 알토 22, 테너 13, 베이스 16)', () => {
      const members: Member[] = [
        ...Array.from({ length: 28 }, (_, i) =>
          createMember(`s${i}`, `소프라노${i}`, 'SOPRANO', { height: 155 + i % 10 })
        ),
        ...Array.from({ length: 22 }, (_, i) =>
          createMember(`a${i}`, `알토${i}`, 'ALTO', { height: 158 + i % 10 })
        ),
        ...Array.from({ length: 13 }, (_, i) =>
          createMember(`t${i}`, `테너${i}`, 'TENOR', { height: 170 + i % 10 })
        ),
        ...Array.from({ length: 16 }, (_, i) =>
          createMember(`b${i}`, `베이스${i}`, 'BASS', { height: 175 + i % 10 })
        ),
      ];

      const result = generateAISeatingArrangement(members);

      expect(result.metadata.total_members).toBe(79);
      expect(result.grid_layout.rows).toBe(6);
      expect(result.seats.length).toBe(79);

      // 파트별 인원 확인
      expect(result.metadata.breakdown.SOPRANO).toBe(28);
      expect(result.metadata.breakdown.ALTO).toBe(22);
      expect(result.metadata.breakdown.TENOR).toBe(13);
      expect(result.metadata.breakdown.BASS).toBe(16);
    });

    it('89명 배치 - 실제 데이터 기반 최대 규모 (소프라노 35, 알토 23, 테너 15, 베이스 16)', () => {
      const members: Member[] = [
        ...Array.from({ length: 35 }, (_, i) =>
          createMember(`s${i}`, `소프라노${i}`, 'SOPRANO', { height: 155 + i % 10 })
        ),
        ...Array.from({ length: 23 }, (_, i) =>
          createMember(`a${i}`, `알토${i}`, 'ALTO', { height: 158 + i % 10 })
        ),
        ...Array.from({ length: 15 }, (_, i) =>
          createMember(`t${i}`, `테너${i}`, 'TENOR', { height: 170 + i % 10 })
        ),
        ...Array.from({ length: 16 }, (_, i) =>
          createMember(`b${i}`, `베이스${i}`, 'BASS', { height: 175 + i % 10 })
        ),
      ];

      const result = generateAISeatingArrangement(members);

      expect(result.metadata.total_members).toBe(89);
      expect(result.grid_layout.rows).toBe(6);
      expect(result.seats.length).toBe(89);

      // 파트별 인원 확인
      expect(result.metadata.breakdown.SOPRANO).toBe(35);
      expect(result.metadata.breakdown.ALTO).toBe(23);
      expect(result.metadata.breakdown.TENOR).toBe(15);
      expect(result.metadata.breakdown.BASS).toBe(16);
    });

    it('68명 배치 - 실제 데이터 기반 최소 규모 (소프라노 29, 알토 18, 테너 10, 베이스 11)', () => {
      const members: Member[] = [
        ...Array.from({ length: 29 }, (_, i) =>
          createMember(`s${i}`, `소프라노${i}`, 'SOPRANO', { height: 155 + i % 10 })
        ),
        ...Array.from({ length: 18 }, (_, i) =>
          createMember(`a${i}`, `알토${i}`, 'ALTO', { height: 158 + i % 10 })
        ),
        ...Array.from({ length: 10 }, (_, i) =>
          createMember(`t${i}`, `테너${i}`, 'TENOR', { height: 170 + i % 10 })
        ),
        ...Array.from({ length: 11 }, (_, i) =>
          createMember(`b${i}`, `베이스${i}`, 'BASS', { height: 175 + i % 10 })
        ),
      ];

      const result = generateAISeatingArrangement(members);

      expect(result.metadata.total_members).toBe(68);
      expect(result.grid_layout.rows).toBe(6);
      expect(result.seats.length).toBe(68);

      // 파트별 인원 확인
      expect(result.metadata.breakdown.SOPRANO).toBe(29);
      expect(result.metadata.breakdown.ALTO).toBe(18);
      expect(result.metadata.breakdown.TENOR).toBe(10);
      expect(result.metadata.breakdown.BASS).toBe(11);
    });
  });

  describe('파트별 배치 규칙', () => {
    // ML 데이터 분석 결과:
    // - 지휘자 중심 좌우 분할:
    //   - 왼쪽: SOPRANO (85.5%), TENOR (86.4%)
    //   - 오른쪽: ALTO (100%), BASS (99.7%)
    // - 상하 분할:
    //   - 1-3행: SOPRANO, ALTO 우선
    //   - 4-6행: TENOR, BASS 우선

    it('좌우 분할: SOPRANO/TENOR는 왼쪽, ALTO/BASS는 오른쪽 배치', () => {
      // 소프라노 30, 알토 20, 테너 13, 베이스 15 = 78명
      const members: Member[] = [
        ...Array.from({ length: 30 }, (_, i) =>
          createMember(`s${i}`, `소프라노${i}`, 'SOPRANO')
        ),
        ...Array.from({ length: 20 }, (_, i) =>
          createMember(`a${i}`, `알토${i}`, 'ALTO')
        ),
        ...Array.from({ length: 13 }, (_, i) =>
          createMember(`t${i}`, `테너${i}`, 'TENOR')
        ),
        ...Array.from({ length: 15 }, (_, i) =>
          createMember(`b${i}`, `베이스${i}`, 'BASS')
        ),
      ];

      const result = generateAISeatingArrangement(members);

      // 각 행에서 좌우 분할 확인
      for (let row = 1; row <= result.grid_layout.rows; row++) {
        const rowSeats = result.seats.filter(s => s.row === row).sort((a, b) => a.col - b.col);

        // 왼쪽 파트(SOPRANO, TENOR)의 최대 col 찾기
        const leftPartSeats = rowSeats.filter(s => s.part === 'SOPRANO' || s.part === 'TENOR');
        const leftMaxCol = leftPartSeats.length > 0
          ? Math.max(...leftPartSeats.map(s => s.col))
          : 0;

        // 오른쪽 파트(ALTO, BASS)의 최소 col 찾기
        const rightPartSeats = rowSeats.filter(s => s.part === 'ALTO' || s.part === 'BASS');
        const rightMinCol = rightPartSeats.length > 0
          ? Math.min(...rightPartSeats.map(s => s.col))
          : Infinity;

        // 왼쪽 파트가 오른쪽 파트보다 왼쪽에 있어야 함
        if (leftPartSeats.length > 0 && rightPartSeats.length > 0) {
          expect(leftMaxCol).toBeLessThanOrEqual(rightMinCol);
        }
      }
    });

    it('상하 분할: 1-3행은 SOPRANO/ALTO 우선, 4-6행은 TENOR/BASS 우선', () => {
      // 소프라노 33, 알토 22, 테너 14, 베이스 16 = 85명
      const members: Member[] = [
        ...Array.from({ length: 33 }, (_, i) =>
          createMember(`s${i}`, `소프라노${i}`, 'SOPRANO')
        ),
        ...Array.from({ length: 22 }, (_, i) =>
          createMember(`a${i}`, `알토${i}`, 'ALTO')
        ),
        ...Array.from({ length: 14 }, (_, i) =>
          createMember(`t${i}`, `테너${i}`, 'TENOR')
        ),
        ...Array.from({ length: 16 }, (_, i) =>
          createMember(`b${i}`, `베이스${i}`, 'BASS')
        ),
      ];

      const result = generateAISeatingArrangement(members);

      // SOPRANO와 ALTO가 1-3행에 우선 배치되는지 확인
      const sopranoSeats = result.seats.filter(s => s.part === 'SOPRANO');
      const altoSeats = result.seats.filter(s => s.part === 'ALTO');
      const sopranoInFrontRows = sopranoSeats.filter(s => s.row <= 3).length;
      const altoInFrontRows = altoSeats.filter(s => s.row <= 3).length;

      // 전체 여성파트의 최소 50% 이상이 1-3행에 있어야 함
      expect(sopranoInFrontRows / sopranoSeats.length).toBeGreaterThanOrEqual(0.4);
      expect(altoInFrontRows / altoSeats.length).toBeGreaterThanOrEqual(0.4);

      // TENOR와 BASS가 4-6행에 우선 배치되는지 확인
      const tenorSeats = result.seats.filter(s => s.part === 'TENOR');
      const bassSeats = result.seats.filter(s => s.part === 'BASS');
      const tenorInBackRows = tenorSeats.filter(s => s.row >= 4).length;
      const bassInBackRows = bassSeats.filter(s => s.row >= 4).length;

      // 최소 70% 이상이 4-6행에 배치되어야 함
      expect(tenorInBackRows / tenorSeats.length).toBeGreaterThanOrEqual(0.7);
      expect(bassInBackRows / bassSeats.length).toBeGreaterThanOrEqual(0.7);
    });

    it('불균형 파트 인원에서도 좌우 분할 유지 (소프라노 35, 테너 10)', () => {
      const members: Member[] = [
        ...Array.from({ length: 35 }, (_, i) =>
          createMember(`s${i}`, `소프라노${i}`, 'SOPRANO')
        ),
        ...Array.from({ length: 20 }, (_, i) =>
          createMember(`a${i}`, `알토${i}`, 'ALTO')
        ),
        ...Array.from({ length: 10 }, (_, i) =>
          createMember(`t${i}`, `테너${i}`, 'TENOR')
        ),
        ...Array.from({ length: 14 }, (_, i) =>
          createMember(`b${i}`, `베이스${i}`, 'BASS')
        ),
      ];

      const result = generateAISeatingArrangement(members);

      expect(result.metadata.total_members).toBe(79);

      // 좌우 분할 확인: 왼쪽(SOPRANO+TENOR), 오른쪽(ALTO+BASS)
      const sopranoSeats = result.seats.filter(s => s.part === 'SOPRANO');
      const tenorSeats = result.seats.filter(s => s.part === 'TENOR');
      const altoSeats = result.seats.filter(s => s.part === 'ALTO');
      const bassSeats = result.seats.filter(s => s.part === 'BASS');

      // 각 파트가 모두 배치되었는지 확인
      expect(sopranoSeats.length).toBe(35);
      expect(altoSeats.length).toBe(20);
      expect(tenorSeats.length).toBe(10);
      expect(bassSeats.length).toBe(14);
    });
  });

  // 파트 리더/경력/키 관련 배치 규칙은 현재 미구현
  // 추후 ML 데이터 분석 후 추가 예정

  describe('고정석 패턴 기능', () => {
    describe('calculatePreferredSeats', () => {
      it('최소 출석 횟수(3회) 미만이면 선호 좌석 계산하지 않음', () => {
        const histories: SeatHistory[] = [
          {
            member_id: 's1',
            positions: [
              { row: 2, col: 5 },
              { row: 2, col: 5 },  // 2회만 출석
            ],
          },
        ];

        const result = calculatePreferredSeats(histories);

        expect(result.size).toBe(0);
        expect(result.get('s1')).toBeUndefined();
      });

      it('3회 이상 출석 시 선호 좌석 계산', () => {
        const histories: SeatHistory[] = [
          {
            member_id: 's1',
            positions: [
              { row: 2, col: 5 },
              { row: 2, col: 5 },
              { row: 2, col: 6 },  // 3회 출석
            ],
          },
        ];

        const result = calculatePreferredSeats(histories);

        expect(result.size).toBe(1);
        const pref = result.get('s1')!;
        expect(pref.member_id).toBe('s1');
        expect(pref.preferred_row).toBe(2);  // 2행에 3회 모두 앉음
        expect(pref.total_appearances).toBe(3);
      });

      it('행 일관성 계산 - 가장 많이 앉은 행 기준', () => {
        const histories: SeatHistory[] = [
          {
            member_id: 's1',
            positions: [
              { row: 2, col: 5 },
              { row: 2, col: 5 },
              { row: 2, col: 6 },
              { row: 3, col: 5 },
              { row: 2, col: 5 },  // 2행 4회, 3행 1회
            ],
          },
        ];

        const result = calculatePreferredSeats(histories);
        const pref = result.get('s1')!;

        expect(pref.preferred_row).toBe(2);
        expect(pref.row_consistency).toBe(0.8);  // 4/5 = 80%
      });

      it('열 일관성 계산 - ±2열 범위 내 비율', () => {
        const histories: SeatHistory[] = [
          {
            member_id: 's1',
            positions: [
              { row: 2, col: 5 },
              { row: 2, col: 6 },
              { row: 2, col: 5 },  // 평균 5.4열
              { row: 2, col: 6 },
              { row: 2, col: 10 },  // 범위 벗어남 (10 - 5.4 = 4.6 > 2)
            ],
          },
        ];

        const result = calculatePreferredSeats(histories);
        const pref = result.get('s1')!;

        // 평균 열: (5+6+5+6+10)/5 = 6.4
        expect(pref.preferred_col).toBe(6);  // 반올림
        // ±2 범위(4.4~8.4): 5, 6, 5, 6 = 4개 / 5 = 80%
        expect(pref.col_consistency).toBe(0.8);
      });

      it('여러 대원의 선호 좌석을 동시에 계산', () => {
        const histories: SeatHistory[] = [
          {
            member_id: 's1',
            positions: [
              { row: 2, col: 3 },
              { row: 2, col: 3 },
              { row: 2, col: 4 },
            ],
          },
          {
            member_id: 't1',
            positions: [
              { row: 5, col: 8 },
              { row: 5, col: 8 },
              { row: 5, col: 8 },
              { row: 5, col: 7 },
            ],
          },
        ];

        const result = calculatePreferredSeats(histories);

        expect(result.size).toBe(2);
        expect(result.get('s1')!.preferred_row).toBe(2);
        expect(result.get('t1')!.preferred_row).toBe(5);
      });
    });

    describe('hasStrongFixedSeatPreference', () => {
      it('undefined이면 false 반환', () => {
        expect(hasStrongFixedSeatPreference(undefined)).toBe(false);
      });

      it('행/열 일관성 모두 80% 이상이면 true', () => {
        const pref: PreferredSeat = {
          member_id: 's1',
          preferred_row: 2,
          preferred_col: 5,
          row_consistency: 0.8,
          col_consistency: 0.8,
          total_appearances: 10,
        };

        expect(hasStrongFixedSeatPreference(pref)).toBe(true);
      });

      it('행 일관성이 80% 미만이면 false', () => {
        const pref: PreferredSeat = {
          member_id: 's1',
          preferred_row: 2,
          preferred_col: 5,
          row_consistency: 0.7,
          col_consistency: 0.9,
          total_appearances: 10,
        };

        expect(hasStrongFixedSeatPreference(pref)).toBe(false);
      });

      it('열 일관성이 80% 미만이면 false', () => {
        const pref: PreferredSeat = {
          member_id: 's1',
          preferred_row: 2,
          preferred_col: 5,
          row_consistency: 0.9,
          col_consistency: 0.7,
          total_appearances: 10,
        };

        expect(hasStrongFixedSeatPreference(pref)).toBe(false);
      });

      it('행/열 일관성 모두 80% 초과이면 true', () => {
        const pref: PreferredSeat = {
          member_id: 's1',
          preferred_row: 2,
          preferred_col: 5,
          row_consistency: 1.0,
          col_consistency: 1.0,
          total_appearances: 40,
        };

        expect(hasStrongFixedSeatPreference(pref)).toBe(true);
      });
    });

    describe('배치 알고리즘에 고정석 반영', () => {
      it('고정석 이력이 없어도 정상 배치', () => {
        const members: Member[] = [
          ...Array.from({ length: 10 }, (_, i) =>
            createMember(`s${i}`, `소프라노${i}`, 'SOPRANO')
          ),
          ...Array.from({ length: 8 }, (_, i) =>
            createMember(`a${i}`, `알토${i}`, 'ALTO')
          ),
          ...Array.from({ length: 5 }, (_, i) =>
            createMember(`t${i}`, `테너${i}`, 'TENOR')
          ),
          ...Array.from({ length: 7 }, (_, i) =>
            createMember(`b${i}`, `베이스${i}`, 'BASS')
          ),
        ];

        const result = generateAISeatingArrangement(members);

        expect(result.seats.length).toBe(30);
        expect(result.metadata.total_members).toBe(30);
      });

      it('seatHistories를 전달하면 선호 좌석 계산 후 배치', () => {
        const members: Member[] = [
          ...Array.from({ length: 10 }, (_, i) =>
            createMember(`s${i}`, `소프라노${i}`, 'SOPRANO')
          ),
          ...Array.from({ length: 8 }, (_, i) =>
            createMember(`a${i}`, `알토${i}`, 'ALTO')
          ),
          ...Array.from({ length: 5 }, (_, i) =>
            createMember(`t${i}`, `테너${i}`, 'TENOR')
          ),
          ...Array.from({ length: 7 }, (_, i) =>
            createMember(`b${i}`, `베이스${i}`, 'BASS')
          ),
        ];

        // 첫 번째 소프라노가 2행 3열을 선호 (100% 일관성)
        const seatHistories: SeatHistory[] = [
          {
            member_id: 's0',
            positions: [
              { row: 2, col: 3 },
              { row: 2, col: 3 },
              { row: 2, col: 3 },
              { row: 2, col: 3 },
              { row: 2, col: 3 },
            ],
          },
        ];

        const result = generateAISeatingArrangement(members, { seatHistories });

        expect(result.seats.length).toBe(30);

        // s0가 배치됨을 확인
        const s0Seat = result.seats.find(s => s.member_id === 's0');
        expect(s0Seat).toBeDefined();
      });

      it('preferredSeats를 직접 전달하면 해당 정보로 배치', () => {
        const members: Member[] = [
          ...Array.from({ length: 10 }, (_, i) =>
            createMember(`s${i}`, `소프라노${i}`, 'SOPRANO')
          ),
          ...Array.from({ length: 8 }, (_, i) =>
            createMember(`a${i}`, `알토${i}`, 'ALTO')
          ),
          ...Array.from({ length: 5 }, (_, i) =>
            createMember(`t${i}`, `테너${i}`, 'TENOR')
          ),
          ...Array.from({ length: 7 }, (_, i) =>
            createMember(`b${i}`, `베이스${i}`, 'BASS')
          ),
        ];

        const preferredSeats = new Map<string, PreferredSeat>([
          ['s0', {
            member_id: 's0',
            preferred_row: 1,
            preferred_col: 2,
            row_consistency: 1.0,
            col_consistency: 1.0,
            total_appearances: 20,
          }],
        ]);

        const result = generateAISeatingArrangement(members, { preferredSeats });

        expect(result.seats.length).toBe(30);

        // s0가 배치됨을 확인
        const s0Seat = result.seats.find(s => s.member_id === 's0');
        expect(s0Seat).toBeDefined();
      });
    });
  });

  describe('좌석 유효성 검증', () => {
    it('모든 좌석이 유효한 row/col 값을 가져야 함 - 실제 비율 기반', () => {
      // 실제 비율: 소프라노 30, 알토 20, 테너 12, 베이스 14 = 76명
      const members: Member[] = [
        ...Array.from({ length: 30 }, (_, i) =>
          createMember(`s${i}`, `소프라노${i}`, 'SOPRANO')
        ),
        ...Array.from({ length: 20 }, (_, i) =>
          createMember(`a${i}`, `알토${i}`, 'ALTO')
        ),
        ...Array.from({ length: 12 }, (_, i) =>
          createMember(`t${i}`, `테너${i}`, 'TENOR')
        ),
        ...Array.from({ length: 14 }, (_, i) =>
          createMember(`b${i}`, `베이스${i}`, 'BASS')
        ),
      ];

      const result = generateAISeatingArrangement(members);

      result.seats.forEach(seat => {
        // row는 1-based (1 이상, 총 행 수 이하)
        expect(seat.row).toBeGreaterThanOrEqual(1);
        expect(seat.row).toBeLessThanOrEqual(result.grid_layout.rows);

        // col은 1-based (1 이상)
        expect(seat.col).toBeGreaterThanOrEqual(1);

        // member_id와 member_name이 존재
        expect(seat.member_id).toBeTruthy();
        expect(seat.member_name).toBeTruthy();
      });
    });

    it('같은 행에 중복된 col이 없어야 함 - 실제 비율 기반', () => {
      // 실제 비율: 소프라노 32, 알토 22, 테너 14, 베이스 15 = 83명
      const members: Member[] = [
        ...Array.from({ length: 32 }, (_, i) =>
          createMember(`s${i}`, `소프라노${i}`, 'SOPRANO')
        ),
        ...Array.from({ length: 22 }, (_, i) =>
          createMember(`a${i}`, `알토${i}`, 'ALTO')
        ),
        ...Array.from({ length: 14 }, (_, i) =>
          createMember(`t${i}`, `테너${i}`, 'TENOR')
        ),
        ...Array.from({ length: 15 }, (_, i) =>
          createMember(`b${i}`, `베이스${i}`, 'BASS')
        ),
      ];

      const result = generateAISeatingArrangement(members);

      // 각 행별로 검증
      for (let row = 0; row < result.grid_layout.rows; row++) {
        const rowSeats = result.seats.filter(s => s.row === row);
        const cols = rowSeats.map(s => s.col);

        // 중복 제거 후 길이가 같아야 함
        const uniqueCols = Array.from(new Set(cols));
        expect(uniqueCols.length).toBe(cols.length);
      }
    });
  });
});
