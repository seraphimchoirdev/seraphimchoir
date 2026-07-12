'use client';

import { useEffect, useRef, useState } from 'react';

import type { ArrangementWithSeats } from '@/hooks/useArrangements';

import { createLogger } from '@/lib/logger';
import { recommendRowDistribution } from '@/lib/row-distribution-recommender';
import { showSuccess } from '@/lib/toast';
import { calculateGridLayoutFromSeats } from '@/lib/utils/gridUtils';

import { WorkflowStep, useArrangementStore } from '@/store/arrangement-store';

import { DEFAULT_GRID_LAYOUT, GridLayout } from '@/types/grid';

const logger = createLogger({ prefix: 'ArrangementInitialization' });

interface UseArrangementInitializationParams {
  /** 배치표 ID (URL 파라미터) */
  id: string;
  arrangement: ArrangementWithSeats | undefined;
  /** 해당 날짜 출석 데이터 — undefined면 아직 로딩 중 (초기화 대기 가드) */
  attendances: readonly unknown[] | undefined;
  /** 멤버 등단 가능 여부 판정 (출석 레코드 없으면 가능) */
  isServiceAvailable: (memberId: string) => boolean;
  /** 등단 가능 인원수 (정대원 + 게스트) — AI 추천 분배 기준 */
  totalMembers: number;
  /** DB에 저장된 좌석이 있는 기존 배치표인지 */
  dbHasData: boolean;
  /** Draft 복원 다이얼로그 표시 중이면 초기화 대기 */
  showRestoreDialog: boolean;
  /** Draft에서 복원한 경우 DB 초기화 건너뜀 */
  skipInitialization: boolean;
  arrangementDate: string | undefined;
}

/**
 * 배치표 편집 페이지 초기화 로직 (코드 리뷰 B10-2)
 *
 * arrangements/[id]/page.tsx에서 기계적으로 추출한 3개 효과:
 * 1. 배치표 ID 변경 감지 → 스토어/ref 초기화
 * 2. DB 좌석·그리드·워크플로우 상태 초기 로드 (최초 1회, Draft 복원 시 스킵)
 * 3. 새 배치표 AI 추천 분배 자동 적용 (totalMembers 변경 시 재적용)
 */
export function useArrangementInitialization({
  id,
  arrangement,
  attendances,
  isServiceAvailable,
  totalMembers,
  dbHasData,
  showRestoreDialog,
  skipInitialization,
  arrangementDate,
}: UseArrangementInitializationParams) {
  const {
    setAssignments,
    setGridLayout,
    gridLayout,
    clearArrangement,
    clearHistory,
    compactAllRows,
    shrinkRowCapacitiesToFit,
    resetWorkflow,
    restoreWorkflowState,
  } = useArrangementStore();

  // 초기 로드 완료 추적 (compactAllRows 중복 실행 방지)
  const initialLoadDoneRef = useRef(false);
  // AI 추천 분배 useEffect 트리거용 (ref 변경은 re-render를 유발하지 않으므로 state로 별도 관리)
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  // 새 배치표 AI 추천 분배 토스트 중복 방지
  const autoDistributionToastShownRef = useRef(false);

  // 배치표 ID 변경 감지 (이전 배치표 → 다른 배치표 이동 시 스토어 잔존 데이터 초기화)
  const prevArrangementIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (prevArrangementIdRef.current !== null && prevArrangementIdRef.current !== id) {
      // ID가 변경됨 → 스토어 및 ref 초기화
      clearArrangement();
      clearHistory();
      resetWorkflow();
      initialLoadDoneRef.current = false;
      setInitialLoadDone(false);
      autoDistributionToastShownRef.current = false;
    }
    prevArrangementIdRef.current = id;
  }, [id, clearArrangement, clearHistory, resetWorkflow]);

  // Initialize store with fetched seats and grid layout
  // attendances가 로드된 후에만 좌석을 설정하여 등단 불가능 멤버 필터링
  // ⭐ 초기 로드 시에만 실행 (긴급 등단 불가 처리 후 재실행 방지)
  // ⭐ Draft 복원 시에는 건너뜀 (skipInitialization)
  useEffect(() => {
    // Draft 복원 다이얼로그가 표시 중이면 대기
    if (showRestoreDialog) return;

    // Draft에서 복원한 경우 건너뜀
    if (skipInitialization && initialLoadDoneRef.current === false) {
      initialLoadDoneRef.current = true;
      setInitialLoadDone(true);
      logger.debug('Skipping initialization - restored from draft');
      return;
    }

    if (arrangement && attendances !== undefined && !initialLoadDoneRef.current) {
      // 초기 로드 완료 마킹
      initialLoadDoneRef.current = true;
      setInitialLoadDone(true);

      // 새 배치표 로드 시 히스토리 초기화
      clearHistory();

      // DB에 저장된 워크플로우 상태가 있으면 복원
      const savedLayout = arrangement.grid_layout as unknown as GridLayout;
      if (savedLayout?.workflowState && !skipInitialization) {
        const { currentStep, completedSteps, isWizardMode } = savedLayout.workflowState;
        const isCompletedArrangement =
          arrangement.status === 'SHARED' || arrangement.status === 'CONFIRMED';

        if (isCompletedArrangement) {
          // 긴급 수정 모드: 모든 단계 완료로 복원 (DB에 불완전하게 저장된 경우 보정)
          logger.debug('긴급 수정 모드: 모든 단계 완료로 복원', { status: arrangement.status });
          restoreWorkflowState({
            currentStep: currentStep as WorkflowStep,
            completedSteps: new Set([1, 2, 3, 4, 5, 6] as WorkflowStep[]),
            isWizardMode,
            expandedSections: new Set([currentStep as WorkflowStep]),
          });
        } else {
          // DRAFT: DB에서 워크플로우 상태 그대로 복원
          logger.debug('DB에서 워크플로우 상태 복원:', { currentStep, completedSteps, isWizardMode });
          restoreWorkflowState({
            currentStep: currentStep as WorkflowStep,
            completedSteps: new Set(completedSteps as WorkflowStep[]),
            isWizardMode,
            expandedSections: new Set([currentStep as WorkflowStep]),
          });
        }
      } else if (!skipInitialization) {
        if (arrangement.status === 'CONFIRMED' || arrangement.status === 'SHARED') {
          // 레거시 배치표: 워크플로우 상태 없지만 이미 확정/공유됨 → 전체 완료로 간주
          restoreWorkflowState({
            currentStep: 6 as WorkflowStep,
            completedSteps: new Set([1, 2, 3, 4, 5, 6] as WorkflowStep[]),
            isWizardMode: false,
            expandedSections: new Set([6 as WorkflowStep]),
          });
        } else {
          // 워크플로우 상태가 없으면 (새 배치표 또는 레거시 DRAFT) 초기화
          resetWorkflow();
        }
      }

      // Load seats (DRAFT에서만 등단 불가능한 멤버 필터링)
      if (arrangement.seats && arrangement.seats.length > 0) {
        const isCompletedArrangement =
          arrangement.status === 'SHARED' || arrangement.status === 'CONFIRMED';

        const formattedSeats = arrangement.seats
          .filter((seat) => isCompletedArrangement || isServiceAvailable(seat.member_id))
          .map((seat) => ({
            memberId: seat.member_id,
            memberName: seat.member?.name || 'Unknown',
            part: seat.part,
            row: seat.seat_row,
            col: seat.seat_column,
            isRowLeader: seat.is_row_leader || false,
          }));

        // 필터링된 좌석 수가 원본과 다르면 로그에 알림
        const filteredCount = arrangement.seats.length - formattedSeats.length;
        if (filteredCount > 0) {
          logger.info(`등단 불가능 멤버 ${filteredCount}명이 좌석에서 제외됨`);
        }

        setAssignments(formattedSeats, { silent: true });
      } else {
        // 새 배치표: 이전 배치표의 잔존 데이터 명시적 초기화
        setAssignments([], { silent: true });
      }

      // Load grid layout with fallback to calculated or default
      // gridLayout이 없을 때만 (최초 로드 시) DB 값 설정
      // 긴급 등단 불가 처리로 최적화된 레이아웃은 유지됨
      if (!gridLayout) {
        let layout: GridLayout;

        if (arrangement.grid_layout) {
          // DB에 저장된 grid_layout 사용
          const savedLayout = arrangement.grid_layout as unknown as GridLayout;
          // 기존에 저장된 배치표는 이미 AI 추천을 거친 것으로 간주
          // (저장된 isAIRecommended 값 유지, 없으면 true로 설정)
          layout = {
            ...savedLayout,
            isAIRecommended: savedLayout.isAIRecommended ?? true,
          };
        } else if (arrangement.seats && arrangement.seats.length > 0) {
          // grid_layout이 null이면 좌석 데이터에서 계산
          // (과거 배치표 호환용 - 좌석이 있으므로 이미 배치가 완료된 상태)
          const calculatedLayout = calculateGridLayoutFromSeats(arrangement.seats);
          layout = {
            ...calculatedLayout,
            isAIRecommended: true, // 좌석이 있으면 이미 배치 완료된 것으로 간주
          };
          logger.debug('Calculated grid layout from seats', {
            rows: layout.rows,
            rowCapacities: layout.rowCapacities,
            seatCount: arrangement.seats.length,
          });
        } else {
          // 좌석도 없으면 기본값 (새 배치표)
          // isAIRecommended는 설정하지 않음 (undefined) → 1단계 미완료
          layout = DEFAULT_GRID_LAYOUT;
        }

        setGridLayout(layout, { silent: true });
      }

      // 로드 후 빈 좌석 자동 컴팩션 (등단 불가 멤버 필터링으로 생긴 빈 자리 정리)
      // 약간의 지연 후 실행하여 gridLayout 설정이 반영되도록 함
      setTimeout(() => {
        // 긴급 수정모드(SHARED/CONFIRMED): 기존 줄 구성/좌석 배치를 그대로 유지
        // compactAllRows와 shrinkRowCapacitiesToFit은 DRAFT에서만 실행
        const isCompletedArrangement =
          arrangement.status === 'SHARED' || arrangement.status === 'CONFIRMED';

        if (!isCompletedArrangement) {
          compactAllRows({ silent: true });

          // 실제 배치된 멤버가 있는 경우에만 rowCapacities 축소
          // (새 배치표에서는 스킵 — AI 추천이 적절한 값을 설정함)
          const currentAssignments = useArrangementStore.getState().assignments;
          const assignmentCount = Object.values(currentAssignments).length;
          if (assignmentCount > 0) {
            const currentLayout = useArrangementStore.getState().gridLayout;
            const totalCapacity = currentLayout?.rowCapacities?.reduce((a, b) => a + b, 0) ?? 0;
            if (totalCapacity > assignmentCount) {
              shrinkRowCapacitiesToFit({ silent: true });
            }
          }
        }

        clearHistory();
      }, 0);
    }
  }, [
    arrangement,
    attendances,
    isServiceAvailable,
    setAssignments,
    setGridLayout,
    clearHistory,
    compactAllRows,
    shrinkRowCapacitiesToFit,
    gridLayout,
    resetWorkflow,
    restoreWorkflowState,
    showRestoreDialog,
    skipInitialization,
  ]);

  // 새 배치표: AI 추천 분배 자동 적용 (totalMembers 변경 시 재적용)
  // arrangementDate·attendances는 출석 데이터 로드 완료 가드용 의존성
  useEffect(() => {
    // 초기화가 아직 완료되지 않음
    if (!initialLoadDone) return;
    // 출석 데이터가 올바른 날짜 기준으로 로드되었는지 확인 (빈 필터 방지 가드)
    if (!(arrangementDate && attendances !== undefined)) return;
    // DB에 저장된 좌석이 있는 기존 배치표
    if (dbHasData) return;
    // 멤버 데이터 로딩 중 (totalMembers가 아직 0)
    if (totalMembers === 0) return;
    // 이미 수동으로 구성된 그리드 (저장 후 refetch 시 race condition 방어)
    if (gridLayout?.isManuallyConfigured) return;

    // AI 추천 분배 계산 (totalMembers가 변하면 재적용)
    const recommendation = recommendRowDistribution(totalMembers);

    // 이미 추천 결과와 같은 그리드면 스킵 (수렴 조건)
    // ⚠️ totalMembers와 직접 비교하면 안 됨: 추천기는 물리 상한(줄 수×줄당 최대)으로
    // 좌석을 자를 수 있어(예: 128명 → 120석) 인원과 합계가 영원히 불일치
    // → setGridLayout 무한 루프(React #185)가 발생했던 버그의 원인
    const currentTotal = gridLayout?.rowCapacities?.reduce((a, b) => a + b, 0) ?? 0;
    const recommendedTotal = recommendation.rowCapacities.reduce((a, b) => a + b, 0);
    if (gridLayout?.isAIRecommended && currentTotal === recommendedTotal) return;
    setGridLayout({
      rows: recommendation.rows,
      rowCapacities: recommendation.rowCapacities,
      zigzagPattern: gridLayout?.zigzagPattern ?? 'even',
      isAIRecommended: true,
    }, { silent: true });

    // 토스트는 최초 1회만 표시
    if (!autoDistributionToastShownRef.current) {
      autoDistributionToastShownRef.current = true;
      showSuccess(
        `배치표가 생성되었습니다. 출석 인원 ${totalMembers}명 기반으로 줄 구성이 자동 설정되었습니다.`
      );
    }
  }, [totalMembers, dbHasData, gridLayout, setGridLayout, initialLoadDone, arrangementDate, attendances]);

  return { initialLoadDone };
}
