'use client';

import { forwardRef, useEffect, useMemo } from 'react';

import { useZigzagOffset } from '@/hooks/useZigzagOffset';

import { calculateSeatsByRow } from '@/lib/utils/seatPositionCalculator';

import { useArrangementStore } from '@/store/arrangement-store';

import type { Database } from '@/types/database.types';
import { DEFAULT_GRID_LAYOUT, GridLayout } from '@/types/grid';

import CaptureFooter from './CaptureFooter';
import CaptureHeader from './CaptureHeader';
import CaptureNotes from './CaptureNotes';
import InlineRowOffsetControl from './InlineRowOffsetControl';
import SeatSlot from './SeatSlot';

type Part = Database['public']['Enums']['part'];

interface ArrangementInfo {
  date: string;
  title?: string;
  conductor?: string;
  serviceType?: string;
  hymnName?: string | null;
  offertoryPerformer?: string | null;
}

interface EmergencyUnavailableParams {
  memberId: string;
  memberName: string;
  part: Part; // 파트 정보 (파트 영역 고려를 위해 필수)
  row: number;
  col: number;
}

interface SeatsGridProps {
  gridLayout?: GridLayout | null;
  arrangementInfo?: ArrangementInfo;
  showCaptureInfo?: boolean;
  /** 배치표 지시사항/메모 (이미지 캡처에 포함) */
  notes?: string | null;
  onEmergencyUnavailable?: (params: EmergencyUnavailableParams) => void;
  isReadOnly?: boolean;
  /** 긴급 수정 모드 (SHARED 상태에서만 true) - 컨텍스트 메뉴 표시 조건 */
  isEmergencyMode?: boolean;
  /** 현재 워크플로우 단계 (2단계에서 인라인 오프셋 컨트롤 표시) */
  workflowStep?: number;
  /** 하이라이트 대상 멤버 ID (대시보드에서 "내 자리 확인하기" 클릭 시) */
  highlightMemberId?: string | null;
  /** 외부에서 직접 오프셋 컨트롤 표시를 제어 (긴급수정모드용) */
  showOffsetControls?: boolean;
}

const SeatsGrid = forwardRef<HTMLDivElement, SeatsGridProps>(function SeatsGrid(
  {
    gridLayout,
    arrangementInfo,
    showCaptureInfo = false,
    notes,
    onEmergencyUnavailable,
    isReadOnly = false,
    isEmergencyMode = false,
    workflowStep,
    highlightMemberId,
    showOffsetControls = false,
  },
  ref
) {
  // Fallback to default if no gridLayout provided
  const layout = gridLayout || DEFAULT_GRID_LAYOUT;

  // 캡처 푸터에 필요한 assignments 가져오기
  const assignments = useArrangementStore((state) => state.assignments);
  // 행별 오프셋 설정 함수 (Step 2 인라인 컨트롤용)
  const setRowOffset = useArrangementStore((state) => state.setRowOffset);

  // Step 2에서 인라인 오프셋 컨트롤 표시 여부
  // (showCaptureInfo는 헤더/푸터 표시 여부일 뿐, 편집 모드와 무관)
  const showInlineOffsetControls = workflowStep === 2 || showOffsetControls;

  // 브레이크포인트별 zigzag offset 값 (CSS 변수 대신 JS 계산 사용)
  // CSS calc(var(--zigzag-offset) * N) 형태가 일부 브라우저에서 무시되는 문제 해결
  const zigzagOffset = useZigzagOffset();

  // 행별로 그룹화된 좌석 데이터
  const seatsByRow = useMemo(() => calculateSeatsByRow(layout), [layout]);

  // 하이라이트 대상 좌석으로 자동 스크롤
  // scrollIntoView는 중첩 overflow 컨테이너(모바일)에서 실패하므로
  // 가장 가까운 스크롤 가능 부모를 찾아 직접 scrollTo 사용
  useEffect(() => {
    if (!highlightMemberId) return;
    const timer = setTimeout(() => {
      const el = document.querySelector('[data-highlight-seat]');
      if (!el) return;

      const scrollParent = el.closest('.overflow-auto');
      if (scrollParent) {
        const parentRect = scrollParent.getBoundingClientRect();
        const elRect = el.getBoundingClientRect();
        scrollParent.scrollTo({
          top: scrollParent.scrollTop + (elRect.top - parentRect.top) - parentRect.height / 2 + elRect.height / 2,
          left: scrollParent.scrollLeft + (elRect.left - parentRect.left) - parentRect.width / 2 + elRect.width / 2,
          behavior: 'smooth',
        });
      } else {
        el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [highlightMemberId]);

  return (
    <div className="flex-1 overflow-auto bg-[var(--color-background-secondary)]">
      <div className="flex min-h-full min-w-fit flex-col bg-white p-2 sm:p-6 lg:p-8">
        {/* 이미지 캡처 대상 영역 */}
        <div
          ref={ref}
          data-capture-target
          className="inline-flex flex-col items-center bg-white px-4 pb-4 sm:px-8"
        >
          {/* 캡처용 헤더: 예배 정보 (캡처 모드에서만 표시) */}
          {showCaptureInfo && arrangementInfo && (
            <CaptureHeader date={arrangementInfo.date} title={arrangementInfo.title} serviceType={arrangementInfo.serviceType} hymnName={arrangementInfo.hymnName} offertoryPerformer={arrangementInfo.offertoryPerformer} />
          )}

          {/* 좌석 그리드 - Flexbox 왼쪽 정렬 (역순: 6열이 상단, 1열이 하단) */}
          {/* 실제 배치표 분석 결과: 왼쪽 정렬 기반, 지그재그는 선택적 */}
          <div data-rows-container className="mx-auto flex w-fit flex-col-reverse items-start gap-1.5 sm:gap-2">
            {seatsByRow
              .filter((rowData) => rowData.capacity > 0) // 빈 행 제외
              .map((rowData) => (
                <div key={rowData.rowIndex} className="relative flex items-center">
                  {/* Step 2: 인라인 오프셋 컨트롤 (왼쪽) */}
                  {/* absolute 배치로 좌석 행 이동과 독립적으로 고정 위치 유지 */}
                  {showInlineOffsetControls && (
                    <div
                      data-print-hide
                      className="absolute z-10 flex items-center"
                      style={{
                        // 컨트롤을 좌석 행 왼쪽에 고정 배치
                        // right: 100% = 행 래퍼의 왼쪽 가장자리
                        right: '100%',
                        marginRight: 4, // gap-1 대체
                      }}
                    >
                      <InlineRowOffsetControl
                        rowNumber={rowData.rowIndex}
                        currentOffset={layout.rowOffsets?.[rowData.rowIndex - 1]}
                        onChange={(offset) => setRowOffset(rowData.rowIndex, offset)}
                      />
                    </div>
                  )}

                  {/* 열 라벨 (줄 왼쪽) */}
                  <div data-row-label className="mr-1.5 flex w-5 flex-shrink-0 items-center justify-center text-[10px] font-semibold text-[var(--color-text-tertiary)] sm:mr-2 sm:w-7 sm:text-xs">
                    {rowData.rowIndex}열
                  </div>

                  {/* 좌석 행 */}
                  {/*
                                      반칸(0.5) 이동 거리 계산 (useZigzagOffset 훅 사용):
                                      - mobile: (48px + 6px) / 2 = 27px
                                      - sm (≥640px): (64px + 8px) / 2 = 36px
                                      - lg (≥1024px): (72px + 8px) / 2 = 40px

                                      offset 값에 따른 이동:
                                      - offset 0.5 → 0.5칸 = 27/36/40px
                                      - offset 1.0 → 1칸 = 54/72/80px

                                      ⚠️ rowData.offset은 지그재그 패턴 포함 계산값
                                      사용자 설정 offset은 layout.rowOffsets에서 직접 읽어야 함

                                      ⚠️ CSS calc(var(--zigzag-offset) * N) 형태가 일부 브라우저에서
                                      무시되므로 JavaScript에서 직접 px 값을 계산하여 적용
                                    */}
                  <div
                    data-seat-row
                    data-row-offset={layout.rowOffsets?.[rowData.rowIndex - 1] ?? 0}
                    className="flex gap-1.5 sm:gap-2"
                    style={(() => {
                      const currentRowOffset = layout.rowOffsets?.[rowData.rowIndex - 1] ?? 0;
                      // Zigzag: 행 전체를 이동 (오프셋 값에 비례)
                      // offset * 2 * zigzag-offset
                      // offset 0.5 → 0.5 * 2 = 1 → 1 * zigzag-offset = 반칸
                      // offset 1.0 → 1.0 * 2 = 2 → 2 * zigzag-offset = 1칸
                      const offsetPx = currentRowOffset * 2 * zigzagOffset;
                      // Step 2에서는 기준점(baseMargin)을 설정하고 offset으로 상대 이동
                      // 기준점: 3 * zigzagOffset으로 여백 축소 (기존 4배 → 3배)
                      // offset -1.5까지 점프 없이 안정적, 여백 25% 감소
                      const baseMargin = showInlineOffsetControls ? zigzagOffset * 3 : 0;
                      return {
                        marginLeft: baseMargin + offsetPx,
                      };
                    })()}
                  >
                    {rowData.seats.map((seat) => {
                      const seatKey = `${seat.row}-${seat.col}`;
                      const seatAssignment = assignments[seatKey];
                      const isHighlighted = !!(highlightMemberId && seatAssignment?.memberId === highlightMemberId);
                      return (
                        <SeatSlot
                          key={seatKey}
                          row={seat.row}
                          col={seat.col}
                          onEmergencyUnavailable={onEmergencyUnavailable}
                          isReadOnly={isReadOnly}
                          isEmergencyMode={isEmergencyMode}
                          isHighlighted={isHighlighted}
                        />
                      );
                    })}
                  </div>

                  {/* 행별 배치 인원수 (오른쪽) — 배치된 인원이 있을 때만 표시 */}
                  {(() => {
                    const count = Object.values(assignments).filter((a) => a.row === rowData.rowIndex).length;
                    return count > 0 ? (
                      <div data-row-count className="ml-1.5 flex w-6 flex-shrink-0 items-center justify-center text-xs font-semibold text-[var(--color-text-secondary)] sm:ml-2 sm:w-8 sm:text-sm">
                        {count}
                      </div>
                    ) : null;
                  })()}
                </div>
              ))}
          </div>

          {/* 지휘자 (최하단) */}
          <div data-conductor className="mx-auto mt-6 w-fit text-center sm:mt-8">
            <div className="mx-auto flex h-10 w-28 items-center justify-center rounded-full border-2 border-[var(--color-primary-400)] bg-[var(--color-surface)] text-xs font-bold text-[var(--color-text-primary)] shadow-md sm:h-12 sm:w-32 sm:text-sm">
              지휘자
            </div>
          </div>

          {/* 캡처용 푸터: 파트별 인원수 (캡처 모드에서만 표시) */}
          {showCaptureInfo && <CaptureFooter assignments={assignments} />}

          {/* 캡처용 지시사항/메모 */}
          {showCaptureInfo && notes && <CaptureNotes notes={notes} />}
        </div>

        {/* 안내 메시지 (캡처 영역 밖) */}
        <div data-print-hide className="mx-auto mt-2 w-fit space-y-1 px-4 text-center sm:mt-4">
          <p className="text-xs text-[var(--color-text-tertiary)] sm:text-sm">
            * 대원을 클릭하여 선택한 후, 좌석을 클릭하여 배치하세요
          </p>
          <p className="text-xs text-[var(--color-text-tertiary)]">
            좌석: {seatsByRow.reduce((sum, row) => sum + row.capacity, 0)}개 | 줄: {layout.rows}줄
          </p>
          <p className="mt-2 text-xs text-[var(--color-text-secondary)]">
            선택 취소: 같은 대원을 다시 클릭 | 제거: 좌석 더블 클릭
          </p>
        </div>
      </div>
    </div>
  );
});

export default SeatsGrid;
