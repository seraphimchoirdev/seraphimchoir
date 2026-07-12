'use client';

import { AlertTriangle, ChevronDown, ChevronUp, Settings, Users } from 'lucide-react';

import { useSearchParams } from 'next/navigation';
import { use, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import ArrangementHeader from '@/components/features/arrangements/ArrangementHeader';
import ArrangementNotesPanel from '@/components/features/arrangements/ArrangementNotesPanel';
import CompactWorkflowStrip from '@/components/features/arrangements/CompactWorkflowStrip';
import EmergencyEditPanel from '@/components/features/arrangements/EmergencyEditPanel';
import MobileBottomSheet from '@/components/features/arrangements/MobileBottomSheet';
import RestoreDialog from '@/components/features/arrangements/RestoreDialog';
import WorkflowFloatingActionBar from '@/components/features/arrangements/WorkflowFloatingActionBar';
import WorkflowFloatingStepContent from '@/components/features/arrangements/WorkflowFloatingStepContent';
import WorkflowStepContent from '@/components/features/arrangements/WorkflowStepContent';
import { WorkflowPanel } from '@/components/features/arrangements/workflow';
import EmergencyAvailableDialog from '@/components/features/seats/EmergencyAvailableDialog';
import EmergencyUnavailableDialog from '@/components/features/seats/EmergencyUnavailableDialog';
import MemberSidebar from '@/components/features/seats/MemberSidebar';
import SeatsGrid from '@/components/features/seats/SeatsGrid';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Spinner } from '@/components/ui/spinner';

import { useArrangement } from '@/hooks/useArrangements';
import { useImageExportHandlers } from '@/hooks/useImageExportHandlers';
import { useAttendances } from '@/hooks/useAttendances';
import { useServiceSchedule } from '@/hooks/useServiceSchedules';
import { useArrangementInitialization } from '@/hooks/useArrangementInitialization';
import { useArrangementMembers } from '@/hooks/useArrangementMembers';
import { useAuth } from '@/hooks/useAuth';
import { useAutoSaveDraft } from '@/hooks/useAutoSaveDraft';
import type { RecommendationResponse } from '@/hooks/useRecommendSeats';
import { useRestoreDraft } from '@/hooks/useRestoreDraft';
import { useUndoRedoShortcuts } from '@/hooks/useUndoRedoShortcuts';
import { useWorkflowAutoAdvance } from '@/hooks/useWorkflowAutoAdvance';

import { createLogger } from '@/lib/logger';
import { showError, showInfo, showSuccess } from '@/lib/toast';
import { cn } from '@/lib/utils';
import { getActivePresetId } from '@/lib/utils/offsetPresets';

import { useEmergencyUnavailable } from '@/hooks/useEmergencyUnavailable';

import { useArrangementStore } from '@/store/arrangement-store';

import type { Database } from '@/types/database.types';

const logger = createLogger({ prefix: 'ArrangementEditorPage' });

type Part = Database['public']['Enums']['part'];

export default function ArrangementEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { hasRole, isLoading: authLoading } = useAuth();

  // 하이라이트 대상 멤버 (대시보드에서 "내 자리 확인하기" 클릭 시)
  const searchParams = useSearchParams();
  const highlightMemberId = searchParams.get('highlight');

  // 편집 권한: ADMIN, CONDUCTOR만
  const canEdit = hasRole(['ADMIN', 'CONDUCTOR']);
  // 긴급 수정 권한: ADMIN, CONDUCTOR, MANAGER
  const canEmergencyEdit = hasRole(['ADMIN', 'CONDUCTOR', 'MANAGER']);
  const { id } = use(params);
  const { data: arrangement, isLoading, error } = useArrangement(id);
  // 예배 일정 조회 (CaptureHeader용 — 페이지 레벨에서 한 번만 조회)
  const { data: serviceSchedule } = useServiceSchedule(arrangement?.service_schedule_id || undefined);
  const {
    setAssignments,
    setGridLayout,
    gridLayout,
    workflow,
    goToStep,
    canAccessStep,
    completeStep,
    clearAllRowLeaders,
    assignments,
    saveSharedSnapshot,
    clearSharedSnapshot,
    emergencyChanges,
    addEmergencyChange,
  } = useArrangementStore();

  // 키보드 단축키 훅 초기화 (Ctrl+Z/Y for Undo/Redo)
  useUndoRedoShortcuts();

  const [showSettingsSheet, setShowSettingsSheet] = useState(false);
  const [panelMode, setPanelMode] = useState<'expanded' | 'compact'>('expanded');
  const [showMobileSidebar, setShowMobileSidebar] = useState(true);
  const [notesValue, setNotesValue] = useState<string>('');
  const notesInitialized = useRef(false);

  // 긴급 수정 패널 접기/펼치기 상태 (데스크톱)
  const [emergencyPanelCollapsed, setEmergencyPanelCollapsed] = useState(false);
  const [emergencyOffsetEditing, setEmergencyOffsetEditing] = useState(false);
  // 긴급 수정 모드 대원 목록 사이드바 숨김 상태
  const [memberSidebarHidden, setMemberSidebarHidden] = useState(false);

  // 모바일 좌석 선택 모드 (긴급 수정 시 "등단 불가 처리" 좌석 선택)
  const [seatSelectionMode, setSeatSelectionMode] = useState<'unavailable' | null>(null);

  // 사용자가 수동으로 panelMode를 변경했는지 추적
  const userOverridePanelRef = useRef(false);

  // 긴급 등단 불가 다이얼로그 상태
  const [emergencyDialogOpen, setEmergencyDialogOpen] = useState(false);
  const [emergencyTargetMember, setEmergencyTargetMember] = useState<{
    memberId: string;
    memberName: string;
    part: Part;
    row: number;
    col: number;
  } | null>(null);

  // 줄반장 전체 해제 확인 다이얼로그
  const [clearRowLeadersDialog, setClearRowLeadersDialog] = useState(false);

  // 긴급 등단 가능 추가 다이얼로그 (EmergencyEditPanel용)
  const [emergencyAvailableDialogOpen, setEmergencyAvailableDialogOpen] = useState(false);

  // 이미지 캡처를 위한 ref (데스크톱/모바일 각각)
  const desktopCaptureRef = useRef<HTMLDivElement>(null);
  const mobileCaptureRef = useRef<HTMLDivElement>(null);

  // 이미지 내보내기 핸들러 (워크플로우 7단계 스텝 콘텐츠에 전달)
  const imageExport = useImageExportHandlers({
    getFilename: useCallback(
      () => `배치표_${arrangement?.date}_${arrangement?.title?.replace(/\s+/g, '_') ?? ''}`,
      [arrangement?.date, arrangement?.title]
    ),
    desktopCaptureRef,
    mobileCaptureRef,
  });

  // 줄반장 자동 지정 토스트 중복 방지
  const rowLeaderToastShownRef = useRef(false);

  // Step 3 자동 최소화를 위한 이전 Step 추적
  const prevStepRef = useRef<number>(workflow.currentStep);

  // 정대원·게스트 등단자 목록 (페이지 레벨 1회 구독 — MemberSidebar/SeatsGrid에 props로 전달, B11)
  const {
    regularMembers,
    guestMembers,
    heightMap,
    isLoading: membersLoading,
  } = useArrangementMembers();

  // 긴급 수정 모드 (SHARED 상태에서 canEmergencyEdit 권한이 있을 때만)
  // DRAFT: 일반 편집 모드 (더블클릭으로 제거)
  // SHARED: 긴급 수정 모드 (컨텍스트 메뉴 표시) - 권한 필요
  // CONFIRMED: 읽기 전용 모드 (수정 불가)
  const isEmergencyMode = arrangement?.status === 'SHARED' && canEmergencyEdit;

  // isEmergencyMode 해제 시 긴급수정 관련 state 정리
  useEffect(() => {
    if (!isEmergencyMode) {
      setEmergencyOffsetEditing(false);
    }
  }, [isEmergencyMode]);

  // arrangement 로드 시 notes 초기화
  useEffect(() => {
    if (arrangement?.notes !== undefined && !notesInitialized.current) {
      setNotesValue(arrangement.notes || '');
      notesInitialized.current = true;
    }
  }, [arrangement?.notes]);

  // ⭐ DRAFT 상태에서 긴급 변동 상태 정리
  // (SHARED → DRAFT 전환 시 경쟁 조건으로 sharedSnapshot이 남을 수 있음)
  useEffect(() => {
    if (!isEmergencyMode && emergencyChanges.sharedSnapshot) {
      clearSharedSnapshot();
    }
  }, [isEmergencyMode, emergencyChanges.sharedSnapshot, clearSharedSnapshot]);

  // ⭐ SHARED 배치표 진입 시 sharedSnapshot이 없으면 자동 저장
  // (편집 완료 시점에만 저장되므로, 페이지 재진입 시 복원 필요)
  useEffect(() => {
    if (isEmergencyMode && !emergencyChanges.sharedSnapshot && Object.keys(assignments).length > 0) {
      saveSharedSnapshot();
    }
  }, [isEmergencyMode, emergencyChanges.sharedSnapshot, assignments, saveSharedSnapshot]);

  // 해당 날짜+예배의 출석 데이터 조회 (service_schedule_id로 예배별 분리)
  // ⭐ 긴급 모드에서는 탭 포커스 시 자동 갱신 (출석 관리에서 변경 후 돌아올 때)
  const { data: attendances } = useAttendances({
    date: arrangement?.date,
    service_schedule_id: arrangement?.service_schedule_id ?? undefined,
    refetchOnWindowFocus: isEmergencyMode,
  });

  // 출석 데이터를 memberId로 빠르게 조회하기 위한 Map
  const attendanceMap = useMemo(() => {
    const map = new Map<string, NonNullable<typeof attendances>[number]>();
    attendances?.forEach((a) => {
      map.set(a.member_id, a);
    });
    return map;
  }, [attendances]);

  // 멤버가 등단 가능한지 확인하는 헬퍼 함수
  // 출석 레코드가 없으면 등단 가능 (파트장이 등단 불가 멤버만 DB에 기록하는 워크플로우)
  const isServiceAvailable = useCallback(
    (memberId: string) => {
      const attendance = attendanceMap.get(memberId);
      if (!attendance) return true;
      return attendance.is_service_available === true;
    },
    [attendanceMap]
  );

  // 등단 가능한 멤버 수 계산 (정대원 + 게스트)
  const arrangementDate = arrangement?.date;
  const totalMembers = useMemo(() => {
    const regularCount = regularMembers.filter((member) => {
      // 배치표 날짜 이전에 입단한 대원만 포함 (MemberSidebar와 동일 기준)
      if (arrangementDate && member.joined_date && member.joined_date > arrangementDate) return false;
      const attendance = attendanceMap.get(member.id);
      if (!attendance) return true;
      return attendance.is_service_available === true;
    }).length;
    return regularCount + guestMembers.length;
  }, [regularMembers, guestMembers, attendanceMap, arrangementDate]);

  // 워크플로우 자동 진행 훅 (위자드 모드에서 단계 완료 조건 자동 감지)
  useWorkflowAutoAdvance(totalMembers, arrangement?.status ?? undefined);

  // 줄반장 자동 지정 토스트 (5단계 진입 시)
  useEffect(() => {
    if (workflow.currentStep === 5 && !rowLeaderToastShownRef.current) {
      const rowLeaderCount = Object.values(assignments).filter(a => a.isRowLeader).length;
      if (rowLeaderCount > 0) {
        rowLeaderToastShownRef.current = true;
        showSuccess(`줄반장 ${rowLeaderCount}명이 자동 지정되었습니다. 수정이 필요하면 직접 조정하세요.`);
      }
    }
    if (workflow.currentStep !== 5) {
      rowLeaderToastShownRef.current = false;
    }
  }, [workflow.currentStep, assignments]);

  // 대원 목록 표시 여부: 4단계(수동 배치 조정) 또는 긴급 수정 모드에서 표시
  const showMemberSidebar = workflow.currentStep === 4 || isEmergencyMode;

  // 배치표 상태 및 권한에 따른 읽기 전용 모드
  // - CONFIRMED 상태: 모두 읽기 전용
  // - SHARED 상태: canEmergencyEdit 권한이 없으면 읽기 전용
  // - DRAFT 상태: canEdit 권한이 없으면 읽기 전용
  const isReadOnly =
    arrangement?.status === 'CONFIRMED' ||
    (arrangement?.status === 'SHARED' && !canEmergencyEdit) ||
    (arrangement?.status === 'DRAFT' && !canEdit);

  // AI 추천 결과 적용 핸들러 (Step 3 AI 자동배치용)
  const handleApplyRecommendation = useCallback(
    (recommendation: RecommendationResponse, preserveGrid: boolean) => {
      logger.debug('=== AI 추천 결과 적용 ===');
      logger.debug('seats.length:', recommendation.seats.length);
      logger.debug('preserveGrid:', preserveGrid);

      // AI 추천 결과를 store에 적용
      const formattedSeats = recommendation.seats.map((seat) => ({
        memberId: seat.memberId,
        memberName: seat.memberName,
        part: seat.part,
        row: seat.row,
        col: seat.col,
      }));

      // 그리드 레이아웃 적용 (preserveGrid 옵션에 따라)
      if (!preserveGrid && recommendation.suggestedGridLayout) {
        setGridLayout({
          rows: recommendation.suggestedGridLayout.rows,
          rowCapacities: recommendation.suggestedGridLayout.rowCapacities,
          zigzagPattern: recommendation.suggestedGridLayout.zigzagPattern,
          isAIRecommended: true,
        });
      } else if (!preserveGrid && recommendation.gridLayout) {
        setGridLayout({
          rows: recommendation.gridLayout.rows,
          rowCapacities: recommendation.gridLayout.rowCapacities,
          zigzagPattern: recommendation.gridLayout.zigzagPattern,
          isAIRecommended: true,
        });
      }

      setAssignments(formattedSeats);
      const qualityScore = recommendation.qualityScore ?? 0;
      const gridMessage = preserveGrid ? ' (그리드 설정 유지됨)' : '';
      showSuccess(
        `AI 추천이 적용되었습니다! (품질 점수: ${(qualityScore * 100).toFixed(0)}%)${gridMessage}`
      );

      // 3단계(AI 자동배치) 자동 완료 및 다음 단계 이동 (위자드 모드일 때)
      if (workflow.isWizardMode && workflow.currentStep === 3) {
        setTimeout(() => {
          completeStep(3);
          goToStep(4);
        }, 300);
      }
    },
    [setGridLayout, setAssignments, workflow.isWizardMode, workflow.currentStep, completeStep, goToStep]
  );

  // 긴급 등단 불가 처리 훅 (모달 없이 즉시 "빈 자리 유지"로 처리)
  const { handleEmergencyUnavailable: runEmergencyUnavailable } = useEmergencyUnavailable({
    arrangementId: id,
    date: arrangement?.date || '',
    serviceScheduleId: arrangement?.service_schedule_id ?? undefined,
    onSuccess: (message) => {
      showSuccess(message);
      setEmergencyTargetMember(null);
      setSeatSelectionMode(null);
    },
    onError: (message) => showError(`오류: ${message}`),
  });

  // 긴급 등단 불가 처리 핸들러 (모달 없이 즉시 빈 자리 처리 + 완료 토스트)
  // - 컨텍스트 메뉴 클릭 시 모달 없이 곧바로 LEAVE_EMPTY(빈 자리 유지) 방식으로 처리
  // - 실제 대형 조정은 사용자가 눈으로 보며 수동으로 하므로 자동당기기/수동처리 옵션은 비노출
  //   (EmergencyUnavailableDialog 코드는 유지 — 추후 재활성화 가능)
  // - 되돌리기 보존: simulateLeaveEmpty로 cascade를 미리 캡처 후 addEmergencyChange 기록
  const handleEmergencyUnavailable = useCallback(
    async (params: { memberId: string; memberName: string; part: Part; row: number; col: number }) => {
      // (순서 중요) 상태 변경 전에 시뮬레이션으로 cascadeChanges 캡처
      const sim = useArrangementStore.getState().simulateLeaveEmpty(params.row, params.col);

      let result;
      try {
        result = await runEmergencyUnavailable({ ...params, processMode: 'LEAVE_EMPTY' });
      } catch {
        // 실패 시 훅이 onError 토스트 + store 롤백을 처리하므로 이력은 남기지 않음
        return;
      }

      // 변동 이력 기록 (되돌리기용) — EmergencyUnavailableDialog와 동일 구조
      addEmergencyChange({
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        type: 'UNAVAILABLE',
        memberId: params.memberId,
        memberName: params.memberName,
        part: params.part,
        processMode: 'LEAVE_EMPTY',
        removedFrom: { row: params.row, col: params.col },
        cascadeChanges: sim.cascadeChanges,
        movedMemberCount: sim.movedMemberCount,
        beforeSnapshot: result?.beforeSnapshot,
      });
    },
    [runEmergencyUnavailable, addEmergencyChange]
  );

  // 패널에서 "등단 불가 처리" 클릭 시 래퍼 (모바일: 바텀시트 닫고 좌석 선택 모드 진입)
  const handleEmergencyUnavailableFromPanel = useCallback(() => {
    if (window.innerWidth < 640) {
      setShowSettingsSheet(false);
      setSeatSelectionMode('unavailable');
    } else {
      showInfo('그리드에서 제거할 대원의 좌석을 클릭하세요.');
    }
  }, []);

  // DB에 저장된 데이터가 있는지 확인
  const dbHasData = useMemo(() => {
    return !!(arrangement?.seats && arrangement.seats.length > 0);
  }, [arrangement]);

  // 페이지 로드 완료 여부 (arrangement와 attendances 모두 로드됨)
  const isPageLoaded = !!(arrangement && attendances !== undefined);

  // Draft 복원 훅
  const {
    showRestoreDialog,
    draftInfo,
    hasDbData,
    handleRestoreChoice,
    closeDialog,
    skipInitialization,
  } = useRestoreDraft(id, {
    dbHasData,
    isPageLoaded,
  });

  // 자동 저장 훅 (Draft 복원 다이얼로그가 닫힌 후에만 활성화)
  useAutoSaveDraft(id, {
    enabled: !showRestoreDialog && isPageLoaded,
    isReadOnly,
  });

  // 초기 로드(좌석·그리드·워크플로우 복원) 및 새 배치표 AI 추천 분배 (B10-2로 추출)
  useArrangementInitialization({
    id,
    arrangement,
    attendances,
    isServiceAvailable,
    totalMembers,
    dbHasData,
    showRestoreDialog,
    skipInitialization,
    arrangementDate,
  });

  // Step 4 (수동 배치 조정) 진입 시 워크플로우 패널 자동 Compact
  // 태블릿/폴더블 기기(640px-1023px)에서 MemberSidebar + SeatsGrid 공간 확보
  // ⭐ useRef로 이전 Step을 추적하여 Step 4 "진입" 시에만 실행 (재펼침 가능)
  // 브라우저 창 크기에 반응하는 정당한 useEffect 사용
  useEffect(() => {
    const prevStep = prevStepRef.current;
    prevStepRef.current = workflow.currentStep;

    // Step 4로 "진입"하는 순간에만 실행 (이미 4에 있으면 무시)
    if (workflow.currentStep === 4 && prevStep !== 4) {
      const isTabletRange = window.innerWidth >= 640 && window.innerWidth < 1024;
      if (isTabletRange && !userOverridePanelRef.current) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- 외부 시스템(창 크기)에 반응
        setPanelMode('compact');
        showInfo('대원 목록 공간 확보를 위해 워크플로우 패널을 축소했습니다.');
      }
    }
  }, [workflow.currentStep]);

  // 초기 panelMode 설정: 640~1023px에서는 Compact, 1024px+에서는 Expanded
  useEffect(() => {
    const width = window.innerWidth;
    if (width >= 640 && width < 1024) {
      setPanelMode('compact');
    }
  }, []);

  // 현재 적용된 줄 정렬 프리셋 감지 (EmergencyEditPanel용 — 로직은 lib/utils/offsetPresets로 추출)
  const getActivePresetIdForPanel = useCallback(
    (): string | null => getActivePresetId(gridLayout),
    [gridLayout]
  );

  if (isLoading || authLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !arrangement) {
    return (
      <div className="p-8">
        <Alert variant="error">
          <AlertDescription>{error?.message || '배치표를 찾을 수 없습니다.'}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-[var(--color-background-primary)]">
      {/* Draft 복원 다이얼로그 */}
      <RestoreDialog
        open={showRestoreDialog}
        draftInfo={draftInfo}
        hasDbData={hasDbData}
        onChoice={handleRestoreChoice}
        onClose={closeDialog}
      />

      {/* 긴급 등단 불가 확인 다이얼로그 */}
      <EmergencyUnavailableDialog
        open={emergencyDialogOpen}
        onOpenChange={(open) => {
          setEmergencyDialogOpen(open);
          if (!open) setSeatSelectionMode(null);
        }}
        targetMember={emergencyTargetMember}
        arrangementId={id}
        date={arrangement?.date || ''}
        serviceScheduleId={arrangement?.service_schedule_id ?? undefined}
        onComplete={(message) => {
          showSuccess(message);
          setEmergencyTargetMember(null);
          setSeatSelectionMode(null);
        }}
        onError={(message) => showError(`오류: ${message}`)}
      />

      <ArrangementHeader
        arrangement={arrangement}
        desktopCaptureRef={desktopCaptureRef}
        mobileCaptureRef={mobileCaptureRef}
        notes={notesValue}
      />

      {/* 데스크톱: 3패널 가로 배치 (640px 이상 - Z Fold 펼침 대응) */}
      <div className="hidden flex-1 gap-4 overflow-hidden p-4 sm:flex">
        {/* 긴급 수정 모드: EmergencyEditPanel 표시 (접기/펼치기 지원) */}
        {isEmergencyMode ? (
          <div data-print-hide className={cn(
            'animate-in slide-in-from-left flex-shrink-0 transition-all duration-300',
            emergencyPanelCollapsed ? 'w-16' : 'w-80',
          )}>
            <EmergencyEditPanel
              arrangementId={id}
              date={arrangement?.date || ''}
              serviceScheduleId={arrangement?.service_schedule_id ?? undefined}
              gridLayout={gridLayout}
              onGridLayoutChange={setGridLayout}
              onOpenUnavailableDialog={handleEmergencyUnavailable}
              onOpenAvailableDialog={() => setEmergencyAvailableDialogOpen(true)}
              onOpenClearRowLeadersDialog={() => setClearRowLeadersDialog(true)}
              getActivePresetId={getActivePresetIdForPanel}
              totalMembers={totalMembers}
              collapsed={emergencyPanelCollapsed}
              onToggleCollapse={() => setEmergencyPanelCollapsed(prev => !prev)}
              onOffsetEditChange={setEmergencyOffsetEditing}
              className="h-full"
            />
          </div>
        ) : (
          <>
            {/* 일반 모드: 워크플로우 패널 - 2단 접기 (Expanded ↔ Compact) */}
            {panelMode === 'expanded' ? (
              <div data-print-hide className="animate-in slide-in-from-left relative w-80 flex-shrink-0 duration-300">
                <WorkflowPanel
                  renderStepContent={(step) => (
                    <WorkflowStepContent
                      step={step}
                      arrangementId={id}
                      arrangementStatus={arrangement.status}
                      totalMembers={totalMembers}
                      isReadOnly={isReadOnly}
                      onApplyRecommendation={handleApplyRecommendation}
                      onRequestClearRowLeaders={() => setClearRowLeadersDialog(true)}
                      imageExport={imageExport}
                    />
                  )}
                  totalMembers={totalMembers}
                  arrangementStatus={arrangement.status ?? undefined}
                  className="h-full overflow-y-auto"
                />
                {/* 접기 버튼 → Compact 전환 */}
                <Button
                  onClick={() => {
                    setPanelMode('compact');
                    userOverridePanelRef.current = true;
                  }}
                  variant="ghost"
                  size="sm"
                  className="absolute top-4 -right-3 z-10 border border-[var(--color-border-default)] bg-[var(--color-surface)] shadow-md hover:bg-[var(--color-background-secondary)]"
                  title="워크플로우 패널 접기"
                >
                  <ChevronDown className="h-4 w-4 rotate-90" />
                </Button>
              </div>
            ) : (
              <div data-print-hide>
                <CompactWorkflowStrip
                  currentStep={workflow.currentStep}
                  completedSteps={workflow.completedSteps}
                  canAccessStep={canAccessStep}
                  onStepClick={goToStep}
                  optionalSteps={[2, 3]}
                  onExpand={() => {
                    setPanelMode('expanded');
                    userOverridePanelRef.current = true;
                  }}
                />
              </div>
            )}
          </>
        )}

        {/* Member Sidebar - 수동 배치 조정 단계(4단계) 또는 긴급 수정 모드에서 표시 */}
        {showMemberSidebar && (
          <div data-print-hide className="relative h-full flex-shrink-0">
            {isEmergencyMode && memberSidebarHidden ? (
              <Button
                onClick={() => setMemberSidebarHidden(false)}
                variant="outline"
                size="sm"
                className="h-8 border-[var(--color-border-default)] bg-[var(--color-surface)] shadow-sm"
                title="대원 목록 표시"
              >
                <Users className="mr-1 h-4 w-4" />
                대원 목록
              </Button>
            ) : (
              <div className="relative h-full">
                {isEmergencyMode && (
                  <Button
                    onClick={() => setMemberSidebarHidden(true)}
                    variant="ghost"
                    size="sm"
                    className="absolute top-1 right-1 z-10 h-6 w-6 p-0 text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]"
                    title="대원 목록 숨기기"
                  >
                    <ChevronDown className="h-4 w-4 rotate-90" />
                  </Button>
                )}
                <MemberSidebar
                  date={arrangement.date}
                  serviceScheduleId={arrangement.service_schedule_id ?? undefined}
                  hidePlaced={true}
                  isEmergencyMode={isEmergencyMode}
                  arrangementId={id}
                  regularMembers={regularMembers}
                  guestMembers={guestMembers}
                  membersLoading={membersLoading}
                />
              </div>
            )}
          </div>
        )}

        {/* Seats Grid + 안내 메모 (세로 배치) */}
        <div className="flex min-w-0 flex-1 flex-col overflow-auto">
          <SeatsGrid
            ref={desktopCaptureRef}
            heightMap={heightMap}
            gridLayout={gridLayout}
            arrangementInfo={{
              date: arrangement.date,
              title: arrangement.title,
              conductor: arrangement.conductor || undefined,
              serviceType: serviceSchedule?.service_type || undefined,
              hymnName: serviceSchedule?.hymn_name,
              offertoryPerformer: serviceSchedule?.offertory_performer,
            }}
            showCaptureInfo={true}
            notes={arrangement.notes}
            onEmergencyUnavailable={handleEmergencyUnavailable}
            isReadOnly={isReadOnly}
            isEmergencyMode={isEmergencyMode}
            workflowStep={workflow.currentStep}
            highlightMemberId={highlightMemberId}
            showOffsetControls={emergencyOffsetEditing}
          />

          {/* 안내 메모 에디터 (6단계에서만 표시, 배치표 하단) */}
          {workflow.currentStep === 6 && !isReadOnly && (
            <ArrangementNotesPanel
              arrangementId={arrangement.id}
              value={notesValue}
              onChange={setNotesValue}
            />
          )}
        </div>
      </div>

      {/* Compact 모드용 플로팅 액션 바 (데스크톱에서만, 긴급 수정 모드에서는 숨김) */}
      {!isEmergencyMode && (
        <div data-print-hide>
          <WorkflowFloatingActionBar
            currentStep={workflow.currentStep}
            isVisible={panelMode === 'compact'}
          >
            <WorkflowFloatingStepContent
              step={workflow.currentStep}
              arrangementId={id}
              totalMembers={totalMembers}
              isReadOnly={isReadOnly}
              onApplyRecommendation={handleApplyRecommendation}
              onExpandPanel={() => {
                setPanelMode('expanded');
                userOverridePanelRef.current = true;
              }}
              imageExport={imageExport}
            />
          </WorkflowFloatingActionBar>
        </div>
      )}

      {/* 모바일: 상단 그리드 + 하단 대원 목록 (Split View, 640px 미만) */}
      <div className="relative flex flex-1 flex-col overflow-hidden sm:hidden">
        {/* 좌석 선택 모드 안내 바 (긴급 수정 - 등단 불가 처리) */}
        {seatSelectionMode === 'unavailable' && (
          <div className="flex flex-shrink-0 items-center justify-between bg-red-50 px-4 py-2 dark:bg-red-950/30">
            <span className="text-sm font-medium text-red-700 dark:text-red-300">
              불가 처리할 대원을 터치하세요
            </span>
            <Button size="sm" variant="ghost" onClick={() => setSeatSelectionMode(null)}
              className="text-red-600 hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-900/50"
            >
              취소
            </Button>
          </div>
        )}

        {/* 상단: 좌석 그리드 (Scrollable) */}
        <div className="relative flex-1 overflow-auto">
          <SeatsGrid
            ref={mobileCaptureRef}
            heightMap={heightMap}
            gridLayout={gridLayout}
            arrangementInfo={{
              date: arrangement.date,
              title: arrangement.title,
              conductor: arrangement.conductor || undefined,
              serviceType: serviceSchedule?.service_type || undefined,
              hymnName: serviceSchedule?.hymn_name,
              offertoryPerformer: serviceSchedule?.offertory_performer,
            }}
            showCaptureInfo={true}
            notes={arrangement.notes}
            onEmergencyUnavailable={handleEmergencyUnavailable}
            isReadOnly={isReadOnly}
            isEmergencyMode={isEmergencyMode}
            workflowStep={workflow.currentStep}
            highlightMemberId={highlightMemberId}
            showOffsetControls={emergencyOffsetEditing}
          />

          {/* 그리드 설정 버튼 (Floating) — 긴급 수정 모드에서는 amber 스타일 */}
          <Button
            data-print-hide
            data-testid="mobile-settings-button"
            onClick={() => setShowSettingsSheet(true)}
            variant="outline"
            size="icon"
            className={cn(
              'absolute top-4 right-4 z-10 h-10 w-10 rounded-full shadow-md backdrop-blur-sm',
              isEmergencyMode
                ? 'border-amber-300 bg-amber-500 text-white hover:bg-amber-600'
                : 'bg-white/90',
            )}
          >
            {isEmergencyMode ? (
              <AlertTriangle className="h-5 w-5" />
            ) : (
              <Settings className="h-5 w-5" />
            )}
          </Button>
        </div>

        {/* 하단: 대원 목록 (Collapsible) - 수동 배치 조정 단계(3단계)에서만 표시 */}
        {showMemberSidebar && (
          <div
            data-print-hide
            className={`z-20 flex flex-col border-t border-[var(--color-border-default)] bg-[var(--color-surface)] shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] transition-all duration-300 ease-in-out ${
              showMobileSidebar ? 'h-[320px]' : 'h-[40px]'
            }`}
          >
            {/* Toggle Handle */}
            <button
              onClick={() => setShowMobileSidebar(!showMobileSidebar)}
              className="flex h-10 w-full cursor-pointer items-center justify-center transition-colors hover:bg-[var(--color-background-secondary)] active:bg-[var(--color-background-tertiary)]"
              aria-label={showMobileSidebar ? '대원 목록 접기' : '대원 목록 펼치기'}
            >
              <div className="mb-1 h-1 w-10 rounded-full bg-[var(--color-text-tertiary)] opacity-30" />
              {showMobileSidebar ? (
                <ChevronDown className="absolute right-4 h-4 w-4 text-[var(--color-text-tertiary)]" />
              ) : (
                <ChevronUp className="absolute right-4 h-4 w-4 text-[var(--color-text-tertiary)]" />
              )}
            </button>

            <div className={`flex-1 overflow-hidden ${!showMobileSidebar && 'hidden'}`}>
              <MemberSidebar
                date={arrangement.date}
                serviceScheduleId={arrangement.service_schedule_id ?? undefined}
                hidePlaced={true}
                compact={true}
                isEmergencyMode={isEmergencyMode}
                arrangementId={id}
                regularMembers={regularMembers}
                guestMembers={guestMembers}
                membersLoading={membersLoading}
              />
            </div>
          </div>
        )}

        {/* Bottom Sheet - 워크플로우 또는 긴급 수정 패널 (모바일) */}
        <MobileBottomSheet
          open={showSettingsSheet}
          onClose={() => setShowSettingsSheet(false)}
          title={isEmergencyMode ? '긴급 수정' : '워크플로우'}
        >
          {isEmergencyMode ? (
            <EmergencyEditPanel
              arrangementId={id}
              date={arrangement?.date || ''}
              serviceScheduleId={arrangement?.service_schedule_id ?? undefined}
              gridLayout={gridLayout}
              onGridLayoutChange={setGridLayout}
              onOpenUnavailableDialog={handleEmergencyUnavailable}
              onOpenAvailableDialog={() => setEmergencyAvailableDialogOpen(true)}
              onOpenClearRowLeadersDialog={() => setClearRowLeadersDialog(true)}
              getActivePresetId={getActivePresetIdForPanel}
              totalMembers={totalMembers}
              onRequestUnavailableMode={handleEmergencyUnavailableFromPanel}
              onOffsetEditChange={setEmergencyOffsetEditing}
            />
          ) : (
            <WorkflowPanel
              renderStepContent={(step) => (
                <WorkflowStepContent
                  step={step}
                  arrangementId={id}
                  arrangementStatus={arrangement.status}
                  totalMembers={totalMembers}
                  isReadOnly={isReadOnly}
                  onApplyRecommendation={handleApplyRecommendation}
                  onRequestClearRowLeaders={() => setClearRowLeadersDialog(true)}
                  imageExport={imageExport}
                />
              )}
              totalMembers={totalMembers}
              arrangementStatus={arrangement.status ?? undefined}
            />
          )}
        </MobileBottomSheet>
      </div>

      {/* 줄반장 전체 해제 확인 다이얼로그 */}
      <ConfirmDialog
        open={clearRowLeadersDialog}
        onOpenChange={setClearRowLeadersDialog}
        title="줄반장 전체 해제"
        description="모든 줄반장 지정을 해제하시겠습니까?"
        confirmLabel="해제"
        variant="destructive"
        onConfirm={() => {
          clearAllRowLeaders();
          setClearRowLeadersDialog(false);
        }}
      />

      {/* 긴급 등단 가능 추가 다이얼로그 (EmergencyEditPanel에서 사용) */}
      <EmergencyAvailableDialog
        open={emergencyAvailableDialogOpen}
        onOpenChange={setEmergencyAvailableDialogOpen}
        arrangementId={id}
        date={arrangement?.date || ''}
        serviceScheduleId={arrangement?.service_schedule_id ?? undefined}
        onComplete={(message) => showSuccess(message)}
        onError={(message) => showError(`오류: ${message}`)}
      />
    </div>
  );
}
