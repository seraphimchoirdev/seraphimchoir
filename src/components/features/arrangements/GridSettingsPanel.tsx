'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GridLayout, GRID_CONSTRAINTS, RowOffsetValue } from '@/types/grid';
import { calculateTotalSeats } from '@/lib/utils/gridUtils';
import { recommendRowDistribution } from '@/lib/row-distribution-recommender';
import { Zap, ChevronDown, ChevronUp, RotateCcw } from 'lucide-react';
import RowOffsetAdjuster from './RowOffsetAdjuster';

interface GridSettingsPanelProps {
  gridLayout: GridLayout | null;
  onChange: (layout: GridLayout) => void;
  totalMembers: number;
  /** 워크플로우 단계 (2단계에서는 AI 추천, 지그재그, 행별 세부 조정 숨김) */
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
  // 2단계에서는 기본 설정만 표시 (AI 추천, 지그재그, 행별 세부 조정 숨김)
  const isStep2 = workflowStep === 2;
  // 행별 오프셋 조정 섹션 펼침 상태
  const [isRowOffsetsExpanded, setIsRowOffsetsExpanded] = useState(false);

  // gridLayout에서 직접 값을 읽고, 없으면 기본값 사용
  const currentRows = gridLayout?.rows ?? GRID_CONSTRAINTS.DEFAULT_ROWS;
  const currentCapacities = gridLayout?.rowCapacities ?? Array(GRID_CONSTRAINTS.DEFAULT_ROWS).fill(8);
  const currentZigzag = gridLayout?.zigzagPattern ?? 'even';
  const currentRowOffsets = gridLayout?.rowOffsets ?? {};

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
    Object.keys(newRowOffsets).forEach(key => {
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
        <Label htmlFor="grid-rows" className="text-sm sm:text-base">줄 수</Label>
        <div className="flex items-center gap-2">
          <Input
            id="grid-rows"
            type="number"
            min={GRID_CONSTRAINTS.MIN_ROWS}
            max={GRID_CONSTRAINTS.MAX_ROWS}
            value={currentRows}
            onChange={(e) => handleRowsChange(parseInt(e.target.value) || GRID_CONSTRAINTS.DEFAULT_ROWS)}
            className="w-20 h-11 text-base"
          />
          <span className="text-xs sm:text-sm text-[var(--color-text-secondary)]">
            ({GRID_CONSTRAINTS.MIN_ROWS}~{GRID_CONSTRAINTS.MAX_ROWS}줄)
          </span>
        </div>
      </div>

      {/* AI 추천 분배 버튼 - 2단계에서는 숨김 (1단계에서 이미 실행) */}
      {!isStep2 && (
        <div className="space-y-2">
          <Button
            onClick={handleAIRecommend}
            variant="default"
            className="w-full gap-2"
            disabled={totalMembers === 0}
          >
            <Zap className="w-4 h-4" />
            AI 추천 분배 ({totalMembers}명)
          </Button>
        </div>
      )}

      {/* 각 줄별 인원 수 */}
      <div className="space-y-2">
        <Label className="text-sm sm:text-base">줄별 인원 수</Label>
        <div className="space-y-2">
          {currentCapacities.map((capacity, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <span className="text-sm font-medium w-12 sm:w-14">
                {idx + 1}줄:
              </span>
              <Input
                type="number"
                min={0}
                max={GRID_CONSTRAINTS.MAX_CAPACITY_PER_ROW}
                value={capacity}
                onChange={(e) => handleCapacityChange(idx, e.target.value)}
                className="w-20 h-11 text-base"
              />
              <span className="text-xs sm:text-sm text-[var(--color-text-tertiary)]">명</span>
            </div>
          ))}
        </div>
      </div>

      {/* 지그재그 패턴 설정 - 2단계에서는 숨김 (5단계 전용) */}
      {!isStep2 && (
        <div className="space-y-2">
          <Label className="text-sm sm:text-base">지그재그 패턴</Label>
          <div className="flex gap-2">
            <Button
              variant={currentZigzag === 'even' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onChange({
                rows: currentRows,
                rowCapacities: currentCapacities,
                zigzagPattern: 'even',
                rowOffsets: currentRowOffsets,
                isManuallyConfigured: gridLayout?.isManuallyConfigured,
              })}
              className="flex-1"
            >
              짝수줄 이동
            </Button>
            <Button
              variant={currentZigzag === 'odd' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onChange({
                rows: currentRows,
                rowCapacities: currentCapacities,
                zigzagPattern: 'odd',
                rowOffsets: currentRowOffsets,
                isManuallyConfigured: gridLayout?.isManuallyConfigured,
              })}
              className="flex-1"
            >
              홀수줄 이동
            </Button>
            <Button
              variant={currentZigzag === 'none' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onChange({
                rows: currentRows,
                rowCapacities: currentCapacities,
                zigzagPattern: 'none',
                rowOffsets: currentRowOffsets,
                isManuallyConfigured: gridLayout?.isManuallyConfigured,
              })}
              className="flex-1"
            >
              없음
            </Button>
          </div>
        </div>
      )}

      {/* 행별 지그재그 세부 조정 - 2단계에서는 숨김 (5단계 전용) */}
      {!isStep2 && (
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setIsRowOffsetsExpanded(!isRowOffsetsExpanded)}
            className="flex items-center justify-between w-full text-sm sm:text-base font-medium text-[var(--color-text-primary)] hover:text-[var(--color-primary-600)] transition-colors"
          >
            <span>행별 세부 조정</span>
            <span className="flex items-center gap-1">
              {Object.keys(currentRowOffsets).length > 0 && (
                <span className="text-xs text-[var(--color-primary-600)] bg-[var(--color-primary-50)] px-1.5 py-0.5 rounded">
                  {Object.keys(currentRowOffsets).length}개 설정
                </span>
              )}
              {isRowOffsetsExpanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </span>
          </button>

          {isRowOffsetsExpanded && (
            <div className="space-y-3 pt-2 border-t border-[var(--color-border)]">
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
                  <RotateCcw className="w-3 h-3" />
                  모두 기본값으로 초기화
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {/* 총 좌석 수 */}
      <div className="pt-4 border-t">
        <div className="flex justify-between text-sm">
          <span className="text-[var(--color-text-secondary)]">총 좌석:</span>
          <span className="font-semibold text-[var(--color-primary-600)]">
            {totalSeats}개
          </span>
        </div>
        {totalSeats !== totalMembers && (
          <p className="text-xs text-[var(--color-warning-600)] mt-1">
            ⚠ 출석 인원({totalMembers}명)과 총 좌석({totalSeats}개)이 일치하지 않습니다
          </p>
        )}
      </div>
    </>
  );

  // embedded 모드: Card wrapper 없이 콘텐츠만 렌더링
  if (embedded) {
    return (
      <div className="space-y-4">
        {renderContent()}
      </div>
    );
  }

  // 기본 모드: Card로 감싸서 렌더링
  return (
    <Card className="w-full lg:w-80 flex-shrink-0 max-w-full lg:max-w-[320px] flex flex-col overflow-hidden">
      <CardHeader>
        <CardTitle className="text-base sm:text-lg">좌석 그리드 설정</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 overflow-y-auto flex-1">
        {renderContent()}
      </CardContent>
    </Card>
  );
}
