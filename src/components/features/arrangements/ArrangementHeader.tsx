'use client';

import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  Copy,
  Download,
  Loader2,
  Lock,
  Redo2,
  RotateCcw,
  Save,
  Share2,
  Trash2,
  Undo2,
} from 'lucide-react';

import { RefObject, useCallback, useEffect, useRef, useState } from 'react';

import { useRouter } from 'next/navigation';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';

import { useUpdateArrangement } from '@/hooks/useArrangements';
import { useImageGeneration } from '@/hooks/useImageGeneration';
import { useUpdateSeats } from '@/hooks/useSeats';

import { createLogger } from '@/lib/logger';
import { showError, showInfo, showSuccess, showWarning } from '@/lib/toast';

import { useArrangementDraftStore } from '@/store/arrangement-draft-store';
import { useArrangementStore } from '@/store/arrangement-store';
import { WORKFLOW_STEPS } from '@/store/arrangement-store';

import type { ArrangementStatus, Database, Json } from '@/types/database.types';

const logger = createLogger({ prefix: 'ArrangementHeader' });

type Arrangement = Database['public']['Tables']['arrangements']['Row'];

interface ArrangementHeaderProps {
  arrangement: Arrangement;
  desktopCaptureRef?: RefObject<HTMLDivElement | null>;
  mobileCaptureRef?: RefObject<HTMLDivElement | null>;
}

export default function ArrangementHeader({
  arrangement,
  desktopCaptureRef,
  mobileCaptureRef,
}: ArrangementHeaderProps) {
  const router = useRouter();
  const updateArrangement = useUpdateArrangement();
  const updateSeats = useUpdateSeats();
  const { isGenerating, downloadAsImage, copyToClipboard, shareImage, canShare, isMobile } =
    useImageGeneration();
  const {
    assignments,
    gridLayout,
    clearArrangement,
    clearCurrentStepOnly,
    undo,
    redo,
    canUndo,
    canRedo,
    workflow,
    resetWorkflow,
    saveSharedSnapshot,
    clearSharedSnapshot,
  } = useArrangementStore();

  // Draft store - 저장 성공 시 draft 삭제용
  const { deleteDraft } = useArrangementDraftStore();

  // 상태 관련 로직
  const currentStatus = (arrangement.status as ArrangementStatus) || 'DRAFT';

  // CONFIRMED 상태만 읽기 전용 (SHARED는 긴급 수정 가능)
  const isReadOnly = currentStatus === 'CONFIRMED';

  // 상태별 배지 설정
  const getStatusBadge = () => {
    switch (currentStatus) {
      case 'DRAFT':
        return {
          variant: 'secondary' as const,
          label: '작성중',
          className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
        };
      case 'SHARED':
        return {
          variant: 'default' as const,
          label: '공유됨',
          className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
        };
      case 'CONFIRMED':
        return {
          variant: 'default' as const,
          label: '확정됨',
          className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
        };
      default:
        return {
          variant: 'secondary' as const,
          label: '작성중',
          className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
        };
    }
  };

  const statusBadge = getStatusBadge();

  // 현재 활성화된 캡처 ref 선택 (뷰포트 기반)
  const getActiveCaptureRef = useCallback(() => {
    // lg breakpoint (1024px) 기준으로 데스크톱/모바일 구분
    if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
      return desktopCaptureRef;
    }
    return mobileCaptureRef;
  }, [desktopCaptureRef, mobileCaptureRef]);

  const [title, setTitle] = useState(arrangement.title);
  const [conductor, setConductor] = useState(arrangement.conductor || '');
  const [isSaving, setIsSaving] = useState(false);

  // 확인 다이얼로그 상태
  const [resetCurrentStepDialog, setResetCurrentStepDialog] = useState(false);
  const [resetAllDialog, setResetAllDialog] = useState(false);
  const [shareDialog, setShareDialog] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(false);
  const [revertDialog, setRevertDialog] = useState(false);

  // 컴포넌트 마운트 상태 추적 (메모리 누수 방지)
  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // 안전한 상태 업데이트 헬퍼 - 추후 필요 시 활성화
  const _safeSetState = useCallback(
    <T,>(setter: React.Dispatch<React.SetStateAction<T>>, value: T) => {
      if (isMountedRef.current) {
        setter(value);
      }
    },
    []
  );

  // 이미지 내보내기 핸들러 (메모리 누수 방지 적용)
  const handleDownloadImage = useCallback(async () => {
    const captureRef = getActiveCaptureRef();
    if (!captureRef?.current) {
      showWarning('캡처할 영역을 찾을 수 없습니다.');
      return;
    }
    try {
      const filename = `배치표_${arrangement.date}_${title.replace(/\s+/g, '_')}`;
      await downloadAsImage(captureRef.current, filename);
      if (isMountedRef.current) {
        showSuccess('이미지가 다운로드되었습니다.');
      }
    } catch (error) {
      logger.error('이미지 다운로드 실패:', error);
      if (isMountedRef.current) {
        showError('이미지 다운로드에 실패했습니다.', handleDownloadImage);
      }
    }
  }, [arrangement.date, title, downloadAsImage, getActiveCaptureRef]);

  const handleCopyToClipboard = useCallback(async () => {
    const captureRef = getActiveCaptureRef();
    if (!captureRef?.current) {
      showWarning('캡처할 영역을 찾을 수 없습니다.');
      return;
    }
    try {
      await copyToClipboard(captureRef.current);
      if (isMountedRef.current) {
        showSuccess('이미지가 클립보드에 복사되었습니다.');
      }
    } catch (error) {
      logger.error('클립보드 복사 실패:', error);
      if (isMountedRef.current) {
        const message = error instanceof Error ? error.message : '클립보드 복사에 실패했습니다.';
        showError(message);
      }
    }
  }, [copyToClipboard, getActiveCaptureRef]);

  const handleShareImage = useCallback(async () => {
    const captureRef = getActiveCaptureRef();
    if (!captureRef?.current) {
      showWarning('캡처할 영역을 찾을 수 없습니다.');
      return;
    }
    try {
      const filename = `배치표_${arrangement.date}_${title.replace(/\s+/g, '_')}`;
      await shareImage(captureRef.current, filename);
      // 공유 성공 시 toast 불필요 (OS의 공유 UI가 표시됨)
    } catch (error) {
      logger.error('이미지 공유 실패:', error);
      if (isMountedRef.current) {
        const message = error instanceof Error ? error.message : '이미지 공유에 실패했습니다.';
        showError(message);
      }
    }
  }, [arrangement.date, title, shareImage, getActiveCaptureRef]);

  // Sync local state if props change (e.g. refetch)
  useEffect(() => {
    setTitle(arrangement.title);
    setConductor(arrangement.conductor || '');
  }, [arrangement]);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      // 1. Update Metadata and Grid Layout (워크플로우 상태 포함)
      const gridLayoutWithWorkflow = gridLayout
        ? {
            ...gridLayout,
            workflowState: {
              currentStep: workflow.currentStep,
              completedSteps: Array.from(workflow.completedSteps),
              isWizardMode: workflow.isWizardMode,
            },
          }
        : null;

      await updateArrangement.mutateAsync({
        id: arrangement.id,
        data: {
          title,
          conductor: conductor || null,
          grid_layout: gridLayoutWithWorkflow as Json,
          grid_rows: gridLayout?.rows || 6,
        },
      });

      // 2. Update Seats
      const seatsData = Object.values(assignments).map((a) => ({
        memberId: a.memberId,
        row: a.row,
        column: a.col,
        part: a.part,
        isRowLeader: a.isRowLeader || false,
      }));

      await updateSeats.mutateAsync({
        arrangementId: arrangement.id,
        seats: seatsData,
      });

      // 3. 저장 성공 시 draft 삭제
      deleteDraft(arrangement.id);
      logger.debug('Draft deleted after successful save');

      if (isMountedRef.current) {
        showSuccess('저장되었습니다.');
      }
    } catch (error) {
      logger.error('저장 실패:', error);
      if (isMountedRef.current) {
        showError('저장에 실패했습니다.', handleSave);
      }
    } finally {
      if (isMountedRef.current) {
        setIsSaving(false);
      }
    }
  }, [
    arrangement.id,
    title,
    conductor,
    gridLayout,
    assignments,
    updateArrangement,
    updateSeats,
    deleteDraft,
    workflow,
  ]);

  // 현재 단계만 초기화 - 다이얼로그 열기
  const handleResetCurrentStepClick = useCallback(() => {
    const currentStep = workflow.currentStep;

    // 7단계(공유)는 초기화 불필요
    if (currentStep === 7) {
      showInfo('공유 단계에서는 초기화할 내용이 없습니다.');
      return;
    }

    setResetCurrentStepDialog(true);
  }, [workflow.currentStep]);

  // 현재 단계만 초기화 - 실행
  const handleResetCurrentStep = useCallback(() => {
    const currentStep = workflow.currentStep;
    const stepMeta = WORKFLOW_STEPS[currentStep];
    clearCurrentStepOnly(currentStep);
    logger.debug(`단계 ${currentStep} (${stepMeta.title}) 초기화 완료`);
    setResetCurrentStepDialog(false);
  }, [workflow.currentStep, clearCurrentStepOnly]);

  // 전체 초기화 - 다이얼로그 열기
  const handleResetAllClick = useCallback(() => {
    setResetAllDialog(true);
  }, []);

  // 전체 초기화 - 실행
  const handleResetAll = useCallback(() => {
    clearArrangement();
    resetWorkflow();
    logger.debug('전체 초기화 완료');
    setResetAllDialog(false);
  }, [clearArrangement, resetWorkflow]);

  // 공유하기 - 다이얼로그 열기
  const handleShareClick = useCallback(() => {
    setShareDialog(true);
  }, []);

  // 공유하기 (DRAFT → SHARED) - 실행
  const handleShare = useCallback(async () => {
    setShareDialog(false);
    setIsSaving(true);
    try {
      // 먼저 현재 변경사항 저장 (워크플로우 상태 포함)
      const gridLayoutWithWorkflow = gridLayout
        ? {
            ...gridLayout,
            workflowState: {
              currentStep: workflow.currentStep,
              completedSteps: Array.from(workflow.completedSteps),
              isWizardMode: workflow.isWizardMode,
            },
          }
        : null;

      await updateArrangement.mutateAsync({
        id: arrangement.id,
        data: {
          title,
          conductor: conductor || null,
          grid_layout: gridLayoutWithWorkflow as Json,
          grid_rows: gridLayout?.rows || 6,
          status: 'SHARED',
        },
      });

      const seatsData = Object.values(assignments).map((a) => ({
        memberId: a.memberId,
        row: a.row,
        column: a.col,
        part: a.part,
        isRowLeader: a.isRowLeader || false,
      }));

      await updateSeats.mutateAsync({
        arrangementId: arrangement.id,
        seats: seatsData,
      });

      // 공유 성공 시 draft 삭제
      deleteDraft(arrangement.id);

      // 공유 시점 스냅샷 저장 (긴급 변동 추적용)
      saveSharedSnapshot();

      if (isMountedRef.current) {
        showSuccess('자리배치표가 공유되었습니다. 긴급 수정이 필요하면 언제든 수정할 수 있습니다.');
        router.refresh();
      }
    } catch (error) {
      logger.error('공유 실패:', error);
      if (isMountedRef.current) {
        showError('공유에 실패했습니다.', handleShare);
      }
    } finally {
      if (isMountedRef.current) {
        setIsSaving(false);
      }
    }
  }, [
    arrangement.id,
    title,
    conductor,
    gridLayout,
    assignments,
    updateArrangement,
    updateSeats,
    router,
    deleteDraft,
    workflow,
    saveSharedSnapshot,
  ]);

  // 확정하기 - 다이얼로그 열기
  const handleConfirmClick = useCallback(() => {
    setConfirmDialog(true);
  }, []);

  // 확정하기 (SHARED → CONFIRMED) - 실행
  const handleConfirmAction = useCallback(async () => {
    setConfirmDialog(false);
    setIsSaving(true);
    try {
      // 워크플로우 상태 포함
      const gridLayoutWithWorkflow = gridLayout
        ? {
            ...gridLayout,
            workflowState: {
              currentStep: workflow.currentStep,
              completedSteps: Array.from(workflow.completedSteps),
              isWizardMode: workflow.isWizardMode,
            },
          }
        : null;

      await updateArrangement.mutateAsync({
        id: arrangement.id,
        data: {
          title,
          conductor: conductor || null,
          grid_layout: gridLayoutWithWorkflow as Json,
          grid_rows: gridLayout?.rows || 6,
          status: 'CONFIRMED',
          is_published: true, // 레거시 호환성
        },
      });

      const seatsData = Object.values(assignments).map((a) => ({
        memberId: a.memberId,
        row: a.row,
        column: a.col,
        part: a.part,
        isRowLeader: a.isRowLeader || false,
      }));

      await updateSeats.mutateAsync({
        arrangementId: arrangement.id,
        seats: seatsData,
      });

      // 확정 성공 시 draft 삭제
      deleteDraft(arrangement.id);

      if (isMountedRef.current) {
        showSuccess('자리배치표가 확정되었습니다.');
        router.refresh();
      }
    } catch (error) {
      logger.error('확정 실패:', error);
      if (isMountedRef.current) {
        showError('확정에 실패했습니다.', handleConfirmAction);
      }
    } finally {
      if (isMountedRef.current) {
        setIsSaving(false);
      }
    }
  }, [
    arrangement.id,
    title,
    conductor,
    gridLayout,
    assignments,
    updateArrangement,
    updateSeats,
    router,
    deleteDraft,
    workflow,
  ]);

  // 롤백 - 다이얼로그 열기
  const handleRevertClick = useCallback(() => {
    setRevertDialog(true);
  }, []);

  // 롤백 (SHARED → DRAFT) - 실행
  const handleRevertToDraft = useCallback(async () => {
    setRevertDialog(false);
    setIsSaving(true);
    try {
      await updateArrangement.mutateAsync({
        id: arrangement.id,
        data: {
          status: 'DRAFT',
        },
      });

      // 스냅샷 및 변동 이력 초기화
      clearSharedSnapshot();

      if (isMountedRef.current) {
        showSuccess('작성중 상태로 되돌렸습니다.');
        router.refresh();
      }
    } catch (error) {
      logger.error('상태 변경 실패:', error);
      if (isMountedRef.current) {
        showError('상태 변경에 실패했습니다.', handleRevertToDraft);
      }
    } finally {
      if (isMountedRef.current) {
        setIsSaving(false);
      }
    }
  }, [arrangement.id, updateArrangement, router, clearSharedSnapshot]);

  return (
    <div className="flex flex-col items-start justify-between gap-3 border-b border-[var(--color-border-default)] bg-[var(--color-surface)] p-3 sm:flex-row sm:items-center sm:gap-4 sm:p-4">
      <div className="flex w-full items-center gap-2 sm:w-auto sm:gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
          className="h-11 w-11 sm:h-10 sm:w-10"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="min-w-0 flex-1 sm:flex-none">
          <div className="mb-1 flex items-center gap-2">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              readOnly={isReadOnly}
              className={`-ml-2 h-9 w-full border-transparent px-2 text-base font-bold sm:h-8 sm:w-64 sm:text-lg ${isReadOnly ? 'cursor-default' : 'hover:border-[var(--color-border-default)] focus:border-[var(--color-primary-400)]'}`}
            />
            <Badge
              variant={statusBadge.variant}
              className={`flex-shrink-0 text-xs ${statusBadge.className}`}
            >
              {statusBadge.label}
            </Badge>
            {currentStatus === 'SHARED' && (
              <span className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400">
                <AlertTriangle className="h-3 w-3" />
                긴급 수정 가능
              </span>
            )}
          </div>
          {/* 날짜/예배유형 배지는 SeatsGrid CaptureHeader에서 표시 */}
        </div>
      </div>

      <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto">
        {/* AI 배치/과거 배치/줄반장 버튼은 워크플로우 패널 내부로 이동됨 */}
        {/* Undo/Redo: Step 2-6 (실제 편집이 일어나는 단계)에서만 표시 */}
        {!isReadOnly && workflow.currentStep >= 2 && workflow.currentStep <= 6 && (
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              onClick={undo}
              disabled={isSaving || !canUndo()}
              className="h-11 w-11 sm:h-10 sm:w-10"
              title="실행 취소 (Ctrl+Z)"
            >
              <Undo2 className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={redo}
              disabled={isSaving || !canRedo()}
              className="h-11 w-11 sm:h-10 sm:w-10"
              title="다시 실행 (Ctrl+Shift+Z)"
            >
              <Redo2 className="h-4 w-4" />
            </Button>
          </div>
        )}
        {/* 초기화 메뉴: Step 1-6에서만 표시 (Step 7은 공유 단계이므로 제외) */}
        {!isReadOnly && workflow.currentStep >= 1 && workflow.currentStep <= 6 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" disabled={isSaving} className="h-11 gap-2 text-sm sm:h-10">
                <RotateCcw className="h-4 w-4" />
                <span className="hidden sm:inline">초기화</span>
                <ChevronDown className="hidden h-3 w-3 sm:inline" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[200px]">
              <DropdownMenuItem
                onClick={handleResetCurrentStepClick}
                className="cursor-pointer whitespace-nowrap"
              >
                <RotateCcw className="mr-2 h-4 w-4 flex-shrink-0" />
                <span>현재 단계만</span>
                <span className="text-muted-foreground ml-1 text-xs">
                  ({WORKFLOW_STEPS[workflow.currentStep].shortTitle})
                </span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleResetAllClick}
                className="cursor-pointer whitespace-nowrap text-red-600 focus:text-red-600"
              >
                <Trash2 className="mr-2 h-4 w-4 flex-shrink-0" />
                전체 초기화
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        {/* 이미지 메뉴: Step 4 이후 (배치 완료 후 내보내기 가능) */}
        {workflow.currentStep >= 4 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                disabled={isSaving || isGenerating || Object.keys(assignments).length === 0}
                className="h-11 gap-2 text-sm sm:h-10"
              >
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                <span className="hidden sm:inline">이미지</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {/* 모바일에서 Web Share API 지원 시 공유하기 옵션 우선 표시 */}
              {canShare && (
                <DropdownMenuItem
                  onClick={isGenerating ? undefined : handleShareImage}
                  className={isGenerating ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
                >
                  <Share2 className="mr-2 h-4 w-4" />
                  공유하기
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={isGenerating ? undefined : handleDownloadImage}
                className={isGenerating ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
              >
                <Download className="mr-2 h-4 w-4" />
                {isMobile ? '이미지 저장' : 'PNG 다운로드'}
              </DropdownMenuItem>
              {/* 데스크톱에서만 클립보드 복사 표시 (모바일에서는 제한적) */}
              {!isMobile && (
                <DropdownMenuItem
                  onClick={isGenerating ? undefined : handleCopyToClipboard}
                  className={isGenerating ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
                >
                  <Copy className="mr-2 h-4 w-4" />
                  클립보드 복사
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        {/* 상태별 버튼 렌더링 */}
        {currentStatus === 'CONFIRMED' ? (
          <Button disabled className="h-11 gap-2 bg-[var(--color-text-tertiary)] text-sm sm:h-10">
            <Lock className="h-4 w-4" />
            확정됨
          </Button>
        ) : currentStatus === 'SHARED' ? (
          <>
            <Button onClick={handleSave} disabled={isSaving} className="h-11 gap-2 text-sm sm:h-10">
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              저장
            </Button>
            <Button
              variant="outline"
              onClick={handleRevertClick}
              disabled={isSaving}
              className="h-11 gap-2 text-sm sm:h-10"
            >
              <Undo2 className="h-4 w-4" />
              <span className="hidden sm:inline">작성중으로</span>
            </Button>
            <Button
              onClick={handleConfirmClick}
              disabled={isSaving || Object.keys(assignments).length === 0}
              className="h-11 gap-2 bg-green-600 text-sm hover:bg-green-700 sm:h-10"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              확정
            </Button>
          </>
        ) : (
          <>
            <Button onClick={handleSave} disabled={isSaving} className="h-11 gap-2 text-sm sm:h-10">
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              저장
            </Button>
            <Button
              onClick={handleShareClick}
              disabled={isSaving || Object.keys(assignments).length === 0}
              className="h-11 gap-2 bg-blue-600 text-sm hover:bg-blue-700 sm:h-10"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Share2 className="h-4 w-4" />
              )}
              공유
            </Button>
          </>
        )}
      </div>

      {/* 확인 다이얼로그들 */}
      <ConfirmDialog
        open={resetCurrentStepDialog}
        onOpenChange={setResetCurrentStepDialog}
        title="현재 단계 초기화"
        description={`"${WORKFLOW_STEPS[workflow.currentStep].title}" 단계의 작업만 초기화하시겠습니까?\n이전 단계의 설정은 유지됩니다.`}
        confirmLabel="초기화"
        onConfirm={handleResetCurrentStep}
      />

      <ConfirmDialog
        open={resetAllDialog}
        onOpenChange={setResetAllDialog}
        title="전체 초기화"
        description="모든 자리 배치와 그리드 설정을 초기화하시겠습니까?\n1단계부터 다시 시작합니다.\n저장하지 않은 변경사항은 복구할 수 없습니다."
        confirmLabel="초기화"
        variant="destructive"
        onConfirm={handleResetAll}
      />

      <ConfirmDialog
        open={shareDialog}
        onOpenChange={setShareDialog}
        title="배치표 공유"
        description="배치표를 공유하시겠습니까?\n공유 후에도 긴급 수정은 가능합니다."
        confirmLabel="공유"
        onConfirm={handleShare}
      />

      <ConfirmDialog
        open={confirmDialog}
        onOpenChange={setConfirmDialog}
        title="배치표 확정"
        description="배치표를 확정하시겠습니까?\n확정 후에는 더 이상 수정할 수 없습니다."
        confirmLabel="확정"
        variant="warning"
        onConfirm={handleConfirmAction}
      />

      <ConfirmDialog
        open={revertDialog}
        onOpenChange={setRevertDialog}
        title="작성중으로 되돌리기"
        description="배치표를 작성중 상태로 되돌리시겠습니까?"
        confirmLabel="되돌리기"
        onConfirm={handleRevertToDraft}
      />
    </div>
  );
}
