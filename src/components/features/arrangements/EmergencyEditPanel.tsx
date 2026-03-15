'use client';

import {
  AlertTriangle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Crown,
  Minus,
  Plus,
  Shrink,
  Sparkles,
  Trash2,
  UserMinus,
  UserPlus,
} from 'lucide-react';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

import { showError, showInfo, showSuccess } from '@/lib/toast';
import { cn } from '@/lib/utils';

import { useArrangementStore } from '@/store/arrangement-store';

import { GRID_CONSTRAINTS, GridLayout, OFFSET_PRESETS } from '@/types/grid';
import type { Database } from '@/types/database.types';

import EmergencyChangesBanner from './EmergencyChangesBanner';

type Part = Database['public']['Enums']['part'];

interface EmergencyEditPanelProps {
  /** 배치표 ID */
  arrangementId: string;
  /** 배치표 날짜 */
  date: string;
  /** 예배 일정 ID (같은 날짜에 여러 예배가 있을 때 식별용) */
  serviceScheduleId?: string;
  /** 그리드 레이아웃 */
  gridLayout: GridLayout | null;
  /** 그리드 레이아웃 변경 핸들러 */
  onGridLayoutChange: (layout: GridLayout) => void;
  /** 등단 불가 다이얼로그 열기 핸들러 (멤버 선택 모드 진입) */
  onOpenUnavailableDialog: (params: {
    memberId: string;
    memberName: string;
    part: Part;
    row: number;
    col: number;
  }) => void;
  /** 등단 가능 다이얼로그 열기 핸들러 */
  onOpenAvailableDialog: () => void;
  /** 줄반장 전체 해제 다이얼로그 열기 핸들러 */
  onOpenClearRowLeadersDialog: () => void;
  /** 현재 적용된 오프셋 프리셋 ID 감지 함수 */
  getActivePresetId: () => string | null;
  /** 총 출석 인원 */
  totalMembers: number;
  /** 접힌 상태 여부 (데스크톱 전용) */
  collapsed?: boolean;
  /** 접기/펼치기 토글 핸들러 (데스크톱 전용) */
  onToggleCollapse?: () => void;
  /** 등단 불가 좌석 선택 모드 요청 핸들러 (모바일용) */
  onRequestUnavailableMode?: () => void;
  /** 줄 정렬 조정 아코디언 열림/닫힘 변경 콜백 (그리드 인라인 오프셋 컨트롤 표시용) */
  onOffsetEditChange?: (isEditing: boolean) => void;
  className?: string;
}

/**
 * 긴급 수정 전용 패널
 *
 * SHARED/CONFIRMED 상태에서 WorkflowPanel 대신 표시되는 간소화된 편집 패널.
 * 아코디언 섹션으로 구성되어, 필요한 기능만 펼쳐서 사용합니다.
 *
 * 섹션:
 * 1. 인원 변경 (항상 펼쳐짐) — 등단 불가/가능/빈자리 정리
 * 2. 줄 구성 조정 (아코디언) — 줄별 인원수 -/+ 조정
 * 3. 줄 정렬 조정 (아코디언) — 프리셋 선택, 오프셋 미세 조정
 * 4. 줄반장 지정 (아코디언) — 수동/자동/해제
 * 5. 변동 이력 (있을 때만 표시)
 */
export default function EmergencyEditPanel({
  arrangementId,
  date,
  serviceScheduleId,
  gridLayout,
  onGridLayoutChange,
  onOpenAvailableDialog,
  onOpenClearRowLeadersDialog,
  getActivePresetId,
  totalMembers,
  collapsed = false,
  onToggleCollapse,
  onRequestUnavailableMode,
  onOffsetEditChange,
  className,
}: EmergencyEditPanelProps) {
  // Store 액션
  const {
    assignments,
    compactAllRows,
    shrinkRowCapacitiesToFit,
    applyOffsetPreset,
    rowLeaderMode,
    toggleRowLeaderMode,
    autoAssignRowLeaders,
    emergencyChanges,
  } = useArrangementStore();

  // 아코디언 펼침 상태
  const [gridOpen, setGridOpen] = useState(false);
  const [offsetOpen, setOffsetOpen] = useState(false);
  const [rowLeaderOpen, setRowLeaderOpen] = useState(false);

  // 빈자리 정리 확인 다이얼로그
  const [compactDialogOpen, setCompactDialogOpen] = useState(false);

  // 줄별 인원수 로컬 상태 (디바운스)
  const currentCapacities = gridLayout?.rowCapacities ?? [];
  const currentRows = gridLayout?.rows ?? 0;
  const [localCapacities, setLocalCapacities] = useState(currentCapacities);

  // 외부 변경 시 로컬 상태 동기화
  const capacitiesKey = JSON.stringify(currentCapacities);
  useEffect(() => {
    setLocalCapacities((prev) => {
      if (
        prev.length === currentCapacities.length &&
        prev.every((v, i) => v === currentCapacities[i])
      ) {
        return prev;
      }
      return currentCapacities;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [capacitiesKey]);

  // 줄별 인원 디바운스: 로컬 값이 바뀌면 400ms 후 반영
  useEffect(() => {
    const changed =
      localCapacities.some((v, i) => v !== currentCapacities[i]) ||
      localCapacities.length !== currentCapacities.length;
    if (!changed) return;
    const timer = setTimeout(() => {
      if (!gridLayout) return;
      onGridLayoutChange({
        ...gridLayout,
        rowCapacities: localCapacities,
        isManuallyConfigured: true,
      });
    }, 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localCapacities, currentCapacities]);

  // 빈자리 정리 미리보기 계산
  const compactPreview = useMemo(() => {
    if (!gridLayout) return { movedCount: 0, emptyRemoved: 0 };

    let movedCount = 0;
    let emptyRemoved = 0;

    // 이동될 멤버 수 계산
    for (let row = 1; row <= gridLayout.rowCapacities.length; row++) {
      const maxCol = gridLayout.rowCapacities[row - 1] || 0;
      const rowMembers: Array<{ col: number }> = [];

      Object.entries(assignments).forEach(([key, member]) => {
        const [rowStr] = key.split('-');
        if (parseInt(rowStr, 10) === row) {
          rowMembers.push({ col: member.col });
        }
      });

      rowMembers.sort((a, b) => a.col - b.col);

      // 빈 좌석이 있는 행에서 이동할 멤버 수 계산
      rowMembers.forEach(({ col }, index) => {
        if (col !== index + 1) movedCount++;
      });

      // 축소될 빈자리 수 계산
      const membersInRow = rowMembers.length;
      if (maxCol > membersInRow) {
        emptyRemoved += maxCol - membersInRow;
      }
    }

    return { movedCount, emptyRemoved };
  }, [gridLayout, assignments]);

  // 빈자리 정리 실행
  const handleCompactAllRows = useCallback(() => {
    // 변동 전 스냅샷
    const storeState = useArrangementStore.getState();
    const beforeSnapshot = {
      assignments: { ...storeState.assignments },
      gridLayout: structuredClone(storeState.gridLayout!),
    };

    compactAllRows();
    shrinkRowCapacitiesToFit();

    // 변동 이력에 기록
    const addEmergencyChange = useArrangementStore.getState().addEmergencyChange;
    addEmergencyChange({
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      type: 'UNAVAILABLE',
      memberId: '__COMPACT__',
      memberName: '빈자리 정리',
      part: 'SPECIAL' as Part,
      processMode: 'LEAVE_EMPTY',
      cascadeChanges: [{
        step: 1,
        type: 'SHRINK',
        description: `빈자리 정리: ${compactPreview.movedCount}명 이동, ${compactPreview.emptyRemoved}개 빈자리 제거`,
      }],
      movedMemberCount: compactPreview.movedCount,
      beforeSnapshot,
    });

    showSuccess(`빈자리 정리 완료: ${compactPreview.movedCount}명 이동, ${compactPreview.emptyRemoved}개 빈자리 제거`);
    setCompactDialogOpen(false);
  }, [compactAllRows, shrinkRowCapacitiesToFit, compactPreview]);

  const activePresetId = getActivePresetId();
  const assignmentsCount = Object.keys(assignments).length;
  const changesCount = emergencyChanges.changes.length;
  const hasSnapshot = !!emergencyChanges.sharedSnapshot;

  // ============================
  // 접힌 상태: 아이콘 스트립 (w-16)
  // ============================
  if (collapsed) {
    return (
      <div className={cn(
        'flex h-full w-16 flex-col items-center rounded-xl border border-amber-200 bg-[var(--color-surface)] py-4 shadow-sm dark:border-amber-800',
        className,
      )}>
        {/* 펼치기 버튼 */}
        <Button
          onClick={onToggleCollapse}
          variant="outline"
          size="icon"
          className="mb-3 h-10 w-10 flex-shrink-0 rounded-full border-amber-300 text-amber-600 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400"
          title="긴급 수정 패널 펼치기"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>

        {/* 등단 불가 */}
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
          title="등단 불가 처리"
          onClick={() => {
            if (onRequestUnavailableMode) {
              onRequestUnavailableMode();
            } else {
              showInfo('그리드에서 제거할 대원의 좌석을 클릭하세요.');
            }
          }}
        >
          <UserMinus className="h-5 w-5" />
        </Button>

        {/* 등단 가능 추가 */}
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
          title="등단 가능 추가"
          onClick={onOpenAvailableDialog}
        >
          <UserPlus className="h-5 w-5" />
        </Button>

        {/* 빈자리 정리 */}
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 text-[var(--color-text-secondary)] hover:bg-[var(--color-background-secondary)]"
          title="빈자리 정리"
          onClick={() => {
            if (compactPreview.movedCount === 0 && compactPreview.emptyRemoved === 0) {
              showInfo('정리할 빈자리가 없습니다.');
              return;
            }
            setCompactDialogOpen(true);
          }}
        >
          <Shrink className="h-5 w-5" />
        </Button>

        {/* 변동 건수 배지 */}
        {changesCount > 0 && (
          <div className="mt-3 flex h-7 w-7 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-700 dark:bg-amber-900/50 dark:text-amber-300" title={`변동 ${changesCount}건`}>
            {changesCount}
          </div>
        )}

        {/* 빈자리 정리 확인 다이얼로그 (접힌 상태에서도 필요) */}
        <ConfirmDialog
          open={compactDialogOpen}
          onOpenChange={setCompactDialogOpen}
          title="빈자리 정리"
          description={
            <div className="space-y-2">
              <p>줄 끝의 빈자리를 정리하고, 빈 칸을 왼쪽으로 당깁니다.</p>
              <div className="rounded-lg bg-[var(--color-background-secondary)] p-3 text-sm">
                <p><strong>{compactPreview.movedCount}명</strong> 이동 예정</p>
                <p><strong>{compactPreview.emptyRemoved}개</strong> 빈자리 제거 예정</p>
              </div>
            </div>
          }
          confirmLabel="정리하기"
          variant="warning"
          onConfirm={handleCompactAllRows}
        />
      </div>
    );
  }

  // ============================
  // 펼쳐진 상태: 전체 패널 (w-80)
  // ============================
  return (
    <div className={cn(
      'flex h-full flex-col overflow-hidden rounded-xl border border-amber-200 bg-[var(--color-surface)] shadow-sm dark:border-amber-800',
      className,
    )}>
      {/* 헤더 */}
      <div className="flex items-center justify-between border-b border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800 dark:bg-amber-950/30">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <h2 className="text-sm font-bold text-amber-700 dark:text-amber-300">긴급 수정 모드</h2>
        </div>
        {onToggleCollapse && (
          <Button
            onClick={onToggleCollapse}
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-amber-600 hover:bg-amber-100 dark:text-amber-400 dark:hover:bg-amber-900/50"
            title="패널 접기"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* 스크롤 가능한 컨텐츠 영역 */}
      <div className="flex-1 space-y-3 overflow-y-auto p-3">
        {/* ============================== */}
        {/* 섹션 1: 인원 변경 (항상 펼쳐짐) */}
        {/* ============================== */}
        <div className="overflow-hidden rounded-lg border border-red-200 dark:border-red-800/50">
          <div className="flex items-center gap-3 bg-red-50/50 px-4 py-3 dark:bg-red-950/20">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400">
              <UserMinus className="h-3.5 w-3.5" />
            </div>
            <span className="text-sm font-semibold text-red-700 dark:text-red-300">인원 변경</span>
          </div>
          <div className="flex flex-col gap-2 border-t border-red-200/50 p-3 dark:border-red-800/30">
            <Button
              size="sm"
              variant="outline"
              className="w-full justify-start gap-2 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/30"
              onClick={() => {
                if (onRequestUnavailableMode) {
                  onRequestUnavailableMode();
                } else {
                  showInfo('그리드에서 제거할 대원의 좌석을 클릭하세요.');
                }
              }}
            >
              <UserMinus className="h-4 w-4" />
              등단 불가 처리
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="w-full justify-start gap-2 border-emerald-200 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
              onClick={onOpenAvailableDialog}
            >
              <UserPlus className="h-4 w-4" />
              등단 가능 추가
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={() => {
                if (compactPreview.movedCount === 0 && compactPreview.emptyRemoved === 0) {
                  showInfo('정리할 빈자리가 없습니다.');
                  return;
                }
                setCompactDialogOpen(true);
              }}
            >
              <Minus className="h-4 w-4" />
              빈자리 정리
            </Button>
          </div>
        </div>

        {/* ============================== */}
        {/* 섹션 2: 줄 구성 조정 (아코디언) */}
        {/* ============================== */}
        <Collapsible open={gridOpen} onOpenChange={setGridOpen} className="overflow-hidden rounded-lg border border-blue-200 dark:border-blue-800/50">
          <CollapsibleTrigger className="flex w-full items-center justify-between bg-blue-50/50 px-4 py-3 transition-colors hover:bg-blue-50 dark:bg-blue-950/20 dark:hover:bg-blue-950/30">
            <div className="flex items-center gap-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400">
                <Plus className="h-3.5 w-3.5" />
              </div>
              <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">줄 구성 조정</span>
            </div>
            {gridOpen ? (
              <ChevronDown className="h-4 w-4 text-blue-400 dark:text-blue-500" />
            ) : (
              <ChevronRight className="h-4 w-4 text-blue-400 dark:text-blue-500" />
            )}
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="space-y-2 border-t border-blue-200/50 p-3 dark:border-blue-800/30">
              <p className="text-xs text-[var(--color-text-tertiary)]">
                줄별 인원수를 조정합니다. 줄 수 변경은 비활성화됩니다.
              </p>
              {localCapacities.map((capacity, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="w-10 text-xs font-medium">{idx + 1}줄:</span>
                  <div className="flex h-9 items-stretch overflow-hidden rounded-md border border-[var(--color-border)] focus-within:ring-2 focus-within:ring-[var(--color-primary-500)] focus-within:ring-offset-1">
                    <button
                      type="button"
                      aria-label={`${idx + 1}줄 인원 감소`}
                      disabled={capacity <= 0}
                      onClick={() => {
                        const newCaps = [...localCapacities];
                        newCaps[idx] = Math.max(0, capacity - 1);
                        setLocalCapacities(newCaps);
                      }}
                      className="flex w-9 items-center justify-center border-r border-[var(--color-border)] bg-[var(--color-background-tertiary)] text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-border-default)] hover:text-[var(--color-text-primary)] active:bg-[var(--color-border-strong)] disabled:pointer-events-none disabled:opacity-40"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <input
                      type="text"
                      inputMode="numeric"
                      role="spinbutton"
                      aria-label={`${idx + 1}줄 인원 수`}
                      aria-valuemin={0}
                      aria-valuemax={GRID_CONSTRAINTS.MAX_CAPACITY_PER_ROW}
                      aria-valuenow={capacity}
                      value={capacity}
                      onChange={(e) => {
                        const raw = e.target.value;
                        if (raw === '') {
                          const newCaps = [...localCapacities];
                          newCaps[idx] = 0;
                          setLocalCapacities(newCaps);
                          return;
                        }
                        if (!/^\d+$/.test(raw)) return;
                        const newCaps = [...localCapacities];
                        newCaps[idx] = parseInt(raw, 10);
                        setLocalCapacities(newCaps);
                      }}
                      onBlur={(e) => {
                        const num = parseInt(e.target.value, 10) || 0;
                        const clamped = Math.min(GRID_CONSTRAINTS.MAX_CAPACITY_PER_ROW, Math.max(0, num));
                        if (clamped !== capacity) {
                          const newCaps = [...localCapacities];
                          newCaps[idx] = clamped;
                          setLocalCapacities(newCaps);
                        }
                      }}
                      className="w-10 bg-transparent text-center text-sm font-medium tabular-nums outline-none"
                    />
                    <button
                      type="button"
                      aria-label={`${idx + 1}줄 인원 증가`}
                      disabled={capacity >= GRID_CONSTRAINTS.MAX_CAPACITY_PER_ROW}
                      onClick={() => {
                        const newCaps = [...localCapacities];
                        newCaps[idx] = Math.min(GRID_CONSTRAINTS.MAX_CAPACITY_PER_ROW, capacity + 1);
                        setLocalCapacities(newCaps);
                      }}
                      className="flex w-9 items-center justify-center border-l border-[var(--color-border)] bg-[var(--color-primary-50)] text-[var(--color-primary-600)] transition-colors hover:bg-[var(--color-primary-100)] hover:text-[var(--color-primary-700)] active:bg-[var(--color-primary-200)] disabled:pointer-events-none disabled:opacity-40"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                  <span className="text-xs text-[var(--color-text-tertiary)]">명</span>
                </div>
              ))}
              {/* 총 좌석 수 */}
              <div className="border-t border-[var(--color-border-subtle)] pt-2">
                <div className="flex justify-between text-xs">
                  <span className="text-[var(--color-text-secondary)]">총 좌석:</span>
                  <span className="font-semibold text-[var(--color-primary-600)]">
                    {localCapacities.reduce((a, b) => a + b, 0)}개
                  </span>
                </div>
                {localCapacities.reduce((a, b) => a + b, 0) !== totalMembers && (
                  <p className="mt-1 flex items-center gap-1 text-[10px] text-[var(--color-warning-600)]">
                    <AlertTriangle className="h-3 w-3 flex-shrink-0" />
                    출석 인원({totalMembers}명)과 불일치
                  </p>
                )}
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* ============================== */}
        {/* 섹션 3: 줄 정렬 조정 (아코디언) */}
        {/* ============================== */}
        <Collapsible open={offsetOpen} onOpenChange={(open) => { setOffsetOpen(open); onOffsetEditChange?.(open); }} className="overflow-hidden rounded-lg border border-violet-200 dark:border-violet-800/50">
          <CollapsibleTrigger className="flex w-full items-center justify-between bg-violet-50/50 px-4 py-3 transition-colors hover:bg-violet-50 dark:bg-violet-950/20 dark:hover:bg-violet-950/30">
            <div className="flex items-center gap-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-100 text-violet-600 dark:bg-violet-900/50 dark:text-violet-400">
                <Shrink className="h-3.5 w-3.5" />
              </div>
              <span className="text-sm font-semibold text-violet-700 dark:text-violet-300">줄 정렬 조정</span>
            </div>
            {offsetOpen ? (
              <ChevronDown className="h-4 w-4 text-violet-400 dark:text-violet-500" />
            ) : (
              <ChevronRight className="h-4 w-4 text-violet-400 dark:text-violet-500" />
            )}
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="space-y-3 border-t border-violet-200/50 p-3 dark:border-violet-800/30">
              <p className="text-xs text-[var(--color-text-tertiary)]">
                프리셋을 선택하거나, 그리드 왼쪽 화살표로 개별 조정하세요.
              </p>
              <div className="flex flex-wrap gap-1.5">
                {OFFSET_PRESETS.map((preset) => (
                  <Button
                    key={preset.id}
                    size="sm"
                    variant={activePresetId === preset.id ? 'default' : 'outline'}
                    onClick={() => applyOffsetPreset(preset.id)}
                    title={preset.description}
                    aria-pressed={activePresetId === preset.id}
                    className="text-xs"
                  >
                    {preset.name}
                    {preset.id === 'arc' && (
                      <span className={`ml-1 inline-flex rounded-full px-1 py-0 text-[9px] font-medium ${activePresetId === preset.id ? 'bg-white/20 text-white' : 'bg-[var(--color-warning-100)] text-[var(--color-warning-700)]'}`}>
                        추천
                      </span>
                    )}
                  </Button>
                ))}
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* ============================== */}
        {/* 섹션 4: 줄반장 지정 (아코디언) */}
        {/* ============================== */}
        <Collapsible open={rowLeaderOpen} onOpenChange={setRowLeaderOpen} className="overflow-hidden rounded-lg border border-orange-200 dark:border-orange-800/50">
          <CollapsibleTrigger className="flex w-full items-center justify-between bg-orange-50/50 px-4 py-3 transition-colors hover:bg-orange-50 dark:bg-orange-950/20 dark:hover:bg-orange-950/30">
            <div className="flex items-center gap-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-orange-100 text-orange-600 dark:bg-orange-900/50 dark:text-orange-400">
                <Crown className="h-3.5 w-3.5" />
              </div>
              <span className="text-sm font-semibold text-orange-700 dark:text-orange-300">줄반장 지정</span>
            </div>
            {rowLeaderOpen ? (
              <ChevronDown className="h-4 w-4 text-orange-400 dark:text-orange-500" />
            ) : (
              <ChevronRight className="h-4 w-4 text-orange-400 dark:text-orange-500" />
            )}
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="space-y-2 border-t border-orange-200/50 p-3 dark:border-orange-800/30">
              {assignmentsCount === 0 ? (
                <p className="text-xs text-[var(--color-text-tertiary)]">배치된 대원이 없습니다.</p>
              ) : (
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
                      onClick={onOpenClearRowLeadersDialog}
                      className="w-full gap-2 text-[var(--color-text-tertiary)]"
                    >
                      <Trash2 className="h-4 w-4" />
                      전체 해제
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* ============================== */}
        {/* 섹션 5: 변동 이력 (변동이 있을 때만) */}
        {/* ============================== */}
        {hasSnapshot && changesCount > 0 && (
          <div className="overflow-hidden rounded-lg border border-amber-200 dark:border-amber-800/50">
            <div className="flex items-center justify-between bg-amber-50/50 px-4 py-3 dark:bg-amber-950/20">
              <div className="flex items-center gap-3">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400">
                  <AlertTriangle className="h-3.5 w-3.5" />
                </div>
                <span className="text-sm font-semibold text-amber-700 dark:text-amber-300">변동 이력</span>
              </div>
              <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
                {changesCount}건
              </span>
            </div>
            <div className="border-t border-amber-200/50 p-3 dark:border-amber-800/30">
              <EmergencyChangesBanner
                arrangementId={arrangementId}
                date={date}
                serviceScheduleId={serviceScheduleId}
                inline
              />
            </div>
          </div>
        )}
      </div>

      {/* 빈자리 정리 확인 다이얼로그 */}
      <ConfirmDialog
        open={compactDialogOpen}
        onOpenChange={setCompactDialogOpen}
        title="빈자리 정리"
        description={
          <div className="space-y-2">
            <p>줄 끝의 빈자리를 정리하고, 빈 칸을 왼쪽으로 당깁니다.</p>
            <div className="rounded-lg bg-[var(--color-background-secondary)] p-3 text-sm">
              <p><strong>{compactPreview.movedCount}명</strong> 이동 예정</p>
              <p><strong>{compactPreview.emptyRemoved}개</strong> 빈자리 제거 예정</p>
            </div>
            <p className="text-xs text-[var(--color-text-tertiary)]">
              이 작업은 변동 이력에 기록되며, 되돌리기가 가능합니다.
            </p>
          </div>
        }
        confirmLabel="정리하기"
        variant="warning"
        onConfirm={handleCompactAllRows}
      />
    </div>
  );
}
