
'use client';

import { useState, useEffect, useRef, useCallback, RefObject } from 'react';
import { Save, ArrowLeft, Loader2, RotateCcw, Crown, Download, Copy, Undo2, Redo2, BarChart3, Lock, Send, Share2, CheckCircle2, AlertTriangle, Sparkles, Trash2, ChevronDown } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { useUpdateArrangement } from '@/hooks/useArrangements';
import { useUpdateSeats } from '@/hooks/useSeats';
import { useImageGeneration } from '@/hooks/useImageGeneration';
import { useArrangementStore } from '@/store/arrangement-store';
import RecommendButton from './RecommendButton';
import PastArrangementButton from './PastArrangementButton';
import PerformanceReportModal from './PerformanceReportModal';
import { ServiceScheduleBadge } from '@/components/features/service-schedules';
import { useArrangementAnalysis } from '@/hooks/useArrangementAnalysis';
import type { Database, Json, ArrangementStatus } from '@/types/database.types';
import type { RecommendationResponse } from '@/hooks/useRecommendSeats';
import type { ApplyPastResponse } from '@/hooks/usePastArrangement';
import type { ArrangementAnalysisResponse } from '@/types/analysis';

type Arrangement = Database['public']['Tables']['arrangements']['Row'];

interface ArrangementHeaderProps {
    arrangement: Arrangement;
    desktopCaptureRef?: RefObject<HTMLDivElement | null>;
    mobileCaptureRef?: RefObject<HTMLDivElement | null>;
}

export default function ArrangementHeader({ arrangement, desktopCaptureRef, mobileCaptureRef }: ArrangementHeaderProps) {
    const router = useRouter();
    const updateArrangement = useUpdateArrangement();
    const updateSeats = useUpdateSeats();
    const { isGenerating, downloadAsImage, copyToClipboard } = useImageGeneration();
    const {
        assignments,
        gridLayout,
        clearArrangement,
        setAssignments,
        setGridLayout,
        rowLeaderMode,
        toggleRowLeaderMode,
        autoAssignRowLeaders,
        clearAllRowLeaders,
        undo,
        redo,
        canUndo,
        canRedo,
    } = useArrangementStore();

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
    const [showAnalysisModal, setShowAnalysisModal] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<ArrangementAnalysisResponse | null>(null);
    const arrangementAnalysis = useArrangementAnalysis();

    // 컴포넌트 마운트 상태 추적 (메모리 누수 방지)
    const isMountedRef = useRef(true);
    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    // 안전한 상태 업데이트 헬퍼
    const safeSetState = useCallback(<T,>(setter: React.Dispatch<React.SetStateAction<T>>, value: T) => {
        if (isMountedRef.current) {
            setter(value);
        }
    }, []);

    // 이미지 내보내기 핸들러 (메모리 누수 방지 적용)
    const handleDownloadImage = useCallback(async () => {
        const captureRef = getActiveCaptureRef();
        if (!captureRef?.current) {
            alert('캡처할 영역을 찾을 수 없습니다.');
            return;
        }
        try {
            const filename = `배치표_${arrangement.date}_${title.replace(/\s+/g, '_')}`;
            await downloadAsImage(captureRef.current, filename);
            if (isMountedRef.current) {
                alert('이미지가 다운로드되었습니다.');
            }
        } catch (error) {
            console.error('이미지 다운로드 실패:', error);
            if (isMountedRef.current) {
                alert('이미지 다운로드에 실패했습니다.');
            }
        }
    }, [arrangement.date, title, downloadAsImage, getActiveCaptureRef]);

    const handleCopyToClipboard = useCallback(async () => {
        const captureRef = getActiveCaptureRef();
        if (!captureRef?.current) {
            alert('캡처할 영역을 찾을 수 없습니다.');
            return;
        }
        try {
            await copyToClipboard(captureRef.current);
            if (isMountedRef.current) {
                alert('이미지가 클립보드에 복사되었습니다.');
            }
        } catch (error) {
            console.error('클립보드 복사 실패:', error);
            if (isMountedRef.current) {
                alert('클립보드 복사에 실패했습니다. 브라우저 설정을 확인해주세요.');
            }
        }
    }, [copyToClipboard, getActiveCaptureRef]);

    // Sync local state if props change (e.g. refetch)
    useEffect(() => {
        setTitle(arrangement.title);
        setConductor(arrangement.conductor || '');
    }, [arrangement]);

    const handleSave = useCallback(async () => {
        setIsSaving(true);
        try {
            // 1. Update Metadata and Grid Layout
            await updateArrangement.mutateAsync({
                id: arrangement.id,
                data: {
                    title,
                    conductor: conductor || null,
                    grid_layout: gridLayout as Json,
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

            if (isMountedRef.current) {
                alert('저장되었습니다.');
            }
        } catch (error) {
            console.error(error);
            if (isMountedRef.current) {
                alert('저장에 실패했습니다.');
            }
        } finally {
            if (isMountedRef.current) {
                setIsSaving(false);
            }
        }
    }, [arrangement.id, title, conductor, gridLayout, assignments, updateArrangement, updateSeats]);

    const handleReset = () => {
        if (confirm('모든 자리 배치를 초기화하시겠습니까? 저장하지 않은 변경사항은 복구할 수 없습니다.')) {
            clearArrangement();
        }
    };

    // 공유하기 (DRAFT → SHARED)
    const handleShare = useCallback(async () => {
        if (!confirm('배치표를 공유하시겠습니까?\n공유 후에도 긴급 수정은 가능합니다.')) {
            return;
        }

        setIsSaving(true);
        try {
            // 먼저 현재 변경사항 저장
            await updateArrangement.mutateAsync({
                id: arrangement.id,
                data: {
                    title,
                    conductor: conductor || null,
                    grid_layout: gridLayout as Json,
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

            if (isMountedRef.current) {
                alert('자리배치표가 공유되었습니다.\n긴급 수정이 필요하면 언제든 수정할 수 있습니다.');
                router.refresh();
            }
        } catch (error) {
            console.error(error);
            if (isMountedRef.current) {
                alert('공유에 실패했습니다.');
            }
        } finally {
            if (isMountedRef.current) {
                setIsSaving(false);
            }
        }
    }, [arrangement.id, title, conductor, gridLayout, assignments, updateArrangement, updateSeats, router]);

    // 확정하기 (SHARED → CONFIRMED)
    const handleConfirm = useCallback(async () => {
        if (!confirm('배치표를 확정하시겠습니까?\n확정 후에는 더 이상 수정할 수 없습니다.')) {
            return;
        }

        setIsSaving(true);
        try {
            await updateArrangement.mutateAsync({
                id: arrangement.id,
                data: {
                    title,
                    conductor: conductor || null,
                    grid_layout: gridLayout as Json,
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

            if (isMountedRef.current) {
                alert('자리배치표가 확정되었습니다.');
                router.refresh();
            }
        } catch (error) {
            console.error(error);
            if (isMountedRef.current) {
                alert('확정에 실패했습니다.');
            }
        } finally {
            if (isMountedRef.current) {
                setIsSaving(false);
            }
        }
    }, [arrangement.id, title, conductor, gridLayout, assignments, updateArrangement, updateSeats, router]);

    // 롤백 (SHARED → DRAFT)
    const handleRevertToDraft = useCallback(async () => {
        if (!confirm('배치표를 작성중 상태로 되돌리시겠습니까?')) {
            return;
        }

        setIsSaving(true);
        try {
            await updateArrangement.mutateAsync({
                id: arrangement.id,
                data: {
                    status: 'DRAFT',
                },
            });

            if (isMountedRef.current) {
                alert('작성중 상태로 되돌렸습니다.');
                router.refresh();
            }
        } catch (error) {
            console.error(error);
            if (isMountedRef.current) {
                alert('상태 변경에 실패했습니다.');
            }
        } finally {
            if (isMountedRef.current) {
                setIsSaving(false);
            }
        }
    }, [arrangement.id, updateArrangement, router]);

    const handleApplyRecommendation = (recommendation: RecommendationResponse) => {
        // 디버깅: API 응답 확인
        console.log('=== AI 추천 결과 디버깅 ===');
        console.log('seats.length:', recommendation.seats.length);
        console.log('gridLayout:', recommendation.gridLayout);
        if (recommendation.gridLayout) {
            const totalCapacity = recommendation.gridLayout.rowCapacities.reduce((a: number, b: number) => a + b, 0);
            console.log('rowCapacities 합계:', totalCapacity);
            console.log('빈좌석 예상:', totalCapacity - recommendation.seats.length);
        }

        // AI 추천 결과를 store에 적용
        const formattedSeats = recommendation.seats.map(seat => ({
            memberId: seat.memberId,
            memberName: seat.memberName,
            part: seat.part,
            row: seat.row,
            col: seat.col,
        }));

        // AI 추천 gridLayout 적용 (빈좌석 방지)
        if (recommendation.gridLayout) {
            setGridLayout({
                rows: recommendation.gridLayout.rows,
                rowCapacities: recommendation.gridLayout.rowCapacities,
                zigzagPattern: recommendation.gridLayout.zigzagPattern,
            });
        }

        setAssignments(formattedSeats);
        const qualityScore = recommendation.qualityScore ?? 0;
        alert(`AI 추천이 적용되었습니다! (품질 점수: ${(qualityScore * 100).toFixed(0)}%)`);
    };

    const handleApplyPastArrangement = (result: ApplyPastResponse) => {
        // 과거 배치 결과를 store에 적용
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
    };

    const handleAnalyze = useCallback(async () => {
        try {
            const result = await arrangementAnalysis.mutateAsync({
                arrangementId: arrangement.id,
            });
            if (isMountedRef.current) {
                setAnalysisResult(result);
                setShowAnalysisModal(true);
            }
        } catch (error) {
            console.error('분석 실패:', error);
            if (isMountedRef.current) {
                alert('배치 분석에 실패했습니다.');
            }
        }
    }, [arrangement.id, arrangementAnalysis]);

    return (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 p-3 sm:p-4 bg-[var(--color-surface)] border-b border-[var(--color-border-default)]">
            <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
                <Button variant="ghost" size="icon" onClick={() => router.back()} className="h-11 w-11 sm:h-10 sm:w-10">
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className="flex-1 sm:flex-none min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <Input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            readOnly={isReadOnly}
                            className={`h-9 sm:h-8 font-bold text-base sm:text-lg border-transparent px-2 -ml-2 w-full sm:w-64 ${isReadOnly ? 'cursor-default' : 'hover:border-[var(--color-border-default)] focus:border-[var(--color-primary-400)]'}`}
                        />
                        <Badge variant={statusBadge.variant} className={`flex-shrink-0 text-xs ${statusBadge.className}`}>
                            {statusBadge.label}
                        </Badge>
                        {currentStatus === 'SHARED' && (
                            <span className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                긴급 수정 가능
                            </span>
                        )}
                    </div>
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-xs sm:text-sm text-[var(--color-text-secondary)]">
                            <span className="flex-shrink-0">
                                {(() => {
                                    const [year, month, day] = arrangement.date.split('-');
                                    return `${year}년 ${month}월 ${day}일`;
                                })()}
                            </span>
                        </div>
                        <ServiceScheduleBadge date={arrangement.date} compact />
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
{!isReadOnly && (
                    <PastArrangementButton
                        arrangementId={arrangement.id}
                        date={arrangement.date}
                        onApply={handleApplyPastArrangement}
                        disabled={isSaving}
                    />
                )}
                {!isReadOnly && gridLayout && (
                    <RecommendButton
                        arrangementId={arrangement.id}
                        gridLayout={gridLayout}
                        onApply={handleApplyRecommendation}
                        disabled={isSaving}
                    />
                )}
{!isReadOnly && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant={rowLeaderMode ? "default" : "outline"}
                                disabled={isSaving || Object.keys(assignments).length === 0}
                                className={`gap-2 h-11 sm:h-10 text-sm ${rowLeaderMode ? 'bg-orange-500 hover:bg-orange-600' : ''}`}
                            >
                                <Crown className="h-4 w-4" />
                                <span className="hidden sm:inline">{rowLeaderMode ? '줄반장 지정 중' : '줄반장'}</span>
                                <ChevronDown className="h-3 w-3 hidden sm:inline" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem
                                onClick={toggleRowLeaderMode}
                                className="cursor-pointer"
                            >
                                <Crown className={`mr-2 h-4 w-4 ${rowLeaderMode ? 'text-orange-500' : ''}`} />
                                {rowLeaderMode ? '수동 지정 모드 끄기' : '수동 지정 모드'}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                onClick={() => {
                                    const candidates = autoAssignRowLeaders();
                                    if (candidates.length > 0) {
                                        alert(`줄반장 ${candidates.length}명이 자동 지정되었습니다.`);
                                    } else {
                                        alert('자동 지정할 수 있는 줄반장이 없습니다.');
                                    }
                                }}
                                className="cursor-pointer"
                            >
                                <Sparkles className="mr-2 h-4 w-4 text-yellow-500" />
                                자동 지정
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={() => {
                                    if (confirm('모든 줄반장 지정을 해제하시겠습니까?')) {
                                        clearAllRowLeaders();
                                    }
                                }}
                                className="cursor-pointer text-red-600"
                            >
                                <Trash2 className="mr-2 h-4 w-4" />
                                전체 해제
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
                {!isReadOnly && (
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
                {!isReadOnly && (
                    <Button
                        variant="outline"
                        onClick={handleReset}
                        disabled={isSaving || Object.keys(assignments).length === 0}
                        className="gap-2 h-11 sm:h-10 text-sm"
                    >
                        <RotateCcw className="h-4 w-4" />
                        <span className="hidden sm:inline">초기화</span>
                    </Button>
                )}
                <Button
                    variant="outline"
                    onClick={handleAnalyze}
                    disabled={isSaving || arrangementAnalysis.isPending || Object.keys(assignments).length === 0}
                    className="gap-2 h-11 sm:h-10 text-sm"
                >
                    {arrangementAnalysis.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <BarChart3 className="h-4 w-4" />
                    )}
                    <span className="hidden sm:inline">분석</span>
                </Button>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="outline"
                            disabled={isSaving || isGenerating || Object.keys(assignments).length === 0}
                            className="gap-2 h-11 sm:h-10 text-sm"
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
                        <DropdownMenuItem
                            onClick={isGenerating ? undefined : handleDownloadImage}
                            className={isGenerating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                        >
                            <Download className="mr-2 h-4 w-4" />
                            PNG 다운로드
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={isGenerating ? undefined : handleCopyToClipboard}
                            className={isGenerating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                        >
                            <Copy className="mr-2 h-4 w-4" />
                            클립보드 복사
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
{/* 상태별 버튼 렌더링 */}
                {currentStatus === 'CONFIRMED' ? (
                    <Button disabled className="gap-2 h-11 sm:h-10 text-sm bg-[var(--color-text-tertiary)]">
                        <Lock className="h-4 w-4" />
                        확정됨
                    </Button>
                ) : currentStatus === 'SHARED' ? (
                    <>
                        <Button onClick={handleSave} disabled={isSaving} className="gap-2 h-11 sm:h-10 text-sm">
                            {isSaving ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Save className="h-4 w-4" />
                            )}
                            저장
                        </Button>
                        <Button
                            variant="outline"
                            onClick={handleRevertToDraft}
                            disabled={isSaving}
                            className="gap-2 h-11 sm:h-10 text-sm"
                        >
                            <Undo2 className="h-4 w-4" />
                            <span className="hidden sm:inline">작성중으로</span>
                        </Button>
                        <Button
                            onClick={handleConfirm}
                            disabled={isSaving || Object.keys(assignments).length === 0}
                            className="gap-2 h-11 sm:h-10 text-sm bg-green-600 hover:bg-green-700"
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
                        <Button onClick={handleSave} disabled={isSaving} className="gap-2 h-11 sm:h-10 text-sm">
                            {isSaving ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Save className="h-4 w-4" />
                            )}
                            저장
                        </Button>
                        <Button
                            onClick={handleShare}
                            disabled={isSaving || Object.keys(assignments).length === 0}
                            className="gap-2 h-11 sm:h-10 text-sm bg-blue-600 hover:bg-blue-700"
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

            {/* 분석 리포트 모달 */}
            {showAnalysisModal && analysisResult && (
                <PerformanceReportModal
                    analysis={analysisResult}
                    onClose={() => setShowAnalysisModal(false)}
                />
            )}
        </div>
    );
}
