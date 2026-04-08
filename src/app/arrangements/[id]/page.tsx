'use client';

import { AlertTriangle, Check, CheckCircle2, ChevronDown, ChevronUp, Copy, Crown, Download, GripHorizontal, Loader2, Lock, MousePointer2, Settings, Share2, SkipForward, Sparkles, Trash2, Users } from 'lucide-react';

import { useSearchParams } from 'next/navigation';
import { ReactNode, use, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import ArrangementHeader from '@/components/features/arrangements/ArrangementHeader';
import CompactWorkflowStrip from '@/components/features/arrangements/CompactWorkflowStrip';
import EmergencyEditPanel from '@/components/features/arrangements/EmergencyEditPanel';
import NotesEditor from '@/components/features/arrangements/NotesEditor';
import GridSettingsPanel from '@/components/features/arrangements/GridSettingsPanel';
import RecommendButton from '@/components/features/arrangements/RecommendButton';
import RestoreDialog from '@/components/features/arrangements/RestoreDialog';
import WorkflowFloatingActionBar from '@/components/features/arrangements/WorkflowFloatingActionBar';
import { WorkflowPanel } from '@/components/features/arrangements/workflow';
import EmergencyAvailableDialog from '@/components/features/seats/EmergencyAvailableDialog';
import EmergencyUnavailableDialog from '@/components/features/seats/EmergencyUnavailableDialog';
import MemberSidebar from '@/components/features/seats/MemberSidebar';
import SeatsGrid from '@/components/features/seats/SeatsGrid';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Spinner } from '@/components/ui/spinner';

import { useArrangement, useUpdateArrangement } from '@/hooks/useArrangements';
import { useImageExportHandlers } from '@/hooks/useImageExportHandlers';
import { useAttendances } from '@/hooks/useAttendances';
import { useServiceSchedule } from '@/hooks/useServiceSchedules';
import { useAuth } from '@/hooks/useAuth';
import { useAutoSaveDraft } from '@/hooks/useAutoSaveDraft';
import { useMembers } from '@/hooks/useMembers';
import type { RecommendationResponse } from '@/hooks/useRecommendSeats';
import { useRestoreDraft } from '@/hooks/useRestoreDraft';
import { useUndoRedoShortcuts } from '@/hooks/useUndoRedoShortcuts';
import { useWorkflowAutoAdvance } from '@/hooks/useWorkflowAutoAdvance';

import { createLogger } from '@/lib/logger';
import { recommendRowDistribution } from '@/lib/row-distribution-recommender';
import { showError, showInfo, showSuccess } from '@/lib/toast';
import { cn } from '@/lib/utils';
import { calculateGridLayoutFromSeats } from '@/lib/utils/gridUtils';

import { WorkflowStep, useArrangementStore } from '@/store/arrangement-store';

import type { Database } from '@/types/database.types';
import { DEFAULT_GRID_LAYOUT, GridLayout, OFFSET_PRESETS } from '@/types/grid';

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
    clearArrangement,
    clearHistory,
    compactAllRows,
    shrinkRowCapacitiesToFit,
    resetWorkflow,
    restoreWorkflowState,
    workflow,
    goToStep,
    canAccessStep,
    completeStep,
    // 줄 정렬 프리셋 (Step 2용)
    applyOffsetPreset,
    // 줄반장 관련 (Step 5용)
    rowLeaderMode,
    toggleRowLeaderMode,
    autoAssignRowLeaders,
    clearAllRowLeaders,
    assignments,
    saveSharedSnapshot,
    clearSharedSnapshot,
    emergencyChanges,
  } = useArrangementStore();

  // 키보드 단축키 훅 초기화 (Ctrl+Z/Y for Undo/Redo)
  useUndoRedoShortcuts();

  const [showSettingsSheet, setShowSettingsSheet] = useState(false);
  const [panelMode, setPanelMode] = useState<'expanded' | 'compact'>('expanded');
  const [showMobileSidebar, setShowMobileSidebar] = useState(true);
  const [notesValue, setNotesValue] = useState<string>('');
  const [isNotesSaving, setIsNotesSaving] = useState(false);
  const notesInitialized = useRef(false);
  const updateArrangementForNotes = useUpdateArrangement();

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

  // 이미지 내보내기 핸들러 (6단계 플로팅 바용)
  const { handleDownloadImage, handleCopyToClipboard, handleShareImage, isGenerating, canShare, isMobile } =
    useImageExportHandlers({
      getFilename: useCallback(
        () => `배치표_${arrangement?.date}_${arrangement?.title?.replace(/\s+/g, '_') ?? ''}`,
        [arrangement?.date, arrangement?.title]
      ),
      desktopCaptureRef,
      mobileCaptureRef,
    });

  // 줄반장 자동 지정 토스트 중복 방지
  const rowLeaderToastShownRef = useRef(false);

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

  // Step 3 자동 최소화를 위한 이전 Step 추적
  const prevStepRef = useRef<number>(workflow.currentStep);

  // 모든 정대원 조회 (AI 추천 분배 인원수 계산용 - 등단자만)
  const { data: membersData } = useMembers({
    member_status: 'REGULAR',
    is_singer: true, // 등단자만 (지휘자/반주자 제외)
    limit: 100,
  });

  // 게스트 멤버 조회 (총 좌석 수에 포함)
  const { data: guestMembersData } = useMembers({
    member_status: 'GUEST',
    is_singer: true,
    limit: 100,
  });

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
    const members = membersData?.data || [];
    const regularCount = members.filter((member) => {
      // 배치표 날짜 이전에 입단한 대원만 포함 (MemberSidebar와 동일 기준)
      if (arrangementDate && member.joined_date && member.joined_date > arrangementDate) return false;
      const attendance = attendanceMap.get(member.id);
      if (!attendance) return true;
      return attendance.is_service_available === true;
    }).length;
    const guestCount = guestMembersData?.data?.length || 0;
    return regularCount + guestCount;
  }, [membersData, guestMembersData, attendanceMap, arrangementDate]);

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

  // 긴급 등단 불가 처리 핸들러 (다이얼로그 열기)
  // - 컨텍스트 메뉴에서 클릭 시 다이얼로그를 열어 처리 방식 선택
  // - 빈 자리 유지 / 자동 당기기 / 수동 처리 중 선택 가능
  const handleEmergencyUnavailable = useCallback(
    (params: { memberId: string; memberName: string; part: Part; row: number; col: number }) => {
      setEmergencyTargetMember(params);
      setEmergencyDialogOpen(true);
    },
    []
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
  // eslint-disable-next-line react-hooks/exhaustive-deps -- arrangementDate, attendances는 attendancesReady 가드용
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

    // 이미 같은 인원 기반으로 AI 추천이 적용되어 있으면 스킵
    const currentTotal = gridLayout?.rowCapacities?.reduce((a, b) => a + b, 0) ?? 0;
    if (gridLayout?.isAIRecommended && currentTotal === totalMembers) return;

    // AI 추천 분배 자동 적용 (totalMembers가 변하면 재적용)
    const recommendation = recommendRowDistribution(totalMembers);
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

  // 현재 적용된 줄 정렬 프리셋 감지 (Step 2 공통)
  const getActivePresetId = useCallback((): string | null => {
    const rows = gridLayout?.rows ?? 0;
    const currentOffsets = gridLayout?.rowOffsets;
    for (const preset of OFFSET_PRESETS) {
      const presetOffsets = preset.getOffsets(rows);
      const presetKeys = Object.keys(presetOffsets);
      const currentKeys = Object.keys(currentOffsets ?? {});

      if (presetKeys.length === 0 && currentKeys.length === 0) return preset.id;
      if (presetKeys.length !== currentKeys.length) continue;

      const matches = presetKeys.every(
        (k) => (currentOffsets ?? {})[Number(k)] === presetOffsets[Number(k)]
      );
      if (matches) return preset.id;
    }
    return null;
  }, [gridLayout?.rows, gridLayout?.rowOffsets]);

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

  // ============================================
  // 워크플로우 단계별 컨텐츠 렌더링
  // ============================================
  const renderWorkflowStepContent = (step: WorkflowStep): ReactNode => {
    switch (step) {
      case 1:
        // 줄 구성 설정 (1단계에서는 줄 수/줄별 인원만 표시)
        // embedded: WorkflowPanel 내부에서 Card wrapper 없이 렌더링 (중첩 Card 방지)
        return (
          <>
            {gridLayout?.isAIRecommended && (
              <div className="flex items-start gap-2 rounded-lg bg-[var(--color-primary-50)] p-3">
                <Sparkles className="mt-0.5 h-4 w-4 flex-shrink-0 text-[var(--color-primary-500)]" />
                <p className="text-sm text-[var(--color-primary-700)]">
                  출석 인원 <strong>{totalMembers}명</strong> 기반으로 줄 구성이 자동 설정되었습니다.
                  필요 시 아래에서 수동으로 조정하세요.
                </p>
              </div>
            )}
            <GridSettingsPanel
              gridLayout={gridLayout}
              onChange={setGridLayout}
              totalMembers={totalMembers}
              workflowStep={1}
              embedded
            />
          </>
        );
      case 2: {
        // 줄 정렬 조정 - 프리셋 + 인라인 화살표 컨트롤
        const activePresetId = getActivePresetId();

        return (
          <div className="space-y-3">
            <p className="text-sm text-[var(--color-text-secondary)]">
              프리셋을 선택하거나, 화살표 버튼으로 각 행을 개별 조정하세요.
            </p>
            <div className="flex flex-wrap gap-2">
              {OFFSET_PRESETS.map((preset) => (
                <Button
                  key={preset.id}
                  size="sm"
                  variant={activePresetId === preset.id ? 'default' : 'outline'}
                  disabled={isReadOnly}
                  onClick={() => applyOffsetPreset(preset.id)}
                  title={preset.description}
                  aria-pressed={activePresetId === preset.id}
                >
                  {preset.name}
                  {preset.id === 'arc' && (
                    <span className={`ml-1 inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-medium ${activePresetId === preset.id ? 'bg-white/20 text-white' : 'bg-[var(--color-warning-100)] text-[var(--color-warning-700)]'}`}>
                      추천
                    </span>
                  )}
                </Button>
              ))}
            </div>
            <p className="text-xs text-[var(--color-text-tertiary)]">
              개별 행은 그리드 왼쪽의 화살표 버튼으로 미세 조정할 수 있습니다.
            </p>
          </div>
        );
      }
      case 3:
        // AI 자동배치 - 버튼을 Card 내부에 직접 배치
        return (
          <div className="space-y-3">
            <p className="text-sm text-[var(--color-text-secondary)]">
              파트, 키, 경력을 고려하여 좌석을 자동으로 배치합니다.
            </p>
            {!isReadOnly && gridLayout && (
              <RecommendButton
                arrangementId={id}
                gridLayout={gridLayout}
                onApply={handleApplyRecommendation}
              />
            )}
            <div className="border-t border-dashed border-[var(--color-border-subtle)] pt-2">
              <p className="flex items-start gap-1.5 text-xs text-[var(--color-text-tertiary)]">
                <SkipForward className="mt-0.5 h-3 w-3 flex-shrink-0" />
                이 단계를 건너뛰고 직접 배치할 수도 있습니다. 건너뛰기를 원하시면
                &apos;이 단계 완료&apos; 버튼을 눌러주세요.
              </p>
            </div>
          </div>
        );
      case 4:
        // 수동 배치 조정
        return (
          <div className="space-y-3">
            <p className="text-sm text-[var(--color-text-secondary)]">
              대원을 선택하고 좌석을 클릭하여 배치를 조정합니다.
            </p>
            <div className="space-y-2">
              <div className="flex items-start gap-2 text-xs text-[var(--color-text-tertiary)]">
                <MousePointer2 className="mt-0.5 h-3 w-3 flex-shrink-0 text-[var(--color-primary-400)]" />
                <span>이름 클릭 후 빈 좌석을 클릭하여 배치</span>
              </div>
              <div className="flex items-start gap-2 text-xs text-[var(--color-text-tertiary)]">
                <MousePointer2 className="mt-0.5 h-3 w-3 flex-shrink-0 text-[var(--color-error-400)]" />
                <span>배치된 좌석 더블클릭으로 제거</span>
              </div>
              <div className="flex items-start gap-2 text-xs text-[var(--color-text-tertiary)]">
                <GripHorizontal className="mt-0.5 h-3 w-3 flex-shrink-0 text-[var(--color-text-tertiary)]" />
                <span>좌석 간 드래그로 자리 이동</span>
              </div>
            </div>
          </div>
        );
      case 5:
        // 줄반장 지정 - 버튼을 Card 내부에 직접 배치
        return (
          <div className="space-y-3">
            <p className="text-sm text-[var(--color-text-secondary)]">각 줄의 대표를 지정합니다.</p>
            {Object.keys(assignments).length === 0 && (
              <div className="rounded-lg bg-[var(--color-background-secondary)] p-4 text-center">
                <p className="text-sm text-[var(--color-text-tertiary)]">
                  아직 배치된 대원이 없습니다.<br/>이전 단계에서 대원을 배치해주세요.
                </p>
              </div>
            )}
            {!isReadOnly && Object.keys(assignments).length > 0 && (
              <div className="flex flex-col gap-2">
                <Button
                  size="sm"
                  variant={rowLeaderMode ? 'default' : 'outline'}
                  onClick={toggleRowLeaderMode}
                  aria-pressed={rowLeaderMode}
                  className={`w-full gap-2 ${rowLeaderMode ? 'bg-orange-500 hover:bg-orange-600' : ''}`}
                >
                  <Crown className="h-4 w-4" />
                  {rowLeaderMode ? '수동 지정 모드 끄기' : '수동 지정 모드'}
                </Button>
                <Button
                  size="sm"
                  variant="primarySubtle"
                  onClick={() => {
                    const candidates = autoAssignRowLeaders();
                    if (candidates.length > 0) {
                      showSuccess(`줄반장 ${candidates.length}명이 자동 지정되었습니다.`);
                    } else {
                      showInfo('자동 지정할 수 있는 줄반장이 없습니다.');
                    }
                  }}
                  className="w-full gap-2"
                >
                  <Sparkles className="h-4 w-4" />
                  자동 지정
                </Button>
                <div className="border-t border-[var(--color-border-subtle)] pt-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setClearRowLeadersDialog(true)}
                    className="w-full gap-2 text-[var(--color-text-tertiary)]"
                  >
                    <Trash2 className="h-4 w-4" />
                    전체 해제
                  </Button>
                </div>
              </div>
            )}
          </div>
        );
      case 6:
        // 지시사항 작성 (에디터는 배치표 하단 인라인으로 표시)
        return (
          <div className="space-y-2">
            <p className="text-sm text-[var(--color-text-secondary)]">
              아래 배치표 하단에서 안내 메모를 작성하세요.
              대원 이동 동선, 대형 변경 등 특이사항을 기록할 수 있습니다.
            </p>
            <p className="text-xs text-[var(--color-text-tertiary)]">
              작성된 내용은 이미지 내보내기에 포함됩니다.
            </p>
          </div>
        );
      case 7: {
        // 내보내기 및 확정
        const noAssignmentsExpanded = Object.keys(assignments).length === 0;
        const currentArrangementStatus = arrangement.status ?? 'DRAFT';
        return (
          <div className="space-y-3">
            {/* 섹션 1: 이미지 내보내기 */}
            <div className="space-y-2 rounded-lg bg-[var(--color-background-secondary)] p-3">
              <p className="text-sm font-medium text-[var(--color-text-primary)]">
                이미지 내보내기
              </p>
              <p className="text-xs text-[var(--color-text-secondary)]">
                완성된 배치표를 이미지로 내보내세요.
              </p>
              <div className="flex flex-col gap-2">
                {canShare && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleShareImage}
                    disabled={noAssignmentsExpanded || isGenerating}
                    aria-busy={isGenerating}
                    className="w-full gap-1"
                  >
                    {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
                    이미지 공유하기
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleDownloadImage}
                  disabled={noAssignmentsExpanded || isGenerating}
                  aria-busy={isGenerating}
                  className="w-full gap-1"
                >
                  {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  PNG 다운로드
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCopyToClipboard}
                  disabled={noAssignmentsExpanded || isGenerating}
                  aria-busy={isGenerating}
                  className="w-full gap-1"
                >
                  {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />}
                  클립보드 복사
                </Button>
              </div>
            </div>

            {/* 섹션 2: 편집 완료 / 확정 안내 */}
            <div className="space-y-2 rounded-lg bg-[var(--color-background-secondary)] p-3">
              <p className="text-sm font-medium text-[var(--color-text-primary)]">
                편집 완료
              </p>
              <p className="text-xs text-[var(--color-text-secondary)]">
                편집이 완료되면 상단 헤더의 버튼으로 잠가주세요.{'\n'}
                편집 완료 후에도 긴급 수정은 가능합니다.
              </p>
              {currentArrangementStatus === 'DRAFT' && (
                <p className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400">
                  <CheckCircle2 className="h-3 w-3" />
                  상단의 &apos;편집 완료&apos; 버튼을 눌러주세요.
                </p>
              )}
              {currentArrangementStatus === 'SHARED' && (
                <p className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                  <Lock className="h-3 w-3" />
                  상단의 &apos;최종 확정&apos; 버튼으로 최종 확정할 수 있습니다.
                </p>
              )}
              {currentArrangementStatus === 'CONFIRMED' && (
                <p className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                  <Lock className="h-3 w-3" />
                  배치표가 확정되었습니다.
                </p>
              )}
            </div>
          </div>
        );
      }
      default:
        return null;
    }
  };

  // ============================================
  // Compact 모드용 플로팅 액션 바 컨텐츠
  // ============================================
  const assignmentsCount = Object.keys(assignments).length;
  const unassignedCount = totalMembers - assignmentsCount;

  const renderFloatingStepContent = (step: WorkflowStep): ReactNode => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-2">
            <p className="text-xs text-[var(--color-text-tertiary)]">
              현재 {gridLayout?.rows ?? 0}줄 / {gridLayout?.rowCapacities?.reduce((a, b) => a + b, 0) ?? 0}석
            </p>
            <Button
              onClick={() => {
                setPanelMode('expanded');
                userOverridePanelRef.current = true;
              }}
              variant="outline"
              className="w-full gap-2"
              size="sm"
            >
              <Settings className="h-4 w-4" />
              줄 구성 설정 열기
            </Button>
            {workflow.isWizardMode && !workflow.completedSteps.has(1) && (
              <Button
                size="sm"
                onClick={() => completeStep(1)}
                className="w-full gap-1"
              >
                <Check className="h-4 w-4" />이 단계 완료
              </Button>
            )}
          </div>
        );
      case 2: {
        // 줄 정렬 조정 Floating UI
        const activePresetId = getActivePresetId();

        return (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              {OFFSET_PRESETS.map((preset) => (
                <Button
                  key={preset.id}
                  size="sm"
                  variant={activePresetId === preset.id ? 'default' : 'outline'}
                  disabled={isReadOnly}
                  onClick={() => applyOffsetPreset(preset.id)}
                  title={preset.description}
                  aria-pressed={activePresetId === preset.id}
                >
                  {preset.name}
                  {preset.id === 'arc' && (
                    <span className={`ml-1 inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-medium ${activePresetId === preset.id ? 'bg-white/20 text-white' : 'bg-[var(--color-warning-100)] text-[var(--color-warning-700)]'}`}>
                      추천
                    </span>
                  )}
                </Button>
              ))}
            </div>
            {workflow.isWizardMode && !workflow.completedSteps.has(2) && (
              <Button
                size="sm"
                onClick={() => completeStep(2)}
                className="w-full gap-1"
              >
                <Check className="h-4 w-4" />이 단계 완료
              </Button>
            )}
          </div>
        );
      }
      case 3:
        // AI 자동배치 Floating UI
        return (
          !isReadOnly && gridLayout && (
            <RecommendButton
              arrangementId={id}
              gridLayout={gridLayout}
              onApply={handleApplyRecommendation}
            />
          )
        );
      case 4:
        // 수동 배치 조정 Floating UI
        return (
          <div className="space-y-2">
            <p className="text-sm text-[var(--color-text-secondary)]">
              대원을 선택 → 좌석 클릭으로 배치를 조정하세요.
            </p>
            {unassignedCount > 0 ? (
              <p className="text-xs text-[var(--color-warning-600)]">미배치: {unassignedCount}명</p>
            ) : totalMembers > 0 ? (
              <p className="text-xs text-[var(--color-success-600)]">전원 배치 완료</p>
            ) : null}
            {workflow.isWizardMode && !workflow.completedSteps.has(4) && (
              <Button
                size="sm"
                onClick={() => completeStep(4)}
                disabled={totalMembers === 0 || unassignedCount !== 0}
                className="w-full gap-1"
              >
                <Check className="h-4 w-4" />이 단계 완료
              </Button>
            )}
          </div>
        );
      case 5:
        return (
          <div className="space-y-2">
            <div className="flex gap-2">
              {!isReadOnly && Object.keys(assignments).length > 0 && (
                <>
                  <Button
                    size="sm"
                    variant={rowLeaderMode ? 'default' : 'outline'}
                    onClick={toggleRowLeaderMode}
                    className={`gap-1 ${rowLeaderMode ? 'bg-orange-500 hover:bg-orange-600' : ''}`}
                  >
                    <Crown className="h-3 w-3" />
                    {rowLeaderMode ? '수동 지정 끄기' : '수동 지정'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const candidates = autoAssignRowLeaders();
                      if (candidates.length > 0) {
                        showSuccess(`줄반장 ${candidates.length}명이 자동 지정되었습니다.`);
                      } else {
                        showInfo('자동 지정할 수 있는 줄반장이 없습니다.');
                      }
                    }}
                    className="gap-1"
                  >
                    <Sparkles className="h-3 w-3 text-yellow-500" />
                    자동 지정
                  </Button>
                </>
              )}
            </div>
            {workflow.isWizardMode && !workflow.completedSteps.has(5) && (
              <Button
                size="sm"
                onClick={() => completeStep(5)}
                className="w-full gap-1"
              >
                <Check className="h-4 w-4" />이 단계 완료
              </Button>
            )}
          </div>
        );
      case 6:
        return (
          <p className="text-xs text-[var(--color-text-secondary)]">
            아래 배치표 하단에서 안내 메모를 작성하세요.
          </p>
        );
      case 7: {
        const noAssignments = Object.keys(assignments).length === 0;
        return (
          <div className="space-y-2">
            <div className="flex gap-2">
              {canShare && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleShareImage}
                  disabled={noAssignments || isGenerating}
                  aria-busy={isGenerating}
                  className="gap-1"
                >
                  {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
                  이미지 공유하기
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={handleDownloadImage}
                disabled={noAssignments || isGenerating}
                aria-busy={isGenerating}
                className="gap-1"
              >
                {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                {isMobile ? '이미지 저장' : 'PNG 다운로드'}
              </Button>
              {!isMobile && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCopyToClipboard}
                  disabled={noAssignments || isGenerating}
                  aria-busy={isGenerating}
                  className="gap-1"
                >
                  {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />}
                  클립보드 복사
                </Button>
              )}
            </div>
            {workflow.isWizardMode && !workflow.completedSteps.has(6) && (
              <Button
                size="sm"
                onClick={() => completeStep(6)}
                className="w-full gap-1"
              >
                <Check className="h-4 w-4" />이 단계 완료
              </Button>
            )}
          </div>
        );
      }
      default:
        return null;
    }
  };

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
              getActivePresetId={getActivePresetId}
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
                  renderStepContent={renderWorkflowStepContent}
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
          <div data-print-hide className="relative flex-shrink-0">
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
              <div className="relative">
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
                />
              </div>
            )}
          </div>
        )}

        {/* Seats Grid + 안내 메모 (세로 배치) */}
        <div className="flex min-w-0 flex-1 flex-col overflow-auto">
          <SeatsGrid
            ref={desktopCaptureRef}
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
            <div data-print-hide className="border-t-2 border-[var(--color-primary-200)] bg-[var(--color-background-secondary)] p-4">
              <div className="mx-auto max-w-3xl rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface)] p-4 shadow-sm">
                <h3 className="mb-2 text-sm font-bold text-[var(--color-text-primary)]">
                  📋 안내 메모
                </h3>
                <p className="mb-3 text-xs text-[var(--color-text-secondary)]">
                  대원 이동 동선, 대형 변경 등 안내사항을 기록하세요. 이미지 내보내기에 포함됩니다.
                </p>
                <NotesEditor
                  value={notesValue}
                  onChange={setNotesValue}
                />
                <div className="mt-3 flex justify-end">
                  <Button
                    size="sm"
                    onClick={async () => {
                      setIsNotesSaving(true);
                      try {
                        await updateArrangementForNotes.mutateAsync({
                          id: arrangement.id,
                          data: { notes: notesValue || null },
                        });
                        showSuccess('안내 메모가 저장되었습니다.');
                      } catch {
                        showError('안내 메모 저장에 실패했습니다.');
                      } finally {
                        setIsNotesSaving(false);
                      }
                    }}
                    disabled={isNotesSaving}
                  >
                    {isNotesSaving ? (
                      <><Loader2 className="mr-1 h-4 w-4 animate-spin" />저장 중...</>
                    ) : (
                      '메모 저장'
                    )}
                  </Button>
                </div>
              </div>
            </div>
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
            {renderFloatingStepContent(workflow.currentStep)}
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
              />
            </div>
          </div>
        )}

        {/* Bottom Sheet - 워크플로우 또는 긴급 수정 패널 (모바일) */}
        {showSettingsSheet && (
          <>
            {/* 배경 오버레이 */}
            <div
              className="absolute inset-0 z-30 bg-black/30"
              onClick={() => setShowSettingsSheet(false)}
              style={{
                animation: 'fadeIn 0.3s ease-out',
              }}
            />
            {/* Bottom Sheet - 60% 높이로 그리드 가시성 확보 */}
            <div
              className="absolute right-0 bottom-0 left-0 z-40 flex max-h-full flex-col rounded-t-2xl bg-[var(--color-background-primary)] shadow-2xl"
              style={{
                height: '60%',
                maxHeight: '500px',
                animation: 'slideUp 0.3s ease-out',
              }}
            >
              {/* 드래그 핸들 */}
              <div className="flex flex-shrink-0 justify-center pt-2 pb-1">
                <div className="h-1 w-10 rounded-full bg-[var(--color-text-tertiary)] opacity-30" />
              </div>
              {/* 헤더 - flex-shrink-0로 항상 표시 보장 */}
              <div className="flex flex-shrink-0 items-center justify-between border-b border-[var(--color-border-default)] bg-[var(--color-surface)] px-4 py-3">
                <h2 className="text-lg font-bold text-[var(--color-text-primary)]">
                  {isEmergencyMode ? '긴급 수정' : '워크플로우'}
                </h2>
                <Button
                  onClick={() => setShowSettingsSheet(false)}
                  variant="ghost"
                  size="sm"
                  className="gap-1"
                >
                  <ChevronDown className="h-4 w-4" />
                  닫기
                </Button>
              </div>
              {/* 패널 콘텐츠 - min-h-0으로 flex overflow 동작 보장 */}
              <div className="min-h-0 flex-1 overflow-auto p-4">
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
                    getActivePresetId={getActivePresetId}
                    totalMembers={totalMembers}
                    onRequestUnavailableMode={handleEmergencyUnavailableFromPanel}
                    onOffsetEditChange={setEmergencyOffsetEditing}
                  />
                ) : (
                  <WorkflowPanel
                    renderStepContent={renderWorkflowStepContent}
                    totalMembers={totalMembers}
                    arrangementStatus={arrangement.status ?? undefined}
                  />
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* CSS 애니메이션 */}
      <style jsx>{`
        @keyframes slideUp {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
      `}</style>

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
