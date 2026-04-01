import { useArrangementStore } from '../arrangement-store';

describe('arrangement-store: 컴팩션 및 줄 축소', () => {
  beforeEach(() => {
    useArrangementStore.getState().clearArrangement();
    useArrangementStore.getState().clearHistory();
  });

  describe('compactAllRows', () => {
    it('빈 좌석을 앞으로 당겨 연속 배치한다', () => {
      const store = useArrangementStore.getState();

      // 그리드 설정: 1행 5석
      store.setGridLayout(
        { rows: 1, rowCapacities: [5], zigzagPattern: 'even' },
        { silent: true }
      );

      // 1, 3, 5열에만 멤버 배치 (2, 4열 비어있음)
      store.placeMember({ memberId: 'm1', memberName: '김소프', part: 'SOPRANO' }, 1, 1, { silent: true });
      store.placeMember({ memberId: 'm2', memberName: '이알토', part: 'ALTO' }, 1, 3, { silent: true });
      store.placeMember({ memberId: 'm3', memberName: '박테너', part: 'TENOR' }, 1, 5, { silent: true });

      store.compactAllRows({ silent: true });

      const { assignments } = useArrangementStore.getState();
      // 1, 2, 3열로 당겨짐
      expect(assignments['1-1']?.memberId).toBe('m1');
      expect(assignments['1-2']?.memberId).toBe('m2');
      expect(assignments['1-3']?.memberId).toBe('m3');
      // 4, 5열은 비어있음
      expect(assignments['1-4']).toBeUndefined();
      expect(assignments['1-5']).toBeUndefined();
    });

    it('이미 연속 배치된 경우 변경하지 않는다', () => {
      const store = useArrangementStore.getState();
      store.setGridLayout(
        { rows: 1, rowCapacities: [3], zigzagPattern: 'even' },
        { silent: true }
      );

      store.placeMember({ memberId: 'm1', memberName: '김소프', part: 'SOPRANO' }, 1, 1, { silent: true });
      store.placeMember({ memberId: 'm2', memberName: '이알토', part: 'ALTO' }, 1, 2, { silent: true });

      store.compactAllRows({ silent: true });

      const { assignments } = useArrangementStore.getState();
      expect(assignments['1-1']?.memberId).toBe('m1');
      expect(assignments['1-2']?.memberId).toBe('m2');
    });

    it('여러 행에 대해 각각 컴팩션한다', () => {
      const store = useArrangementStore.getState();
      store.setGridLayout(
        { rows: 2, rowCapacities: [4, 4], zigzagPattern: 'even' },
        { silent: true }
      );

      // 1행: 2, 4열에 배치
      store.placeMember({ memberId: 'm1', memberName: '김소프', part: 'SOPRANO' }, 1, 2, { silent: true });
      store.placeMember({ memberId: 'm2', memberName: '이알토', part: 'ALTO' }, 1, 4, { silent: true });
      // 2행: 3열에만 배치
      store.placeMember({ memberId: 'm3', memberName: '박테너', part: 'TENOR' }, 2, 3, { silent: true });

      store.compactAllRows({ silent: true });

      const { assignments } = useArrangementStore.getState();
      // 1행: 1, 2열로
      expect(assignments['1-1']?.memberId).toBe('m1');
      expect(assignments['1-2']?.memberId).toBe('m2');
      // 2행: 1열로
      expect(assignments['2-1']?.memberId).toBe('m3');
    });
  });

  describe('shrinkRowCapacitiesToFit', () => {
    it('rowCapacities를 실제 배치된 멤버 수로 축소한다', () => {
      const store = useArrangementStore.getState();
      store.setGridLayout(
        { rows: 2, rowCapacities: [10, 8], zigzagPattern: 'even' },
        { silent: true }
      );

      // 1행에 3명, 2행에 2명 배치
      store.placeMember({ memberId: 'm1', memberName: '김소프', part: 'SOPRANO' }, 1, 1, { silent: true });
      store.placeMember({ memberId: 'm2', memberName: '이알토', part: 'ALTO' }, 1, 2, { silent: true });
      store.placeMember({ memberId: 'm3', memberName: '박테너', part: 'TENOR' }, 1, 3, { silent: true });
      store.placeMember({ memberId: 'm4', memberName: '최베이', part: 'BASS' }, 2, 1, { silent: true });
      store.placeMember({ memberId: 'm5', memberName: '정소프', part: 'SOPRANO' }, 2, 2, { silent: true });

      store.shrinkRowCapacitiesToFit({ silent: true });

      const { gridLayout } = useArrangementStore.getState();
      expect(gridLayout?.rowCapacities).toEqual([3, 2]);
    });

    it('멤버가 없는 행은 0으로 축소한다', () => {
      const store = useArrangementStore.getState();
      store.setGridLayout(
        { rows: 2, rowCapacities: [5, 5], zigzagPattern: 'even' },
        { silent: true }
      );

      // 1행에만 멤버 배치
      store.placeMember({ memberId: 'm1', memberName: '김소프', part: 'SOPRANO' }, 1, 1, { silent: true });

      store.shrinkRowCapacitiesToFit({ silent: true });

      const { gridLayout } = useArrangementStore.getState();
      expect(gridLayout?.rowCapacities).toEqual([1, 0]);
    });

    it('이미 딱 맞는 경우 변경하지 않는다', () => {
      const store = useArrangementStore.getState();
      store.setGridLayout(
        { rows: 1, rowCapacities: [2], zigzagPattern: 'even' },
        { silent: true }
      );

      store.placeMember({ memberId: 'm1', memberName: '김소프', part: 'SOPRANO' }, 1, 1, { silent: true });
      store.placeMember({ memberId: 'm2', memberName: '이알토', part: 'ALTO' }, 1, 2, { silent: true });

      const beforeLayout = useArrangementStore.getState().gridLayout;
      store.shrinkRowCapacitiesToFit({ silent: true });
      const afterLayout = useArrangementStore.getState().gridLayout;

      // 참조가 동일해야 함 (상태 변경 없음)
      expect(afterLayout).toBe(beforeLayout);
    });
  });
});
