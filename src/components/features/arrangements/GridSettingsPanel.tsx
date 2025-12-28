'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GridLayout, GRID_CONSTRAINTS } from '@/types/grid';
import { autoDistributeSeats, calculateTotalSeats } from '@/lib/utils/gridUtils';
import { recommendRowDistribution } from '@/lib/row-distribution-recommender';
import { Sparkles, Zap } from 'lucide-react';

interface GridSettingsPanelProps {
  gridLayout: GridLayout | null;
  onChange: (layout: GridLayout) => void;
  totalMembers: number;
}

export default function GridSettingsPanel({
  gridLayout,
  onChange,
  totalMembers,
}: GridSettingsPanelProps) {
  const [localRows, setLocalRows] = useState(gridLayout?.rows || GRID_CONSTRAINTS.DEFAULT_ROWS);
  const [localCapacities, setLocalCapacities] = useState<number[]>(
    gridLayout?.rowCapacities || Array(GRID_CONSTRAINTS.DEFAULT_ROWS).fill(8)
  );

  // gridLayout이 변경되면 로컬 상태 동기화
  useEffect(() => {
    if (gridLayout) {
      setLocalRows(gridLayout.rows);
      setLocalCapacities(gridLayout.rowCapacities);
    }
  }, [gridLayout]);

  // 행 수 변경
  const handleRowsChange = (newRows: number) => {
    if (newRows < GRID_CONSTRAINTS.MIN_ROWS || newRows > GRID_CONSTRAINTS.MAX_ROWS) {
      return;
    }

    setLocalRows(newRows);

    // 기존 capacities 유지하되, 부족하면 8로 채우고, 넘치면 자름
    const newCapacities = Array(newRows)
      .fill(0)
      .map((_, idx) => localCapacities[idx] || 8);

    setLocalCapacities(newCapacities);

    onChange({
      rows: newRows,
      rowCapacities: newCapacities,
      zigzagPattern: gridLayout?.zigzagPattern || 'even',
    });
  };

  // 특정 행의 인원 수 변경
  const handleCapacityChange = (rowIndex: number, value: string) => {
    const numValue = parseInt(value) || 0;
    if (numValue < 0 || numValue > GRID_CONSTRAINTS.MAX_CAPACITY_PER_ROW) {
      return;
    }

    const newCapacities = [...localCapacities];
    newCapacities[rowIndex] = numValue;
    setLocalCapacities(newCapacities);

    onChange({
      rows: localRows,
      rowCapacities: newCapacities,
      zigzagPattern: gridLayout?.zigzagPattern || 'even',
    });
  };

  // 자동 균등 분배 (기존 방식)
  const handleAutoDistribute = () => {
    const distributed = autoDistributeSeats(totalMembers, localRows);
    setLocalCapacities(distributed);

    onChange({
      rows: localRows,
      rowCapacities: distributed,
      zigzagPattern: gridLayout?.zigzagPattern || 'even',
    });
  };

  // AI 추천 분배 (학습 데이터 기반)
  const handleAIRecommend = () => {
    const recommendation = recommendRowDistribution(totalMembers);

    setLocalRows(recommendation.rows);
    setLocalCapacities(recommendation.rowCapacities);

    onChange({
      rows: recommendation.rows,
      rowCapacities: recommendation.rowCapacities,
      zigzagPattern: gridLayout?.zigzagPattern || 'even',
    });
  };

  const totalSeats = calculateTotalSeats({
    rows: localRows,
    rowCapacities: localCapacities,
    zigzagPattern: 'even',
  });

  return (
    <Card className="w-full lg:w-80 flex-shrink-0 max-w-full lg:max-w-[320px] flex flex-col overflow-hidden">
      <CardHeader>
        <CardTitle className="text-base sm:text-lg">좌석 그리드 설정</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 overflow-y-auto flex-1">
        {/* 줄 수 선택 */}
        <div className="space-y-2">
          <Label htmlFor="grid-rows" className="text-sm sm:text-base">줄 수</Label>
          <div className="flex items-center gap-2">
            <Input
              id="grid-rows"
              type="number"
              min={GRID_CONSTRAINTS.MIN_ROWS}
              max={GRID_CONSTRAINTS.MAX_ROWS}
              value={localRows}
              onChange={(e) => handleRowsChange(parseInt(e.target.value) || GRID_CONSTRAINTS.DEFAULT_ROWS)}
              className="w-20 h-11 text-base" // 터치 영역 확대
            />
            <span className="text-xs sm:text-sm text-[var(--color-text-secondary)]">
              ({GRID_CONSTRAINTS.MIN_ROWS}~{GRID_CONSTRAINTS.MAX_ROWS}줄)
            </span>
          </div>
        </div>

        {/* 자동 분배 버튼 */}
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
          <Button
            onClick={handleAutoDistribute}
            variant="outline"
            className="w-full gap-2"
            disabled={totalMembers === 0}
          >
            <Sparkles className="w-4 h-4" />
            균등 분배
          </Button>
        </div>

        {/* 각 줄별 인원 수 */}
        <div className="space-y-2">
          <Label className="text-sm sm:text-base">줄별 인원 수</Label>
          <div className="space-y-2">
            {localCapacities.map((capacity, idx) => (
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

        {/* 지그재그 패턴 설정 */}
        <div className="space-y-2">
          <Label className="text-sm sm:text-base">지그재그 패턴</Label>
          <div className="flex gap-2">
            <Button
              variant={gridLayout?.zigzagPattern === 'even' || !gridLayout?.zigzagPattern ? 'default' : 'outline'}
              size="sm"
              onClick={() => onChange({
                rows: localRows,
                rowCapacities: localCapacities,
                zigzagPattern: 'even',
              })}
              className="flex-1"
            >
              짝수줄 이동
            </Button>
            <Button
              variant={gridLayout?.zigzagPattern === 'odd' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onChange({
                rows: localRows,
                rowCapacities: localCapacities,
                zigzagPattern: 'odd',
              })}
              className="flex-1"
            >
              홀수줄 이동
            </Button>
            <Button
              variant={gridLayout?.zigzagPattern === 'none' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onChange({
                rows: localRows,
                rowCapacities: localCapacities,
                zigzagPattern: 'none',
              })}
              className="flex-1"
            >
              없음
            </Button>
          </div>
        </div>

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
      </CardContent>
    </Card>
  );
}
