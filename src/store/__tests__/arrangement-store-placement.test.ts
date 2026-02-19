import { useArrangementStore } from '../arrangement-store';
import type { SeatAssignment } from '../arrangement-store';

describe('arrangement-store: 배치', () => {
  beforeEach(() => {
    useArrangementStore.getState().clearArrangement();
    useArrangementStore.getState().clearHistory();
  });

  describe('placeMember', () => {
    it('멤버를 좌석에 배치한다', () => {
      useArrangementStore.getState().placeMember(
        { memberId: 'm1', memberName: '홍길동', part: 'SOPRANO' },
        1,
        1,
        { silent: true }
      );

      const { assignments } = useArrangementStore.getState();
      expect(assignments['1-1']).toBeDefined();
      expect(assignments['1-1'].memberId).toBe('m1');
      expect(assignments['1-1'].row).toBe(1);
      expect(assignments['1-1'].col).toBe(1);
    });

    it('같은 위치에 다시 배치하면 덮어쓴다', () => {
      const store = useArrangementStore.getState();
      store.placeMember({ memberId: 'm1', memberName: '홍길동', part: 'SOPRANO' }, 1, 1, { silent: true });
      store.placeMember({ memberId: 'm2', memberName: '김철수', part: 'ALTO' }, 1, 1, { silent: true });

      expect(useArrangementStore.getState().assignments['1-1'].memberId).toBe('m2');
    });
  });

  describe('removeMember', () => {
    it('좌석에서 멤버를 제거한다', () => {
      const store = useArrangementStore.getState();
      store.placeMember({ memberId: 'm1', memberName: '홍길동', part: 'SOPRANO' }, 1, 1, { silent: true });
      store.removeMember(1, 1, { silent: true });

      expect(useArrangementStore.getState().assignments['1-1']).toBeUndefined();
    });
  });

  describe('moveMember', () => {
    it('멤버를 다른 좌석으로 이동한다', () => {
      const store = useArrangementStore.getState();
      store.placeMember({ memberId: 'm1', memberName: '홍길동', part: 'SOPRANO' }, 1, 1, { silent: true });
      store.moveMember(1, 1, 2, 3, { silent: true });

      const { assignments } = useArrangementStore.getState();
      expect(assignments['1-1']).toBeUndefined();
      expect(assignments['2-3']).toBeDefined();
      expect(assignments['2-3'].memberId).toBe('m1');
      expect(assignments['2-3'].row).toBe(2);
      expect(assignments['2-3'].col).toBe(3);
    });

    it('이동 대상에 멤버가 있으면 교환한다', () => {
      const store = useArrangementStore.getState();
      store.placeMember({ memberId: 'm1', memberName: '홍길동', part: 'SOPRANO' }, 1, 1, { silent: true });
      store.placeMember({ memberId: 'm2', memberName: '김철수', part: 'ALTO' }, 2, 3, { silent: true });
      store.moveMember(1, 1, 2, 3, { silent: true });

      const { assignments } = useArrangementStore.getState();
      expect(assignments['2-3'].memberId).toBe('m1');
      expect(assignments['1-1'].memberId).toBe('m2');
    });
  });

  describe('setAssignments', () => {
    it('배치 전체를 교체한다', () => {
      const assignments: SeatAssignment[] = [
        { memberId: 'm1', memberName: '홍길동', part: 'SOPRANO', row: 1, col: 1 },
        { memberId: 'm2', memberName: '김철수', part: 'ALTO', row: 1, col: 2 },
      ];

      useArrangementStore.getState().setAssignments(assignments, { silent: true });

      const state = useArrangementStore.getState();
      expect(Object.keys(state.assignments)).toHaveLength(2);
      expect(state.assignments['1-1'].memberId).toBe('m1');
      expect(state.assignments['1-2'].memberId).toBe('m2');
    });
  });

  describe('clearArrangement', () => {
    it('모든 배치를 초기화한다', () => {
      useArrangementStore.getState().placeMember(
        { memberId: 'm1', memberName: '홍길동', part: 'SOPRANO' },
        1,
        1,
        { silent: true }
      );
      useArrangementStore.getState().clearArrangement();

      expect(Object.keys(useArrangementStore.getState().assignments)).toHaveLength(0);
    });
  });

  describe('undo / redo', () => {
    it('배치 후 undo하면 이전 상태로 돌아간다', () => {
      useArrangementStore.getState().placeMember(
        { memberId: 'm1', memberName: '홍길동', part: 'SOPRANO' },
        1,
        1,
        { silent: true }
      );

      expect(useArrangementStore.getState().canUndo()).toBe(true);
      useArrangementStore.getState().undo();

      expect(Object.keys(useArrangementStore.getState().assignments)).toHaveLength(0);
    });

    it('undo 후 redo하면 복원된다', () => {
      useArrangementStore.getState().placeMember(
        { memberId: 'm1', memberName: '홍길동', part: 'SOPRANO' },
        1,
        1,
        { silent: true }
      );
      useArrangementStore.getState().undo();

      expect(useArrangementStore.getState().canRedo()).toBe(true);
      useArrangementStore.getState().redo();

      expect(useArrangementStore.getState().assignments['1-1']).toBeDefined();
    });

    it('새로운 액션 후 redo 히스토리가 사라진다', () => {
      useArrangementStore.getState().placeMember(
        { memberId: 'm1', memberName: '홍길동', part: 'SOPRANO' },
        1,
        1,
        { silent: true }
      );
      useArrangementStore.getState().undo();
      useArrangementStore.getState().placeMember(
        { memberId: 'm2', memberName: '김철수', part: 'ALTO' },
        2,
        2,
        { silent: true }
      );

      expect(useArrangementStore.getState().canRedo()).toBe(false);
    });

    it('히스토리가 없을 때 undo/redo는 아무 일도 안 한다', () => {
      useArrangementStore.getState().clearHistory();
      expect(useArrangementStore.getState().canUndo()).toBe(false);
      expect(useArrangementStore.getState().canRedo()).toBe(false);

      // 에러 없이 실행
      useArrangementStore.getState().undo();
      useArrangementStore.getState().redo();
    });
  });

  describe('handleSeatClick', () => {
    it('사이드바에서 선택 후 좌석 클릭 시 배치한다', () => {
      const store = useArrangementStore.getState();
      store.selectMemberFromSidebar('m1', '홍길동', 'SOPRANO');
      store.handleSeatClick(1, 1);

      expect(useArrangementStore.getState().assignments['1-1']).toBeDefined();
      expect(useArrangementStore.getState().assignments['1-1'].memberId).toBe('m1');
    });

    it('그리드에서 선택 후 빈 좌석 클릭 시 이동한다', () => {
      const store = useArrangementStore.getState();
      store.placeMember({ memberId: 'm1', memberName: '홍길동', part: 'SOPRANO' }, 1, 1, { silent: true });
      store.selectMemberFromGrid(1, 1);
      store.handleSeatClick(2, 2);

      const { assignments } = useArrangementStore.getState();
      expect(assignments['1-1']).toBeUndefined();
      expect(assignments['2-2'].memberId).toBe('m1');
    });
  });

  describe('selection', () => {
    it('clearSelection이 선택 상태를 초기화한다', () => {
      useArrangementStore.getState().selectMemberFromSidebar('m1', '홍길동', 'SOPRANO');
      useArrangementStore.getState().clearSelection();

      const state = useArrangementStore.getState();
      expect(state.selectedMemberId).toBeNull();
      expect(state.selectedSource).toBeNull();
    });
  });
});
