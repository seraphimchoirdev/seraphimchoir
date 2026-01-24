
'use client';

import { useEffect, use, useState, useMemo, useRef, useCallback, ReactNode } from 'react';
import { Spinner } from '@/components/ui/spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Settings, ChevronUp, ChevronDown, CheckCircle2, ArrowRight, Sparkles, Zap, Crown, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ArrangementHeader from '@/components/features/arrangements/ArrangementHeader';
import GridSettingsPanel from '@/components/features/arrangements/GridSettingsPanel';
import { WorkflowPanel } from '@/components/features/arrangements/workflow';
import { useArrangement } from '@/hooks/useArrangements';
import { useArrangementStore, WORKFLOW_STEPS, WorkflowStep } from '@/store/arrangement-store';
import { useUndoRedoShortcuts } from '@/hooks/useUndoRedoShortcuts';
import { useAttendances } from '@/hooks/useAttendances';
import { useMembers } from '@/hooks/useMembers';
import { useEmergencyUnavailable } from '@/hooks/useEmergencyUnavailable';
import { useWorkflowAutoAdvance, useCompleteCurrentStep } from '@/hooks/useWorkflowAutoAdvance';
import { useAutoSaveDraft } from '@/hooks/useAutoSaveDraft';
import { useRestoreDraft } from '@/hooks/useRestoreDraft';
import { DEFAULT_GRID_LAYOUT, GridLayout } from '@/types/grid';
import { calculateGridLayoutFromSeats } from '@/lib/utils/gridUtils';
import { recommendRowDistribution } from '@/lib/row-distribution-recommender';
import { createLogger } from '@/lib/logger';

const logger = createLogger({ prefix: 'ArrangementEditorPage' });

import MemberSidebar from '@/components/features/seats/MemberSidebar';
import SeatsGrid from '@/components/features/seats/SeatsGrid';
import RestoreDialog from '@/components/features/arrangements/RestoreDialog';
import RecommendButton from '@/components/features/arrangements/RecommendButton';
import PastArrangementButton from '@/components/features/arrangements/PastArrangementButton';
import type { RecommendationResponse } from '@/hooks/useRecommendSeats';
import type { ApplyPastResponse } from '@/hooks/usePastArrangement';
import { useAuth } from '@/hooks/useAuth';

export default function ArrangementEditorPage({ params }: { params: Promise<{ id: string }> }) {
    const { hasRole, isLoading: authLoading } = useAuth();

    // 편집 권한: ADMIN, CONDUCTOR만
    const canEdit = hasRole(['ADMIN', 'CONDUCTOR']);
    // 긴급 수정 권한: ADMIN, CONDUCTOR, MANAGER
    const canEmergencyEdit = hasRole(['ADMIN', 'CONDUCTOR', 'MANAGER']);
    const { id } = use(params);
    const { data: arrangement, isLoading, error } = useArrangement(id);
    const {
        setAssignments,
        setGridLayout,
        gridLayout,
        clearHistory,
        compactAllRows,
        resetWorkflow,
        restoreWorkflowState,
        workflow,
        // 줄반장 관련 (Step 6용)
        rowLeaderMode,
        toggleRowLeaderMode,
        autoAssignRowLeaders,
        clearAllRowLeaders,
        assignments,
    } = useArrangementStore();

    // 키보드 단축키 훅 초기화 (Ctrl+Z/Y for Undo/Redo)
    useUndoRedoShortcuts();
    const [showSettingsSheet, setShowSettingsSheet] = useState(false);
    const [showGridSettings, setShowGridSettings] = useState(true); // 데스크톱 그리드 설정 패널 토글
    const [showMobileSidebar, setShowMobileSidebar] = useState(true);

    // 이미지 캡처를 위한 ref (데스크톱/모바일 각각)
    const desktopCaptureRef = useRef<HTMLDivElement>(null);
    const mobileCaptureRef = useRef<HTMLDivElement>(null);

    // 초기 로드 완료 추적 (compactAllRows 중복 실행 방지)
    const initialLoadDoneRef = useRef(false);

    // 모든 정대원 조회 (AI 추천 분배 인원수 계산용 - 등단자만)
    const { data: membersData } = useMembers({
        member_status: 'REGULAR',
        is_singer: true, // 등단자만 (지휘자/반주자 제외)
        limit: 100,
    });

    // 긴급 수정 모드 (SHARED 상태에서 canEmergencyEdit 권한이 있을 때만)
    // DRAFT: 일반 편집 모드 (더블클릭으로 제거)
    // SHARED: 긴급 수정 모드 (컨텍스트 메뉴 표시) - 권한 필요
    // CONFIRMED: 읽기 전용 모드 (수정 불가)
    const isEmergencyMode = arrangement?.status === 'SHARED' && canEmergencyEdit;

    // 해당 날짜의 출석 데이터 조회 (필터 없이 전체)
    // ⭐ 긴급 모드에서는 탭 포커스 시 자동 갱신 (출석 관리에서 변경 후 돌아올 때)
    const { data: attendances } = useAttendances({
        date: arrangement?.date,
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
    const isServiceAvailable = useCallback((memberId: string) => {
        const attendance = attendanceMap.get(memberId);
        // 출석 레코드가 없으면 기본값 true (등단 가능)
        if (!attendance) return true;
        // 출석 레코드가 있으면 is_service_available 값 사용
        return attendance.is_service_available === true;
    }, [attendanceMap]);

    // 등단 가능한 멤버 수 계산 (출석 레코드가 없거나 is_service_available이 true인 경우)
    const totalMembers = useMemo(() => {
        const members = membersData?.data || [];
        return members.filter((member) => {
            const attendance = attendanceMap.get(member.id);
            // 출석 레코드가 없으면 기본값 true (등단 가능)
            if (!attendance) return true;
            // 출석 레코드가 있으면 is_service_available 값 사용
            return attendance.is_service_available === true;
        }).length;
    }, [membersData, attendanceMap]);

    // 워크플로우 자동 진행 훅 (위자드 모드에서 단계 완료 조건 자동 감지)
    useWorkflowAutoAdvance(totalMembers, arrangement?.status ?? undefined);

    // 대원 목록 표시 여부: 4단계(수동 배치 조정)에서만
    const showMemberSidebar = workflow.currentStep === 4;

    // 배치표 상태 및 권한에 따른 읽기 전용 모드
    // - CONFIRMED 상태: 모두 읽기 전용
    // - SHARED 상태: canEmergencyEdit 권한이 없으면 읽기 전용
    // - DRAFT 상태: canEdit 권한이 없으면 읽기 전용
    const isReadOnly = arrangement?.status === 'CONFIRMED' ||
        (arrangement?.status === 'SHARED' && !canEmergencyEdit) ||
        (arrangement?.status === 'DRAFT' && !canEdit);

    // AI 추천 결과 적용 핸들러 (Step 3용)
    const handleApplyRecommendation = useCallback((recommendation: RecommendationResponse, preserveGrid: boolean) => {
        logger.debug('=== AI 추천 결과 적용 ===');
        logger.debug('seats.length:', recommendation.seats.length);
        logger.debug('preserveGrid:', preserveGrid);

        // AI 추천 결과를 store에 적용
        const formattedSeats = recommendation.seats.map(seat => ({
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
        alert(`AI 추천이 적용되었습니다! (품질 점수: ${(qualityScore * 100).toFixed(0)}%)${gridMessage}`);
    }, [setGridLayout, setAssignments]);

    // 과거 배치 적용 핸들러 (Step 3용)
    const handleApplyPastArrangement = useCallback((result: ApplyPastResponse) => {
        const formattedSeats = result.seats.map(seat => ({
            memberId: seat.memberId,
            memberName: seat.memberName,
            part: seat.part,
            row: seat.row,
            col: seat.col,
        }));

        setAssignments(formattedSeats);

        const matchRate = result.totalAvailable > 0
            ? ((result.matchedCount / result.totalAvailable) * 100).toFixed(0)
            : 0;
        const unassignedCount = result.unassignedMembers.length;

        alert(
            `과거 배치가 적용되었습니다!\n` +
            `매칭률: ${matchRate}% (${result.matchedCount}/${result.totalAvailable}명)\n` +
            `미배치: ${unassignedCount}명`
        );
    }, [setAssignments]);

    // 긴급 등단 불가 처리 훅 (단순화된 버전)
    // - 파트 영역 고려: 같은 파트만 당기기
    // - 크로스-행 이동: 행 간 불균형 시 뒷줄에서 앞줄로 이동
    // - ⭐ 자동 저장: gridLayout과 seats를 DB에 즉시 저장
    const { handleEmergencyUnavailable } = useEmergencyUnavailable({
        arrangementId: id,
        date: arrangement?.date || '',
        onSuccess: (message) => alert(message),
        onError: (message) => alert(`오류: ${message}`),
        enableCrossRowMove: true,
        crossRowThreshold: 2,
    });

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
            logger.debug('Skipping initialization - restored from draft');
            return;
        }

        if (arrangement && attendances !== undefined && !initialLoadDoneRef.current) {
            // 초기 로드 완료 마킹
            initialLoadDoneRef.current = true;

            // 새 배치표 로드 시 히스토리 초기화
            clearHistory();

            // DB에 저장된 워크플로우 상태가 있으면 복원
            const savedLayout = arrangement.grid_layout as unknown as GridLayout;
            if (savedLayout?.workflowState && !skipInitialization) {
                // DB에서 워크플로우 상태 복원
                const { currentStep, completedSteps, isWizardMode } = savedLayout.workflowState;
                logger.debug('DB에서 워크플로우 상태 복원:', { currentStep, completedSteps, isWizardMode });
                restoreWorkflowState({
                    currentStep: currentStep as WorkflowStep,
                    completedSteps: new Set(completedSteps as WorkflowStep[]),
                    isWizardMode,
                    expandedSections: new Set([currentStep as WorkflowStep]),
                });
            } else if (!skipInitialization) {
                // 워크플로우 상태가 없으면 (새 배치표 또는 레거시) 초기화
                resetWorkflow();
            }

            // Load seats (등단 불가능한 멤버 필터링)
            if (arrangement.seats && arrangement.seats.length > 0) {
                const formattedSeats = arrangement.seats
                    .filter((seat) => isServiceAvailable(seat.member_id)) // 등단 가능 멤버만
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

                setAssignments(formattedSeats);
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

                setGridLayout(layout);
            }

            // 로드 후 빈 좌석 자동 컴팩션 (등단 불가 멤버 필터링으로 생긴 빈 자리 정리)
            // 약간의 지연 후 실행하여 gridLayout 설정이 반영되도록 함
            setTimeout(() => {
                compactAllRows();
                clearHistory(); // 컴팩션 후 히스토리 클리어
            }, 0);
        }
    }, [arrangement, attendances, isServiceAvailable, setAssignments, setGridLayout, clearHistory, compactAllRows, gridLayout, resetWorkflow, restoreWorkflowState, showRestoreDialog, skipInitialization]);

    if (isLoading || authLoading) {
        return (
            <div className="h-screen flex items-center justify-center">
                <Spinner size="lg" />
            </div>
        );
    }

    if (error || !arrangement) {
        return (
            <div className="p-8">
                <Alert variant="error">
                    <AlertDescription>
                        {error?.message || '배치표를 찾을 수 없습니다.'}
                    </AlertDescription>
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
                // AI 추천 분배 (그리드 설정 추천)
                return (
                    <div className="space-y-3">
                        <p className="text-sm text-[var(--color-text-secondary)]">
                            출석 인원 <strong>{totalMembers}명</strong>을 기반으로 최적의 좌석 배치를 추천합니다.
                        </p>
                        <Button
                            onClick={() => {
                                const recommendation = recommendRowDistribution(totalMembers);
                                setGridLayout({
                                    rows: recommendation.rows,
                                    rowCapacities: recommendation.rowCapacities,
                                    zigzagPattern: gridLayout?.zigzagPattern ?? 'even',
                                    isAIRecommended: true, // AI 추천 분배로 설정됨 (워크플로우 1단계 완료 조건)
                                });
                            }}
                            className="w-full gap-2"
                            disabled={totalMembers === 0}
                        >
                            <Zap className="w-4 h-4" />
                            AI 추천 분배 적용
                        </Button>
                    </div>
                );
            case 2:
                // 좌석 그리드 수동 조정 (2단계에서는 줄 수/줄별 인원만 표시)
                // embedded: WorkflowPanel 내부에서 Card wrapper 없이 렌더링 (중첩 Card 방지)
                return (
                    <GridSettingsPanel
                        gridLayout={gridLayout}
                        onChange={setGridLayout}
                        totalMembers={totalMembers}
                        workflowStep={2}
                        embedded
                    />
                );
            case 3:
                // AI 자동배치 - 버튼을 Card 내부에 직접 배치
                return (
                    <div className="space-y-3">
                        <p className="text-sm text-[var(--color-text-secondary)]">
                            파트, 키, 경력을 고려하여 좌석을 자동으로 배치합니다.
                        </p>
                        {!isReadOnly && gridLayout && (
                            <div className="flex flex-col gap-2">
                                <RecommendButton
                                    arrangementId={id}
                                    gridLayout={gridLayout}
                                    onApply={handleApplyRecommendation}
                                />
                                <PastArrangementButton
                                    arrangementId={id}
                                    date={arrangement.date}
                                    onApply={handleApplyPastArrangement}
                                />
                            </div>
                        )}
                    </div>
                );
            case 4:
                // 수동 배치 조정
                return (
                    <div className="space-y-3">
                        <p className="text-sm text-[var(--color-text-secondary)]">
                            대원을 선택하고 좌석을 클릭하여 배치를 조정합니다.
                        </p>
                        <ul className="text-xs text-[var(--color-text-tertiary)] space-y-1 list-disc list-inside">
                            <li>대원 목록에서 이름 클릭 → 좌석 클릭</li>
                            <li>배치된 좌석 더블클릭으로 제거</li>
                            <li>좌석 간 드래그로 이동</li>
                        </ul>
                    </div>
                );
            case 5:
                // 행별 Offset 조정
                return (
                    <div className="space-y-3">
                        <p className="text-sm text-[var(--color-text-secondary)]">
                            지휘자 시야 확보를 위해 줄 위치를 조정합니다.
                        </p>
                        <p className="text-xs text-[var(--color-text-tertiary)]">
                            각 행 양쪽의 화살표 버튼으로 위치를 조정하세요.
                        </p>
                    </div>
                );
            case 6:
                // 줄반장 지정 - 버튼을 Card 내부에 직접 배치
                return (
                    <div className="space-y-3">
                        <p className="text-sm text-[var(--color-text-secondary)]">
                            각 줄의 대표를 지정합니다.
                        </p>
                        {!isReadOnly && Object.keys(assignments).length > 0 && (
                            <div className="flex flex-col gap-2">
                                <Button
                                    variant={rowLeaderMode ? "default" : "outline"}
                                    onClick={toggleRowLeaderMode}
                                    className={`w-full gap-2 ${rowLeaderMode ? 'bg-orange-500 hover:bg-orange-600' : ''}`}
                                >
                                    <Crown className="w-4 h-4" />
                                    {rowLeaderMode ? '수동 지정 모드 끄기' : '수동 지정 모드'}
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        const candidates = autoAssignRowLeaders();
                                        if (candidates.length > 0) {
                                            alert(`줄반장 ${candidates.length}명이 자동 지정되었습니다.`);
                                        } else {
                                            alert('자동 지정할 수 있는 줄반장이 없습니다.');
                                        }
                                    }}
                                    className="w-full gap-2"
                                >
                                    <Sparkles className="w-4 h-4 text-yellow-500" />
                                    자동 지정
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        if (confirm('모든 줄반장 지정을 해제하시겠습니까?')) {
                                            clearAllRowLeaders();
                                        }
                                    }}
                                    className="w-full gap-2 text-red-600 hover:text-red-700"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    전체 해제
                                </Button>
                            </div>
                        )}
                    </div>
                );
            case 7:
                // 배치표 공유
                return (
                    <div className="space-y-3">
                        <p className="text-sm text-[var(--color-text-secondary)]">
                            배치표를 저장하고 공유합니다.
                        </p>
                        <div className="flex flex-col gap-2">
                            <p className="text-xs text-[var(--color-text-tertiary)]">
                                상단 헤더의 저장/공유 버튼을 이용하세요.
                            </p>
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="flex flex-col h-screen bg-[var(--color-background-primary)]">
            {/* Draft 복원 다이얼로그 */}
            <RestoreDialog
                open={showRestoreDialog}
                draftInfo={draftInfo}
                hasDbData={hasDbData}
                onChoice={handleRestoreChoice}
                onClose={closeDialog}
            />

            <ArrangementHeader
                arrangement={arrangement}
                desktopCaptureRef={desktopCaptureRef}
                mobileCaptureRef={mobileCaptureRef}
            />

            {/* 데스크톱: 3패널 가로 배치 (640px 이상 - Z Fold 펼침 대응) */}
            <div className="hidden sm:flex flex-1 overflow-hidden gap-4 p-4">
                {/* 워크플로우 패널 - 토글 가능 */}
                {showGridSettings ? (
                    <div className="relative animate-in slide-in-from-left duration-300 w-80 flex-shrink-0">
                        <WorkflowPanel
                            renderStepContent={renderWorkflowStepContent}
                            totalMembers={totalMembers}
                            arrangementStatus={arrangement.status ?? undefined}
                            className="h-full overflow-hidden"
                        />
                        {/* 접기 버튼 */}
                        <Button
                            onClick={() => setShowGridSettings(false)}
                            variant="ghost"
                            size="sm"
                            className="absolute -right-3 top-4 z-10 bg-[var(--color-surface)] border border-[var(--color-border-default)] shadow-md hover:bg-[var(--color-background-secondary)]"
                            title="워크플로우 패널 숨기기"
                        >
                            <ChevronDown className="h-4 w-4 rotate-90" />
                        </Button>
                    </div>
                ) : (
                    <div className="flex items-start pt-4 animate-in slide-in-from-left duration-300">
                        <Button
                            onClick={() => setShowGridSettings(true)}
                            variant="outline"
                            size="sm"
                            className="flex-col h-auto py-4 px-3 gap-1 bg-[var(--color-surface)]"
                            title="워크플로우 패널 열기"
                        >
                            <Settings className="h-5 w-5" />
                            <span className="text-[10px]" style={{ writingMode: 'vertical-rl' }}>
                                워크플로우
                            </span>
                        </Button>
                    </div>
                )}

                {/* Member Sidebar - 수동 배치 조정 단계(4단계)에서만 표시 */}
                {showMemberSidebar && (
                    <MemberSidebar date={arrangement.date} hidePlaced={true} isEmergencyMode={isEmergencyMode} />
                )}

                {/* Seats Grid */}
                <SeatsGrid
                    ref={desktopCaptureRef}
                    gridLayout={gridLayout}
                    arrangementInfo={{
                        date: arrangement.date,
                        title: arrangement.title,
                        conductor: arrangement.conductor || undefined,
                    }}
                    showCaptureInfo={true}
                    onEmergencyUnavailable={handleEmergencyUnavailable}
                    isReadOnly={isReadOnly}
                    isEmergencyMode={isEmergencyMode}
                    workflowStep={workflow.currentStep}
                />
            </div>

            {/* 모바일: 상단 그리드 + 하단 대원 목록 (Split View, 640px 미만) */}
            <div className="flex sm:hidden flex-col flex-1 overflow-hidden relative">
                {/* 상단: 좌석 그리드 (Scrollable) */}
                <div className="flex-1 overflow-auto relative">
                    <SeatsGrid
                        ref={mobileCaptureRef}
                        gridLayout={gridLayout}
                        arrangementInfo={{
                            date: arrangement.date,
                            title: arrangement.title,
                            conductor: arrangement.conductor || undefined,
                        }}
                        showCaptureInfo={true}
                        onEmergencyUnavailable={handleEmergencyUnavailable}
                        isReadOnly={isReadOnly}
                        isEmergencyMode={isEmergencyMode}
                        workflowStep={workflow.currentStep}
                    />

                    {/* 그리드 설정 버튼 (Floating) */}
                    <Button
                        onClick={() => setShowSettingsSheet(true)}
                        variant="outline"
                        size="icon"
                        className="absolute top-4 right-4 h-10 w-10 rounded-full shadow-md bg-white/90 backdrop-blur-sm z-10"
                    >
                        <Settings className="h-5 w-5" />
                    </Button>
                </div>

                {/* 하단: 대원 목록 (Collapsible) - 수동 배치 조정 단계(4단계)에서만 표시 */}
                {showMemberSidebar && (
                    <div
                        className={`bg-[var(--color-surface)] border-t border-[var(--color-border-default)] shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] flex flex-col z-20 transition-all duration-300 ease-in-out ${showMobileSidebar ? 'h-[320px]' : 'h-[40px]'
                            }`}
                    >
                        {/* Toggle Handle */}
                        <button
                            onClick={() => setShowMobileSidebar(!showMobileSidebar)}
                            className="flex items-center justify-center h-10 w-full hover:bg-[var(--color-background-secondary)] active:bg-[var(--color-background-tertiary)] transition-colors cursor-pointer"
                            aria-label={showMobileSidebar ? "대원 목록 접기" : "대원 목록 펼치기"}
                        >
                            <div className="w-10 h-1 rounded-full bg-[var(--color-text-tertiary)] opacity-30 mb-1" />
                            {showMobileSidebar ? (
                                <ChevronDown className="absolute right-4 h-4 w-4 text-[var(--color-text-tertiary)]" />
                            ) : (
                                <ChevronUp className="absolute right-4 h-4 w-4 text-[var(--color-text-tertiary)]" />
                            )}
                        </button>

                        <div className={`flex-1 overflow-hidden ${!showMobileSidebar && 'hidden'}`}>
                            <MemberSidebar
                                date={arrangement.date}
                                hidePlaced={true}
                                compact={true}
                                isEmergencyMode={isEmergencyMode}
                            />
                        </div>
                    </div>
                )}

                {/* Bottom Sheet - 워크플로우 (모바일) */}
                {showSettingsSheet && (
                    <>
                        {/* 배경 오버레이 */}
                        <div
                            className="absolute inset-0 bg-black/30 z-30"
                            onClick={() => setShowSettingsSheet(false)}
                            style={{
                                animation: 'fadeIn 0.3s ease-out',
                            }}
                        />
                        {/* Bottom Sheet - 60% 높이로 그리드 가시성 확보 */}
                        <div
                            className="absolute left-0 right-0 bottom-0 z-40 flex flex-col bg-[var(--color-background-primary)] rounded-t-2xl shadow-2xl max-h-full"
                            style={{
                                height: '60%',
                                maxHeight: '500px',
                                animation: 'slideUp 0.3s ease-out',
                            }}
                        >
                            {/* 드래그 핸들 */}
                            <div className="flex-shrink-0 flex justify-center pt-2 pb-1">
                                <div className="w-10 h-1 rounded-full bg-[var(--color-text-tertiary)] opacity-30" />
                            </div>
                            {/* 헤더 - flex-shrink-0로 항상 표시 보장 */}
                            <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-[var(--color-border-default)] bg-[var(--color-surface)]">
                                <h2 className="text-lg font-bold text-[var(--color-text-primary)]">워크플로우</h2>
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
                            {/* 워크플로우 패널 - min-h-0으로 flex overflow 동작 보장 */}
                            <div className="flex-1 min-h-0 overflow-auto p-4">
                                <WorkflowPanel
                                    renderStepContent={renderWorkflowStepContent}
                                    totalMembers={totalMembers}
                                    arrangementStatus={arrangement.status ?? undefined}
                                />
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
        </div>
    );
}
