/**
 * 워크플로우 관련 컴포넌트 모음
 *
 * Progressive Disclosure 전략을 적용한 7단계 자리배치 워크플로우
 *
 * 단계:
 * 1. AI 추천 분배 - 출석 인원 기반 그리드 설정 추천
 * 2. 좌석 그리드 조정 - 줄 수, 줄별 인원 수 수동 조정
 * 3. AI 자동배치 - 파트, 키, 경력 기반 좌석 배치
 * 4. 수동 배치 조정 - Click-to-click 미세 조정
 * 5. 행별 Offset 조정 - 지휘자 시야 확보를 위한 줄 위치 조정
 * 6. 줄반장 지정 - 각 줄 대표 지정
 * 7. 자리배치표 공유 - 저장 및 공유
 */

export { default as WorkflowProgress } from '../WorkflowProgress';
export { default as WorkflowSection } from '../WorkflowSection';
export { default as WorkflowModeToggle } from '../WorkflowModeToggle';
export { default as WorkflowPanel } from '../WorkflowPanel';
export { default as RowOffsetAdjuster } from '../RowOffsetAdjuster';

// 타입 및 상수 re-export
export {
  type WorkflowStep,
  type WorkflowStepMeta,
  type WorkflowState,
  WORKFLOW_STEPS,
} from '@/store/arrangement-store';

// 훅 re-export
export {
  useWorkflowAutoAdvance,
  useCompleteCurrentStep,
  useSkipStep,
} from '@/hooks/useWorkflowAutoAdvance';
