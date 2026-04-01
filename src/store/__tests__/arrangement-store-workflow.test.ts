import { useArrangementStore } from '../arrangement-store';
import type { WorkflowStep } from '../arrangement-store';

describe('arrangement-store: 워크플로우', () => {
  // 각 테스트 전 스토어 초기화
  beforeEach(() => {
    useArrangementStore.getState().resetWorkflow();
    useArrangementStore.getState().clearArrangement();
  });

  describe('초기 상태', () => {
    it('currentStep은 1이다', () => {
      expect(useArrangementStore.getState().workflow.currentStep).toBe(1);
    });

    it('completedSteps는 비어있다', () => {
      expect(useArrangementStore.getState().workflow.completedSteps.size).toBe(0);
    });

    it('위자드 모드가 활성화되어 있다', () => {
      expect(useArrangementStore.getState().workflow.isWizardMode).toBe(true);
    });

    it('첫 번째 섹션만 펼쳐져 있다', () => {
      const { expandedSections } = useArrangementStore.getState().workflow;
      expect(expandedSections.has(1)).toBe(true);
      expect(expandedSections.size).toBe(1);
    });
  });

  describe('goToStep', () => {
    it('지정한 단계로 이동한다', () => {
      useArrangementStore.getState().goToStep(3);
      expect(useArrangementStore.getState().workflow.currentStep).toBe(3);
    });

    it('완료된 단계로 돌아가면 완료 상태를 해제한다', () => {
      const { completeStep, goToStep } = useArrangementStore.getState();
      completeStep(1);
      expect(useArrangementStore.getState().workflow.completedSteps.has(1)).toBe(true);

      goToStep(1);
      expect(useArrangementStore.getState().workflow.completedSteps.has(1)).toBe(false);
    });

    it('전체 완료(7단계) 상태에서는 완료 해제하지 않는다', () => {
      const store = useArrangementStore.getState();
      // 모든 단계 완료 (1~7)
      for (let s = 1; s <= 7; s++) {
        store.completeStep(s as WorkflowStep);
      }

      useArrangementStore.getState().goToStep(3);
      expect(useArrangementStore.getState().workflow.completedSteps.has(3)).toBe(true);
    });

    it('위자드 모드에서 이동하면 해당 섹션만 펼침', () => {
      useArrangementStore.getState().goToStep(4);
      const { expandedSections } = useArrangementStore.getState().workflow;
      expect(expandedSections.has(4)).toBe(true);
      expect(expandedSections.has(1)).toBe(false);
    });
  });

  describe('nextStep / prevStep', () => {
    it('nextStep은 다음 단계로 이동한다', () => {
      useArrangementStore.getState().nextStep();
      expect(useArrangementStore.getState().workflow.currentStep).toBe(2);
    });

    it('7단계에서 nextStep은 아무 일도 안 한다', () => {
      useArrangementStore.getState().goToStep(7);
      useArrangementStore.getState().nextStep();
      expect(useArrangementStore.getState().workflow.currentStep).toBe(7);
    });

    it('prevStep은 이전 단계로 이동한다', () => {
      useArrangementStore.getState().goToStep(3);
      useArrangementStore.getState().prevStep();
      expect(useArrangementStore.getState().workflow.currentStep).toBe(2);
    });

    it('1단계에서 prevStep은 아무 일도 안 한다', () => {
      useArrangementStore.getState().prevStep();
      expect(useArrangementStore.getState().workflow.currentStep).toBe(1);
    });
  });

  describe('completeStep', () => {
    it('단계를 완료로 표시한다', () => {
      useArrangementStore.getState().completeStep(1);
      expect(useArrangementStore.getState().workflow.completedSteps.has(1)).toBe(true);
    });

    it('완료 후 다음 단계로 자동 이동한다', () => {
      useArrangementStore.getState().completeStep(1);
      expect(useArrangementStore.getState().workflow.currentStep).toBe(2);
    });

    it('7단계 완료 시 currentStep은 7을 유지한다', () => {
      useArrangementStore.getState().goToStep(7);
      useArrangementStore.getState().completeStep(7);
      expect(useArrangementStore.getState().workflow.currentStep).toBe(7);
    });
  });

  describe('uncompleteStep', () => {
    it('단계 완료를 해제한다', () => {
      useArrangementStore.getState().completeStep(1);
      useArrangementStore.getState().uncompleteStep(1);
      expect(useArrangementStore.getState().workflow.completedSteps.has(1)).toBe(false);
    });
  });

  describe('invalidateFromCurrentStep', () => {
    it('현재 단계 이후의 완료를 모두 해제한다', () => {
      const store = useArrangementStore.getState();
      store.completeStep(1);
      store.completeStep(2);
      store.completeStep(3);

      // currentStep은 4 (completeStep(3) 후 자동 이동)
      // 4단계 이후를 해제하지만, 1-3은 유지해야 함
      useArrangementStore.getState().invalidateFromCurrentStep();

      const { completedSteps } = useArrangementStore.getState().workflow;
      expect(completedSteps.has(1)).toBe(true);
      expect(completedSteps.has(2)).toBe(true);
      expect(completedSteps.has(3)).toBe(true);
    });

    it('이후 단계의 완료만 해제한다', () => {
      const store = useArrangementStore.getState();
      store.completeStep(1);
      store.completeStep(2);
      store.completeStep(3);
      store.completeStep(4);
      store.completeStep(5);

      // goToStep(2)로 이동 후 invalidate
      useArrangementStore.getState().goToStep(2);
      useArrangementStore.getState().invalidateFromCurrentStep();

      const { completedSteps } = useArrangementStore.getState().workflow;
      expect(completedSteps.has(1)).toBe(true);
      // 2는 goToStep에서 이미 해제됨
      expect(completedSteps.has(3)).toBe(false);
      expect(completedSteps.has(4)).toBe(false);
      expect(completedSteps.has(5)).toBe(false);
    });
  });

  describe('canAccessStep', () => {
    it('위자드 모드에서 1단계는 항상 접근 가능', () => {
      expect(useArrangementStore.getState().canAccessStep(1)).toBe(true);
    });

    it('위자드 모드에서 이전 단계 미완료 시 접근 불가', () => {
      expect(useArrangementStore.getState().canAccessStep(3)).toBe(false);
    });

    it('위자드 모드에서 이전 단계 완료 시 접근 가능', () => {
      useArrangementStore.getState().completeStep(1);
      expect(useArrangementStore.getState().canAccessStep(2)).toBe(true);
    });

    it('자유 모드에서는 모든 단계 접근 가능', () => {
      useArrangementStore.getState().toggleWizardMode(); // 자유 모드로 전환
      expect(useArrangementStore.getState().canAccessStep(5)).toBe(true);
    });
  });

  describe('toggleWizardMode', () => {
    it('위자드 모드를 토글한다', () => {
      expect(useArrangementStore.getState().workflow.isWizardMode).toBe(true);
      useArrangementStore.getState().toggleWizardMode();
      expect(useArrangementStore.getState().workflow.isWizardMode).toBe(false);
    });

    it('자유 모드 전환 시 모든 섹션을 펼친다', () => {
      useArrangementStore.getState().toggleWizardMode();
      const { expandedSections } = useArrangementStore.getState().workflow;
      expect(expandedSections.size).toBe(6);
    });

    it('위자드 모드 전환 시 현재 단계만 펼친다', () => {
      useArrangementStore.getState().goToStep(3);
      useArrangementStore.getState().toggleWizardMode(); // 자유 모드로
      useArrangementStore.getState().toggleWizardMode(); // 다시 위자드 모드로

      const { expandedSections, currentStep } = useArrangementStore.getState().workflow;
      expect(expandedSections.has(currentStep)).toBe(true);
      expect(expandedSections.size).toBe(1);
    });
  });

  describe('restoreWorkflowState', () => {
    it('워크플로우 상태를 복원한다', () => {
      useArrangementStore.getState().restoreWorkflowState({
        currentStep: 4,
        completedSteps: new Set<WorkflowStep>([1, 2, 3]),
        isWizardMode: false,
        expandedSections: new Set<WorkflowStep>([1, 2, 3, 4]),
      });

      const { workflow } = useArrangementStore.getState();
      expect(workflow.currentStep).toBe(4);
      expect(workflow.completedSteps.has(3)).toBe(true);
      expect(workflow.isWizardMode).toBe(false);
    });

    it('8단계 이상 데이터를 7로 클램프한다', () => {
      useArrangementStore.getState().restoreWorkflowState({
        currentStep: 8 as WorkflowStep,
        completedSteps: new Set<WorkflowStep>([1, 2, 3, 8 as WorkflowStep]),
        isWizardMode: true,
        expandedSections: new Set<WorkflowStep>([8 as WorkflowStep]),
      });

      const { workflow } = useArrangementStore.getState();
      expect(workflow.currentStep).toBe(7);
      expect(workflow.completedSteps.has(8 as WorkflowStep)).toBe(false);
    });
  });

  describe('resetWorkflow', () => {
    it('모든 워크플로우 상태를 초기화한다', () => {
      const store = useArrangementStore.getState();
      store.completeStep(1);
      store.completeStep(2);
      store.toggleWizardMode();

      store.resetWorkflow();

      const { workflow } = useArrangementStore.getState();
      expect(workflow.currentStep).toBe(1);
      expect(workflow.completedSteps.size).toBe(0);
      expect(workflow.isWizardMode).toBe(true);
    });
  });

  describe('expandAllSections / collapseAllSections', () => {
    it('모든 섹션을 펼친다', () => {
      useArrangementStore.getState().expandAllSections();
      expect(useArrangementStore.getState().workflow.expandedSections.size).toBe(6);
    });

    it('모든 섹션을 접는다', () => {
      useArrangementStore.getState().expandAllSections();
      useArrangementStore.getState().collapseAllSections();
      expect(useArrangementStore.getState().workflow.expandedSections.size).toBe(0);
    });
  });

  describe('toggleSection', () => {
    it('섹션을 펼치고 접는다', () => {
      useArrangementStore.getState().toggleSection(3);
      expect(useArrangementStore.getState().workflow.expandedSections.has(3)).toBe(true);

      useArrangementStore.getState().toggleSection(3);
      expect(useArrangementStore.getState().workflow.expandedSections.has(3)).toBe(false);
    });
  });
});
