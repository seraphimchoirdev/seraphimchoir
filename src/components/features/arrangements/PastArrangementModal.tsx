/**
 * 과거 자리배치 선택 모달
 * - 등단 인원수 및 파트별 구성 표시
 * - 유사도 매칭으로 추천 배치 최상단 표시
 */
'use client';

import { useState } from 'react';
import { Calendar, Users, ChevronLeft, ChevronRight, AlertCircle, Check, Music, Star } from 'lucide-react';
import { usePastArrangements, type PartComposition, type EnrichedArrangement } from '@/hooks/usePastArrangement';
import { Spinner } from '@/components/ui/spinner';

interface PastArrangementModalProps {
    currentArrangementId: string;
    onSelect: (sourceArrangementId: string) => void;
    onCancel: () => void;
    isApplying: boolean;
    error?: string;
    /** 현재 날짜의 출석 가능 인원 파트별 구성 (유사도 계산용) */
    currentComposition?: PartComposition;
}

// 파트별 축약 라벨
const PART_SHORT_LABELS: Record<keyof PartComposition, string> = {
    SOPRANO: 'S',
    ALTO: 'A',
    TENOR: 'T',
    BASS: 'B',
    SPECIAL: '특',
};

// 파트별 색상
const PART_COLORS: Record<keyof PartComposition, string> = {
    SOPRANO: 'bg-[var(--color-part-soprano-100)] text-[var(--color-part-soprano-700)]',
    ALTO: 'bg-[var(--color-part-alto-100)] text-[var(--color-part-alto-700)]',
    TENOR: 'bg-[var(--color-part-tenor-100)] text-[var(--color-part-tenor-700)]',
    BASS: 'bg-[var(--color-part-bass-100)] text-[var(--color-part-bass-700)]',
    SPECIAL: 'bg-[var(--color-part-special-100)] text-[var(--color-part-special-700)]',
};

export default function PastArrangementModal({
    currentArrangementId,
    onSelect,
    onCancel,
    isApplying,
    error,
    currentComposition
}: PastArrangementModalProps) {
    const [page, setPage] = useState(1);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const limit = 10;

    const { data, isLoading, error: fetchError } = usePastArrangements({
        excludeId: currentArrangementId,
        page,
        limit,
        currentComposition
    });

    const handleSelect = (id: string) => {
        setSelectedId(id);
    };

    const handleApply = () => {
        if (selectedId) {
            onSelect(selectedId);
        }
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            weekday: 'short'
        });
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-[var(--color-surface)] rounded-lg shadow-xl max-w-lg w-full max-h-[80vh] overflow-hidden flex flex-col">
                {/* 헤더 */}
                <div className="p-6 border-b border-[var(--color-border)]">
                    <h2 className="text-xl font-bold text-[var(--color-text-primary)]">
                        과거 배치 불러오기
                    </h2>
                    <p className="text-sm text-[var(--color-text-secondary)] mt-1">
                        불러올 과거 배치표를 선택하세요. 현재 출석 가능 인원과 매칭됩니다.
                    </p>
                    {currentComposition && (
                        <div className="mt-2 flex items-center gap-2 text-xs text-[var(--color-text-tertiary)]">
                            <Star className="w-3.5 h-3.5 text-[var(--color-success-500)]" />
                            <span>
                                현재 인원 구성과 유사한 배치를 최상단에 표시합니다
                            </span>
                        </div>
                    )}
                </div>

                {/* 본문 */}
                <div className="flex-1 overflow-y-auto p-4">
                    {/* 에러 메시지 */}
                    {(error || fetchError) && (
                        <div className="mb-4 p-3 bg-[var(--color-error-50)] border border-[var(--color-error-200)] rounded-lg flex items-start gap-2">
                            <AlertCircle className="w-5 h-5 text-[var(--color-error-600)] flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-[var(--color-error-700)]">
                                {error || fetchError?.message}
                            </p>
                        </div>
                    )}

                    {/* 로딩 */}
                    {isLoading && (
                        <div className="flex items-center justify-center py-12">
                            <Spinner size="lg" />
                        </div>
                    )}

                    {/* 배치표 목록 */}
                    {!isLoading && data?.data && (
                        <div className="space-y-2">
                            {data.data.length === 0 ? (
                                <div className="text-center py-12 text-[var(--color-text-secondary)]">
                                    과거 배치표가 없습니다
                                </div>
                            ) : (
                                data.data.map((arrangement, index) => {
                                    const isRecommended = currentComposition && arrangement.similarity_score && arrangement.similarity_score >= 80;
                                    const isHighMatch = currentComposition && arrangement.similarity_score && arrangement.similarity_score >= 90;

                                    return (
                                        <button
                                            key={arrangement.id}
                                            onClick={() => handleSelect(arrangement.id)}
                                            disabled={isApplying}
                                            className={`w-full p-4 rounded-lg border transition-all duration-200 text-left ${
                                                selectedId === arrangement.id
                                                    ? 'border-[var(--color-primary-500)] bg-[var(--color-primary-50)] ring-2 ring-[var(--color-primary-200)]'
                                                    : isHighMatch
                                                        ? 'border-[var(--color-success-300)] bg-[var(--color-success-50)]'
                                                        : isRecommended
                                                            ? 'border-[var(--color-warning-300)] bg-[var(--color-warning-50)]'
                                                            : 'border-[var(--color-border-default)] bg-[var(--color-background-secondary)] hover:border-[var(--color-border-hover)] hover:bg-[var(--color-background-tertiary)]'
                                            } ${isApplying ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex-1 min-w-0">
                                                    {/* 제목 줄 */}
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <h3 className="font-semibold text-[var(--color-text-primary)] truncate">
                                                            {arrangement.title}
                                                        </h3>
                                                        {selectedId === arrangement.id && (
                                                            <Check className="w-4 h-4 text-[var(--color-primary-600)] flex-shrink-0" />
                                                        )}
                                                        {/* 유사도 뱃지 */}
                                                        {arrangement.similarity_score !== undefined && arrangement.similarity_score >= 70 && (
                                                            <span className={`flex items-center gap-0.5 px-1.5 py-0.5 text-xs font-medium rounded ${
                                                                arrangement.similarity_score >= 90
                                                                    ? 'bg-[var(--color-success-100)] text-[var(--color-success-700)]'
                                                                    : arrangement.similarity_score >= 80
                                                                        ? 'bg-[var(--color-warning-100)] text-[var(--color-warning-700)]'
                                                                        : 'bg-[var(--color-background-tertiary)] text-[var(--color-text-secondary)]'
                                                            }`}>
                                                                <Star className="w-3 h-3" />
                                                                {arrangement.similarity_score}%
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* 날짜 및 등단 인원 */}
                                                    <div className="flex items-center gap-3 text-sm text-[var(--color-text-secondary)] mb-2">
                                                        <span className="flex items-center gap-1">
                                                            <Calendar className="w-4 h-4" />
                                                            {formatDate(arrangement.date)}
                                                        </span>
                                                        <span className="flex items-center gap-1">
                                                            <Users className="w-4 h-4" />
                                                            {arrangement.seat_count}명 등단
                                                        </span>
                                                    </div>

                                                    {/* 봉헌송 연주자 (있는 경우) */}
                                                    {arrangement.offertory_performer && (
                                                        <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-tertiary)] mb-2">
                                                            <Music className="w-3.5 h-3.5" />
                                                            <span>봉헌송: {arrangement.offertory_performer}</span>
                                                        </div>
                                                    )}

                                                    {/* 파트별 구성 */}
                                                    <div className="flex items-center gap-1 flex-wrap">
                                                        {(['SOPRANO', 'ALTO', 'TENOR', 'BASS', 'SPECIAL'] as const).map((part) => {
                                                            const count = arrangement.part_composition?.[part] || 0;
                                                            if (count === 0) return null;
                                                            return (
                                                                <span
                                                                    key={part}
                                                                    className={`px-1.5 py-0.5 text-xs font-medium rounded ${PART_COLORS[part]}`}
                                                                >
                                                                    {PART_SHORT_LABELS[part]}{count}
                                                                </span>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    )}
                </div>

                {/* 페이지네이션 */}
                {data?.meta && data.meta.totalPages > 1 && (
                    <div className="px-6 py-3 border-t border-[var(--color-border)] bg-[var(--color-background-secondary)]">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-[var(--color-text-secondary)]">
                                {data.meta.total}개 중 {((page - 1) * limit) + 1}-
                                {Math.min(page * limit, data.meta.total)}
                            </span>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1 || isApplying}
                                    className="p-2 rounded-lg border border-[var(--color-border-default)] hover:bg-[var(--color-background-tertiary)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                <span className="text-sm text-[var(--color-text-primary)] min-w-[60px] text-center">
                                    {page} / {data.meta.totalPages}
                                </span>
                                <button
                                    onClick={() => setPage(p => Math.min(data.meta.totalPages, p + 1))}
                                    disabled={page === data.meta.totalPages || isApplying}
                                    className="p-2 rounded-lg border border-[var(--color-border-default)] hover:bg-[var(--color-background-tertiary)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* 푸터 */}
                <div className="p-6 border-t border-[var(--color-border)] flex gap-3 justify-end bg-[var(--color-surface)]">
                    <button
                        onClick={onCancel}
                        disabled={isApplying}
                        className="px-4 py-2 border border-[var(--color-border)] text-[var(--color-text-primary)] rounded-lg font-medium hover:bg-[var(--color-background-secondary)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        취소
                    </button>
                    <button
                        onClick={handleApply}
                        disabled={!selectedId || isApplying}
                        className="px-4 py-2 bg-[var(--color-primary-500)] text-white rounded-lg font-medium hover:bg-[var(--color-primary-600)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {isApplying ? '적용 중...' : '적용하기'}
                    </button>
                </div>
            </div>
        </div>
    );
}
