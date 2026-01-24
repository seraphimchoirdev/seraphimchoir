
'use client';

import { useMemo, forwardRef } from 'react';
import SeatSlot from './SeatSlot';
import InlineRowOffsetControl from './InlineRowOffsetControl';
import { GridLayout, DEFAULT_GRID_LAYOUT } from '@/types/grid';
import type { Database } from '@/types/database.types';

type Part = Database['public']['Enums']['part'];
import { calculateSeatsByRow } from '@/lib/utils/seatPositionCalculator';
import { useArrangementStore } from '@/store/arrangement-store';
import { useZigzagOffset } from '@/hooks/useZigzagOffset';
import CaptureHeader from './CaptureHeader';
import CaptureFooter from './CaptureFooter';

interface ArrangementInfo {
    date: string;
    title?: string;
    conductor?: string;
}

interface EmergencyUnavailableParams {
    memberId: string;
    memberName: string;
    part: Part;  // 파트 정보 (파트 영역 고려를 위해 필수)
    row: number;
    col: number;
}

interface SeatsGridProps {
    gridLayout?: GridLayout | null;
    arrangementInfo?: ArrangementInfo;
    showCaptureInfo?: boolean;
    onEmergencyUnavailable?: (params: EmergencyUnavailableParams) => void;
    isReadOnly?: boolean;
    /** 긴급 수정 모드 (SHARED 상태에서만 true) - 컨텍스트 메뉴 표시 조건 */
    isEmergencyMode?: boolean;
    /** 현재 워크플로우 단계 (5단계에서 인라인 오프셋 컨트롤 표시) */
    workflowStep?: number;
}

const SeatsGrid = forwardRef<HTMLDivElement, SeatsGridProps>(function SeatsGrid(
    { gridLayout, arrangementInfo, showCaptureInfo = false, onEmergencyUnavailable, isReadOnly = false, isEmergencyMode = false, workflowStep },
    ref
) {
    // Fallback to default if no gridLayout provided
    const layout = gridLayout || DEFAULT_GRID_LAYOUT;

    // 캡처 푸터에 필요한 assignments 가져오기
    const assignments = useArrangementStore((state) => state.assignments);
    // 행별 오프셋 설정 함수 (Step 5 인라인 컨트롤용)
    const setRowOffset = useArrangementStore((state) => state.setRowOffset);

    // Step 5에서 인라인 오프셋 컨트롤 표시 여부
    // (showCaptureInfo는 헤더/푸터 표시 여부일 뿐, 편집 모드와 무관)
    const showInlineOffsetControls = workflowStep === 5;

    // 브레이크포인트별 zigzag offset 값 (CSS 변수 대신 JS 계산 사용)
    // CSS calc(var(--zigzag-offset) * N) 형태가 일부 브라우저에서 무시되는 문제 해결
    const zigzagOffset = useZigzagOffset();

    // 행별로 그룹화된 좌석 데이터
    const seatsByRow = useMemo(
        () => calculateSeatsByRow(layout),
        [layout]
    );

    return (
        <div className="flex-1 bg-[var(--color-background-secondary)] overflow-auto">
            <div className="min-w-fit min-h-full flex flex-col p-2 sm:p-6 lg:p-8 bg-white">
                {/* 이미지 캡처 대상 영역 */}
                <div
                    ref={ref}
                    data-capture-target
                    className="inline-flex flex-col items-center bg-white pb-4 px-4 sm:px-8"
                >
                    {/* 캡처용 헤더: 예배 정보 (캡처 모드에서만 표시) */}
                    {showCaptureInfo && arrangementInfo && (
                        <CaptureHeader
                            date={arrangementInfo.date}
                            title={arrangementInfo.title}
                        />
                    )}

                    {/* 좌석 그리드 - Flexbox 왼쪽 정렬 (역순: 6열이 상단, 1열이 하단) */}
                    {/* 실제 배치표 분석 결과: 왼쪽 정렬 기반, 지그재그는 선택적 */}
                    <div
                        className="flex flex-col-reverse items-start gap-1.5 sm:gap-2 mx-auto w-fit"
                    >
                        {seatsByRow
                            .filter(rowData => rowData.capacity > 0) // 빈 행 제외
                            .map((rowData) => (
                                <div
                                    key={rowData.rowIndex}
                                    className="flex items-center relative"
                                >
                                    {/* Step 5: 인라인 오프셋 컨트롤 (왼쪽) */}
                                    {/* absolute 배치로 좌석 행 이동과 독립적으로 고정 위치 유지 */}
                                    {showInlineOffsetControls && (
                                        <div
                                            className="z-10 absolute flex items-center"
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
                                        className="flex gap-1.5 sm:gap-2"
                                        style={(() => {
                                            const currentRowOffset = layout.rowOffsets?.[rowData.rowIndex - 1] ?? 0;
                                            // Zigzag: 행 전체를 이동 (오프셋 값에 비례)
                                            // offset * 2 * zigzag-offset
                                            // offset 0.5 → 0.5 * 2 = 1 → 1 * zigzag-offset = 반칸
                                            // offset 1.0 → 1.0 * 2 = 2 → 2 * zigzag-offset = 1칸
                                            const offsetPx = currentRowOffset * 2 * zigzagOffset;
                                            // Step 5에서는 기준점(baseMargin)을 설정하고 offset으로 상대 이동
                                            // 기준점: 최대 음수 offset(-2)만큼의 공간 = 4 * zigzagOffset
                                            // offset 0: baseMargin (중앙 기준)
                                            // offset -0.5: baseMargin - 40px (왼쪽 이동)
                                            // offset +0.5: baseMargin + 40px (오른쪽 이동)
                                            const baseMargin = showInlineOffsetControls ? zigzagOffset * 4 : 0;
                                            return {
                                                marginLeft: baseMargin + offsetPx,
                                            };
                                        })()}
                                    >
                                        {rowData.seats.map((seat) => (
                                            <SeatSlot
                                                key={`${seat.row}-${seat.col}`}
                                                row={seat.row}
                                                col={seat.col}
                                                onEmergencyUnavailable={onEmergencyUnavailable}
                                                isReadOnly={isReadOnly}
                                                isEmergencyMode={isEmergencyMode}
                                            />
                                        ))}
                                    </div>
                                </div>
                            ))}
                    </div>

                    {/* 지휘자 (최하단) */}
                    <div className="mt-6 sm:mt-8 text-center mx-auto w-fit">
                        <div className="w-28 sm:w-32 h-10 sm:h-12 bg-[var(--color-surface)] border-2 border-[var(--color-primary-400)] rounded-full mx-auto flex items-center justify-center font-bold text-xs sm:text-sm text-[var(--color-text-primary)] shadow-md">
                            지휘자
                        </div>
                    </div>

                    {/* 캡처용 푸터: 파트별 인원수 (캡처 모드에서만 표시) */}
                    {showCaptureInfo && (
                        <CaptureFooter assignments={assignments} />
                    )}
                </div>

                {/* 안내 메시지 (캡처 영역 밖) */}
                <div className="mt-2 sm:mt-4 text-center space-y-1 px-4 mx-auto w-fit">
                    <p className="text-xs sm:text-sm text-[var(--color-text-tertiary)]">
                        * 대원을 클릭하여 선택한 후, 좌석을 클릭하여 배치하세요
                    </p>
                    <p className="text-xs text-[var(--color-text-tertiary)]">
                        좌석: {seatsByRow.reduce((sum, row) => sum + row.capacity, 0)}개 | 줄: {layout.rows}줄
                    </p>
                    <p className="text-xs text-[var(--color-text-secondary)] mt-2">
                        선택 취소: 같은 대원을 다시 클릭 | 제거: 좌석 더블 클릭
                    </p>
                </div>
            </div>
        </div>
    );
});

export default SeatsGrid;
