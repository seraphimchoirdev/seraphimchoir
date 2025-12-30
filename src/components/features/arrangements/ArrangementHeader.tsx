
'use client';

import { useState, useEffect, RefObject } from 'react';
import { Save, ArrowLeft, Loader2, RotateCcw, Crown, Download, Copy } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useUpdateArrangement } from '@/hooks/useArrangements';
import { useUpdateSeats } from '@/hooks/useSeats';
import { useImageGeneration } from '@/hooks/useImageGeneration';
import { useArrangementStore } from '@/store/arrangement-store';
import RecommendButton from './RecommendButton';
import PastArrangementButton from './PastArrangementButton';
import { ServiceScheduleBadge } from '@/components/features/service-schedules';
import type { Database } from '@/types/database.types';
import type { RecommendationResponse } from '@/hooks/useRecommendSeats';
import type { ApplyPastResponse } from '@/hooks/usePastArrangement';

type Arrangement = Database['public']['Tables']['arrangements']['Row'];

interface ArrangementHeaderProps {
    arrangement: Arrangement;
    captureRef?: RefObject<HTMLDivElement | null>;
}

export default function ArrangementHeader({ arrangement, captureRef }: ArrangementHeaderProps) {
    const router = useRouter();
    const updateArrangement = useUpdateArrangement();
    const updateSeats = useUpdateSeats();
    const { isGenerating, downloadAsImage, copyToClipboard } = useImageGeneration();
    const { assignments, gridLayout, clearArrangement, setAssignments, rowLeaderMode, toggleRowLeaderMode } = useArrangementStore();

    const [title, setTitle] = useState(arrangement.title);
    const [conductor, setConductor] = useState(arrangement.conductor || '');
    const [isSaving, setIsSaving] = useState(false);

    // 이미지 내보내기 핸들러
    const handleDownloadImage = async () => {
        if (!captureRef?.current) {
            alert('캡처할 영역을 찾을 수 없습니다.');
            return;
        }
        try {
            const filename = `배치표_${arrangement.date}_${title.replace(/\s+/g, '_')}`;
            await downloadAsImage(captureRef.current, filename);
            alert('이미지가 다운로드되었습니다.');
        } catch (error) {
            console.error('이미지 다운로드 실패:', error);
            alert('이미지 다운로드에 실패했습니다.');
        }
    };

    const handleCopyToClipboard = async () => {
        if (!captureRef?.current) {
            alert('캡처할 영역을 찾을 수 없습니다.');
            return;
        }
        try {
            await copyToClipboard(captureRef.current);
            alert('이미지가 클립보드에 복사되었습니다.');
        } catch (error) {
            console.error('클립보드 복사 실패:', error);
            alert('클립보드 복사에 실패했습니다. 브라우저 설정을 확인해주세요.');
        }
    };

    // Sync local state if props change (e.g. refetch)
    useEffect(() => {
        setTitle(arrangement.title);
        setConductor(arrangement.conductor || '');
    }, [arrangement]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            // 1. Update Metadata and Grid Layout
            await updateArrangement.mutateAsync({
                id: arrangement.id,
                data: {
                    title,
                    conductor: conductor || null,
                    grid_layout: gridLayout,
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

            alert('저장되었습니다.'); // Simple feedback
        } catch (error) {
            console.error(error);
            alert('저장에 실패했습니다.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleReset = () => {
        if (confirm('모든 자리 배치를 초기화하시겠습니까? 저장하지 않은 변경사항은 복구할 수 없습니다.')) {
            clearArrangement();
        }
    };

    const handleApplyRecommendation = (recommendation: RecommendationResponse) => {
        // AI 추천 결과를 store에 적용
        const formattedSeats = recommendation.seats.map(seat => ({
            memberId: seat.memberId,
            memberName: seat.memberName,
            part: seat.part,
            row: seat.row,
            col: seat.col,
        }));

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
                            className="h-9 sm:h-8 font-bold text-base sm:text-lg border-transparent hover:border-[var(--color-border-default)] focus:border-[var(--color-primary-400)] px-2 -ml-2 w-full sm:w-64"
                        />
                        <Badge variant={arrangement.is_published ? 'default' : 'secondary'} className="flex-shrink-0 text-xs">
                            {arrangement.is_published ? '발행됨' : '작성중'}
                        </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-xs sm:text-sm text-[var(--color-text-secondary)]">
                        <span className="flex-shrink-0">{arrangement.date}</span>
                        <span>•</span>
                        <Input
                            value={conductor}
                            onChange={(e) => setConductor(e.target.value)}
                            placeholder="지휘자 입력"
                            className="h-7 sm:h-6 text-xs sm:text-sm border-transparent hover:border-[var(--color-border-default)] focus:border-[var(--color-primary-400)] px-2 -ml-2 w-28 sm:w-32"
                        />
                        <span className="hidden sm:inline">•</span>
                        <div className="hidden sm:block">
                            <ServiceScheduleBadge date={arrangement.date} compact />
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
                <PastArrangementButton
                    arrangementId={arrangement.id}
                    onApply={handleApplyPastArrangement}
                    disabled={isSaving}
                />
                {gridLayout && (
                    <RecommendButton
                        arrangementId={arrangement.id}
                        gridLayout={gridLayout}
                        onApply={handleApplyRecommendation}
                        disabled={isSaving}
                    />
                )}
                <Button
                    variant={rowLeaderMode ? "default" : "outline"}
                    onClick={toggleRowLeaderMode}
                    disabled={isSaving}
                    className={`gap-2 h-11 sm:h-10 text-sm ${rowLeaderMode ? 'bg-orange-500 hover:bg-orange-600' : ''}`}
                >
                    <Crown className="h-4 w-4" />
                    <span className="hidden sm:inline">{rowLeaderMode ? '줄반장 지정 중' : '줄반장 지정'}</span>
                </Button>
                <Button
                    variant="outline"
                    onClick={handleReset}
                    disabled={isSaving || Object.keys(assignments).length === 0}
                    className="gap-2 h-11 sm:h-10 text-sm"
                >
                    <RotateCcw className="h-4 w-4" />
                    <span className="hidden sm:inline">초기화</span>
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
                <Button onClick={handleSave} disabled={isSaving} className="gap-2 h-11 sm:h-10 text-sm">
                    {isSaving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <Save className="h-4 w-4" />
                    )}
                    저장
                </Button>
            </div>
        </div>
    );
}
