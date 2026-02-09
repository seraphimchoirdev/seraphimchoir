'use client';

import { ChevronDown, ChevronUp, Minus, Plus, RotateCcw, Zap } from 'lucide-react';

import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { recommendRowDistribution } from '@/lib/row-distribution-recommender';
import { calculateTotalSeats } from '@/lib/utils/gridUtils';

import { GRID_CONSTRAINTS, GridLayout } from '@/types/grid';

import RowOffsetAdjuster from './RowOffsetAdjuster';

interface GridSettingsPanelProps {
  gridLayout: GridLayout | null;
  onChange: (layout: GridLayout) => void;
  totalMembers: number;
  /** 워크플로우 단계 (1단계에서는 AI 추천, 지그재그, 행별 세부 조정 숨김) */
  workflowStep?: number;
  /** 워크플로우 패널 내부에 embedded될 때 Card wrapper 제거 */
  embedded?: boolean;
}

export default function GridSettingsPanel({
  gridLayout,
  onChange,
  totalMembers,
  workflowStep,
  embedded = false,
}: GridSettingsPanelProps) {
  // 1단계에서는 기본 설정만 표시 (AI 추천, 지그재그, 행별 세부 조정 숨김)
  const isStep2 = workflowStep === 1;
  // 행별 오프셋 조정 섹션 펼침 상태
  const [isRowOffsetsExpanded, setIsRowOffsetsExpanded] = useState(false);

  // gridLayout에서 직접 값을 읽고, 없으면 기본값 사용
  const currentRows = gridLayout?.rows ?? GRID_CONSTRAINTS.DEFAULT_ROWS;
  const currentCapacities =
    gridLayout?.rowCapacities ?? Array(GRID_CONSTRAINTS.DEFAULT_ROWS).fill(8);
  const currentZigzag = gridLayout?.zigzagPattern ?? 'even';
  const currentRowOffsets = gridLayout?.rowOffsets ?? {};

  // 디바운스: 줄 수 로컬 state
  const [localRows, setLocalRows] = useState(currentRows);
  const [localCapacities, setLocalCapacities] = useState(currentCapacities);

  // 외부(AI 추천 등)에서 값이 바뀌면 로컬 state 동기화
  // currentCapacities는 매 렌더마다 새 참조이므로 값 비교 필수
  useEffect(() => {
    setLocalRows(currentRows);
  }, [currentRows]);

  // currentCapacities는 매 렌더마다 새 배열 참조이므로, JSON 직렬화로 값 기반 비교
  const capacitiesKey = JSON.stringify(currentCapacities);
  useEffect(() => {
    setLocalCapacities((prev) => {
      if (
        prev.length === currentCapacities.length &&
        prev.every((v, i) => v === currentCapacities[i])
      ) {
        return prev; // 값 동일하면 참조 유지 → 리렌더 방지
      }
      return currentCapacities;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [capacitiesKey]);

  // 줄 수 디바운스: 로컬 값이 바뀌면 400ms 후 반영
  useEffect(() => {
    if (localRows === currentRows) return;
    const timer = setTimeout(() => {
      handleRowsChange(localRows);
    }, 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localRows, currentRows]);

  // 줄별 인원 디바운스: 로컬 값이 바뀌면 400ms 후 한 번에 반영
  useEffect(() => {
    const changed =
      localCapacities.some((v, i) => v !== currentCapacities[i]) ||
      localCapacities.length !== currentCapacities.length;
    if (!changed) return;
    const timer = setTimeout(() => {
      onChange({
        rows: currentRows,
        rowCapacities: localCapacities,
        zigzagPattern: currentZigzag,
        rowOffsets: currentRowOffsets,
        isManuallyConfigured: true,
      });
    }, 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localCapacities, currentCapacities]);

  // 행 수 변경
  const handleRowsChange = (newRows: number) => {
    if (newRows < GRID_CONSTRAINTS.MIN_ROWS || newRows > GRID_CONSTRAINTS.MAX_ROWS) {
      return;
    }

    // 기존 capacities 유지하되, 부족하면 8로 채우고, 넘치면 자름
    const newCapacities = Array(newRows)
      .fill(0)
      .map((_, idx) => currentCapacities[idx] || 8);

    // 행 수가 줄어들면 해당 행의 오프셋 제거
    const newRowOffsets = { ...currentRowOffsets };
    Object.keys(newRowOffsets).forEach((key) => {
      if (parseInt(key) >= newRows) {
        delete newRowOffsets[parseInt(key)];
      }
    });

    onChange({
      rows: newRows,
      rowCapacities: newCapacities,
      zigzagPattern: currentZigzag,
      rowOffsets: Object.keys(newRowOffsets).length > 0 ? newRowOffsets : undefined,
      isManuallyConfigured: true,
    });
  };

  // 특정 행의 인원 수 변경
  const handleCapacityChange = (rowIndex: number, value: string) => {
    const numValue = parseInt(value) || 0;
    if (numValue < 0 || numValue > GRID_CONSTRAINTS.MAX_CAPACITY_PER_ROW) {
      return;
    }

    const newCapacities = [...currentCapacities];
    newCapacities[rowIndex] = numValue;

    onChange({
      rows: currentRows,
      rowCapacities: newCapacities,
      zigzagPattern: currentZigzag,
      rowOffsets: currentRowOffsets,
      isManuallyConfigured: true,
    });
  };

  // AI 추천 분배 (학습 데이터 기반)
  const handleAIRecommend = () => {
    const recommendation = recommendRowDistribution(totalMembers);

    onChange({
      rows: recommendation.rows,
      rowCapacities: recommendation.rowCapacities,
      zigzagPattern: currentZigzag,
    });
  };

  const totalSeats = calculateTotalSeats({
    rows: currentRows,
    rowCapacities: currentCapacities,
    zigzagPattern: 'even',
  });

  // 공통 콘텐츠 렌더링 함수
  const renderContent = () => (
    <>
      {/* 줄 수 선택 */}
      <div className="space-y-2">
        <Label htmlFor="grid-rows" className="text-sm sm:text-base">
          줄 수
        </Label>
        <div className="flex items-center gap-2">
          <Input
            id="grid-rows"
            type="number"
            min={GRID_CONSTRAINTS.MIN_ROWS}
            max={GRID_CONSTRAINTS.MAX_ROWS}
            value={localRows}
            onChange={(e) =>
              setLocalRows(parseInt(e.target.value) || GRID_CONSTRAINTS.DEFAULT_ROWS)
            }
            className="h-11 w-20 text-base"
          />
          <span className="text-xs text-[var(--color-text-secondary)] sm:text-sm">
            ({GRID_CONSTRAINTS.MIN_ROWS}~{GRID_CONSTRAINTS.MAX_ROWS}줄)
          </span>
        </div>
      </div>

      {/* AI 추천 분배 버튼 - 1단계에서는 숨김 (페이지 초기화에서 자동 실행) */}
      {!isStep2 && (
        <div className="space-y-2">
          <Button
            onClick={handleAIRecommend}
            variant="default"
            className="w-full gap-2"
            disabled={totalMembers === 0}
          >
            <Zap className="h-4 w-4" />
            AI 추천 분배 ({totalMembers}명)
          </Button>
        </div>
      )}

      {/* 각 줄별 인원 수 */}
      <div className="space-y-2">
        <Label className="text-sm sm:text-base">줄별 인원 수</Label>
        <div className="space-y-2">
          {localCapacities.map((capacity, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <span className="w-12 text-sm font-medium sm:w-14">{idx + 1}줄:</span>
              <div className="flex h-11 items-stretch overflow-hidden rounded-md border border-[var(--color-border)] focus-within:ring-2 focus-within:ring-[var(--color-primary-500)] focus-within:ring-offset-1">
                <button
                  type="button"
                  aria-label={`${idx + 1}줄 인원 감소`}
                  disabled={capacity <= 0}
                  onClick={() => {
                    const newCapacities = [...localCapacities];
                    newCapacities[idx] = Math.max(0, capacity - 1);
                    setLocalCapacities(newCapacities);
                  }}
                  className="flex w-10 items-center justify-center border-r border-[var(--color-border)] bg-[var(--color-background-tertiary)] text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-border-default)] hover:text-[var(--color-text-primary)] active:bg-[var(--color-border-strong)] active:text-[var(--color-text-primary)] disabled:pointer-events-none disabled:opacity-40"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <input
                  type="text"
                  inputMode="numeric"
                  aria-label={`${idx + 1}줄 인원 수`}
                  value={capacity}
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (raw === '') {
                      const newCapacities = [...localCapacities];
                      newCapacities[idx] = 0;
                      setLocalCapacities(newCapacities);
                      return;
                    }
                    if (!/^\d+$/.test(raw)) return;
                    const newCapacities = [...localCapacities];
                    newCapacities[idx] = parseInt(raw, 10);
                    setLocalCapacities(newCapacities);
                  }}
                  onBlur={(e) => {
                    const num = parseInt(e.target.value, 10) || 0;
                    const clamped = Math.min(
                      GRID_CONSTRAINTS.MAX_CAPACITY_PER_ROW,
                      Math.max(0, num)
                    );
                    if (clamped !== capacity) {
                      const newCapacities = [...localCapacities];
                      newCapacities[idx] = clamped;
                      setLocalCapacities(newCapacities);
                    }
                  }}
                  className="w-12 bg-transparent text-center text-base font-medium tabular-nums outline-none"
                />
                <button
                  type="button"
                  aria-label={`${idx + 1}줄 인원 증가`}
                  disabled={capacity >= GRID_CONSTRAINTS.MAX_CAPACITY_PER_ROW}
                  onClick={() => {
                    const newCapacities = [...localCapacities];
                    newCapacities[idx] = Math.min(
                      GRID_CONSTRAINTS.MAX_CAPACITY_PER_ROW,
                      capacity + 1
                    );
                    setLocalCapacities(newCapacities);
                  }}
                  className="flex w-10 items-center justify-center border-l border-[var(--color-border)] bg-[var(--color-primary-50)] text-[var(--color-primary-600)] transition-colors hover:bg-[var(--color-primary-100)] hover:text-[var(--color-primary-700)] active:bg-[var(--color-primary-200)] active:text-[var(--color-primary-700)] disabled:pointer-events-none disabled:opacity-40"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
              <span className="text-xs text-[var(--color-text-tertiary)] sm:text-sm">명</span>
            </div>
          ))}
        </div>
      </div>

      {/* 지그재그 패턴 설정 - 1단계에서는 숨김 (2단계 전용) */}
      {!isStep2 && (
        <div className="space-y-2">
          <Label className="text-sm sm:text-base">지그재그 패턴</Label>
          <div className="flex gap-2">
            <Button
              variant={currentZigzag === 'even' ? 'default' : 'outline'}
              size="sm"
              onClick={() =>
                onChange({
                  rows: currentRows,
                  rowCapacities: currentCapacities,
                  zigzagPattern: 'even',
                  rowOffsets: currentRowOffsets,
                  isManuallyConfigured: gridLayout?.isManuallyConfigured,
                })
              }
              className="flex-1"
            >
              짝수줄 이동
            </Button>
            <Button
              variant={currentZigzag === 'odd' ? 'default' : 'outline'}
              size="sm"
              onClick={() =>
                onChange({
                  rows: currentRows,
                  rowCapacities: currentCapacities,
                  zigzagPattern: 'odd',
                  rowOffsets: currentRowOffsets,
                  isManuallyConfigured: gridLayout?.isManuallyConfigured,
                })
              }
              className="flex-1"
            >
              홀수줄 이동
            </Button>
            <Button
              variant={currentZigzag === 'none' ? 'default' : 'outline'}
              size="sm"
              onClick={() =>
                onChange({
                  rows: currentRows,
                  rowCapacities: currentCapacities,
                  zigzagPattern: 'none',
                  rowOffsets: currentRowOffsets,
                  isManuallyConfigured: gridLayout?.isManuallyConfigured,
                })
              }
              className="flex-1"
            >
              없음
            </Button>
          </div>
        </div>
      )}

      {/* 행별 지그재그 세부 조정 - 1단계에서는 숨김 (2단계 전용) */}
      {!isStep2 && (
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setIsRowOffsetsExpanded(!isRowOffsetsExpanded)}
            className="flex w-full items-center justify-between text-sm font-medium text-[var(--color-text-primary)] transition-colors hover:text-[var(--color-primary-600)] sm:text-base"
          >
            <span>행별 세부 조정</span>
            <span className="flex items-center gap-1">
              {Object.keys(currentRowOffsets).length > 0 && (
                <span className="rounded bg-[var(--color-primary-50)] px-1.5 py-0.5 text-xs text-[var(--color-primary-600)]">
                  {Object.keys(currentRowOffsets).length}개 설정
                </span>
              )}
              {isRowOffsetsExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </span>
          </button>

          {isRowOffsetsExpanded && (
            <div className="space-y-3 border-t border-[var(--color-border)] pt-2">
              <p className="text-xs text-[var(--color-text-tertiary)]">
                화살표 버튼으로 각 행의 오프셋을 조정합니다. 0.25칸 단위로 조정됩니다.
              </p>

              {Array.from({ length: currentRows }).map((_, idx) => (
                <RowOffsetAdjuster
                  key={idx}
                  rowNumber={idx + 1}
                  currentOffset={currentRowOffsets[idx]}
                  onChange={(newOffset) => {
                    const newOffsets = { ...currentRowOffsets };

                    if (newOffset === null) {
                      delete newOffsets[idx];
                    } else {
                      newOffsets[idx] = newOffset;
                    }

                    onChange({
                      rows: currentRows,
                      rowCapacities: currentCapacities,
                      zigzagPattern: currentZigzag,
                      rowOffsets: Object.keys(newOffsets).length > 0 ? newOffsets : undefined,
                      isManuallyConfigured: true,
                    });
                  }}
                />
              ))}

              {Object.keys(currentRowOffsets).length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    onChange({
                      rows: currentRows,
                      rowCapacities: currentCapacities,
                      zigzagPattern: currentZigzag,
                      rowOffsets: undefined,
                      isManuallyConfigured: gridLayout?.isManuallyConfigured,
                    });
                  }}
                  className="w-full gap-2 text-[var(--color-text-secondary)] hover:text-[var(--color-error-600)]"
                >
                  <RotateCcw className="h-3 w-3" />
                  모두 기본값으로 초기화
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {/* 총 좌석 수 */}
      <div className="border-t pt-4">
        <div className="flex justify-between text-sm">
          <span className="text-[var(--color-text-secondary)]">총 좌석:</span>
          <span className="font-semibold text-[var(--color-primary-600)]">{totalSeats}개</span>
        </div>
        {totalSeats !== totalMembers && (
          <p className="mt-1 text-xs text-[var(--color-warning-600)]">
            ⚠ 출석 인원({totalMembers}명)과 총 좌석({totalSeats}개)이 일치하지 않습니다
          </p>
        )}
      </div>
    </>
  );

  // embedded 모드: Card wrapper 없이 콘텐츠만 렌더링
  if (embedded) {
    return <div className="space-y-4">{renderContent()}</div>;
  }

  // 기본 모드: Card로 감싸서 렌더링
  return (
    <Card className="flex w-full max-w-full flex-shrink-0 flex-col overflow-hidden lg:w-80 lg:max-w-[320px]">
      <CardHeader>
        <CardTitle className="text-base sm:text-lg">좌석 그리드 설정</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 space-y-4 overflow-y-auto">{renderContent()}</CardContent>
    </Card>
  );
}
