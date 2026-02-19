import { useArrangementDraftStore } from '../arrangement-draft-store';
import type { ArrangementDraftData, SerializableWorkflowState } from '../arrangement-draft-store';
import type { WorkflowStep } from '../arrangement-store';

// 테스트 데이터 생성 헬퍼
function createWorkflowState(overrides?: Partial<SerializableWorkflowState>): SerializableWorkflowState {
  return {
    currentStep: 3,
    completedSteps: [1, 2],
    isWizardMode: true,
    expandedSections: [3],
    ...overrides,
  };
}

function createDraftData(arrangementId: string, overrides?: Partial<ArrangementDraftData>) {
  return {
    workflow: createWorkflowState(),
    gridLayout: { rows: 6, rowCapacities: [15, 15, 15, 15, 13, 11], rowOffsets: {}, isManual: false },
    assignments: {
      '1-1': {
        memberId: 'm1',
        memberName: '홍길동',
        part: 'SOPRANO' as const,
        row: 1,
        col: 1,
      },
    },
    ...overrides,
  };
}

describe('arrangement-draft-store', () => {
  beforeEach(() => {
    // 스토어 초기화
    useArrangementDraftStore.setState({ drafts: {} });
  });

  describe('saveDraft / loadDraft', () => {
    it('Draft를 저장하고 로드한다', () => {
      const store = useArrangementDraftStore.getState();
      store.saveDraft('arr-1', createDraftData('arr-1'));

      const draft = store.loadDraft('arr-1');
      expect(draft).not.toBeNull();
      expect(draft!.arrangementId).toBe('arr-1');
      expect(draft!.workflow.currentStep).toBe(3);
      expect(Object.keys(draft!.assignments)).toHaveLength(1);
    });

    it('없는 Draft는 null을 반환한다', () => {
      const draft = useArrangementDraftStore.getState().loadDraft('nonexistent');
      expect(draft).toBeNull();
    });

    it('savedAt 타임스탬프를 자동 설정한다', () => {
      const before = Date.now();
      useArrangementDraftStore.getState().saveDraft('arr-1', createDraftData('arr-1'));

      const draft = useArrangementDraftStore.getState().loadDraft('arr-1');
      const savedAt = new Date(draft!.savedAt).getTime();
      expect(savedAt).toBeGreaterThanOrEqual(before);
      expect(savedAt).toBeLessThanOrEqual(Date.now());
    });

    it('version을 1로 설정한다', () => {
      useArrangementDraftStore.getState().saveDraft('arr-1', createDraftData('arr-1'));
      const draft = useArrangementDraftStore.getState().loadDraft('arr-1');
      expect(draft!.version).toBe(1);
    });
  });

  describe('만료 처리', () => {
    it('7일 이전 Draft를 만료 처리한다', () => {
      // 8일 전 타임스탬프를 가진 Draft를 직접 설정
      const oldDate = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();

      useArrangementDraftStore.setState({
        drafts: {
          'arr-old': {
            arrangementId: 'arr-old',
            savedAt: oldDate,
            version: 1,
            workflow: createWorkflowState(),
            gridLayout: null,
            assignments: {},
          },
        },
      });

      const draft = useArrangementDraftStore.getState().loadDraft('arr-old');
      expect(draft).toBeNull();
    });

    it('6일 이내 Draft는 유효하다', () => {
      const recentDate = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString();

      useArrangementDraftStore.setState({
        drafts: {
          'arr-recent': {
            arrangementId: 'arr-recent',
            savedAt: recentDate,
            version: 1,
            workflow: createWorkflowState(),
            gridLayout: null,
            assignments: {},
          },
        },
      });

      const draft = useArrangementDraftStore.getState().loadDraft('arr-recent');
      expect(draft).not.toBeNull();
    });
  });

  describe('hasDraft', () => {
    it('Draft가 있으면 true를 반환한다', () => {
      useArrangementDraftStore.getState().saveDraft('arr-1', createDraftData('arr-1'));
      expect(useArrangementDraftStore.getState().hasDraft('arr-1')).toBe(true);
    });

    it('Draft가 없으면 false를 반환한다', () => {
      expect(useArrangementDraftStore.getState().hasDraft('nonexistent')).toBe(false);
    });
  });

  describe('deleteDraft', () => {
    it('Draft를 삭제한다', () => {
      useArrangementDraftStore.getState().saveDraft('arr-1', createDraftData('arr-1'));
      useArrangementDraftStore.getState().deleteDraft('arr-1');
      expect(useArrangementDraftStore.getState().hasDraft('arr-1')).toBe(false);
    });
  });

  describe('clearExpiredDrafts', () => {
    it('만료된 Draft만 제거하고 개수를 반환한다', () => {
      const oldDate = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
      const recentDate = new Date().toISOString();

      useArrangementDraftStore.setState({
        drafts: {
          'arr-old': {
            arrangementId: 'arr-old',
            savedAt: oldDate,
            version: 1,
            workflow: createWorkflowState(),
            gridLayout: null,
            assignments: {},
          },
          'arr-recent': {
            arrangementId: 'arr-recent',
            savedAt: recentDate,
            version: 1,
            workflow: createWorkflowState(),
            gridLayout: null,
            assignments: {},
          },
        },
      });

      const cleared = useArrangementDraftStore.getState().clearExpiredDrafts();
      expect(cleared).toBe(1);
      expect(useArrangementDraftStore.getState().hasDraft('arr-recent')).toBe(true);
    });
  });

  describe('getDraftMeta', () => {
    it('Draft 메타데이터를 반환한다', () => {
      useArrangementDraftStore.getState().saveDraft('arr-1', createDraftData('arr-1'));

      const meta = useArrangementDraftStore.getState().getDraftMeta('arr-1');
      expect(meta).not.toBeNull();
      expect(meta!.currentStep).toBe(3);
      expect(meta!.assignedCount).toBe(1);
      expect(meta!.savedAt).toBeInstanceOf(Date);
    });

    it('없는 Draft는 null을 반환한다', () => {
      const meta = useArrangementDraftStore.getState().getDraftMeta('nonexistent');
      expect(meta).toBeNull();
    });
  });

  describe('7→6단계 호환성', () => {
    it('currentStep이 7이면 6으로 클램프한다', () => {
      const recentDate = new Date().toISOString();

      useArrangementDraftStore.setState({
        drafts: {
          'arr-old-format': {
            arrangementId: 'arr-old-format',
            savedAt: recentDate,
            version: 1,
            workflow: {
              currentStep: 7 as WorkflowStep,
              completedSteps: [1, 2, 3, 7 as WorkflowStep],
              isWizardMode: true,
              expandedSections: [7 as WorkflowStep],
            },
            gridLayout: null,
            assignments: {},
          },
        },
      });

      const draft = useArrangementDraftStore.getState().loadDraft('arr-old-format');
      expect(draft).not.toBeNull();
      expect(draft!.workflow.currentStep).toBe(6);
      expect(draft!.workflow.completedSteps).not.toContain(7);
      expect(draft!.workflow.expandedSections).not.toContain(7);
    });

    it('6 이하 데이터는 변경하지 않는다', () => {
      useArrangementDraftStore.getState().saveDraft('arr-1', createDraftData('arr-1'));

      const draft = useArrangementDraftStore.getState().loadDraft('arr-1');
      expect(draft!.workflow.currentStep).toBe(3);
      expect(draft!.workflow.completedSteps).toEqual([1, 2]);
    });
  });
});
