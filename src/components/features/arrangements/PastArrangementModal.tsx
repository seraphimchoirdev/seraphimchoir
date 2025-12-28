/**
 * 과거 자리배치 선택 모달
 */
'use client';

import { useState } from 'react';
import { Calendar, Users, ChevronLeft, ChevronRight, AlertCircle, Check } from 'lucide-react';
import { usePastArrangements } from '@/hooks/usePastArrangement';
import { Spinner } from '@/components/ui/spinner';

interface PastArrangementModalProps {
    currentArrangementId: string;
    onSelect: (sourceArrangementId: string) => void;
    onCancel: () => void;
    isApplying: boolean;
    error?: string;
}

export default function PastArrangementModal({
    currentArrangementId,
    onSelect,
    onCancel,
    isApplying,
    error
}: PastArrangementModalProps) {
    const [page, setPage] = useState(1);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const limit = 10;

    const { data, isLoading, error: fetchError } = usePastArrangements({
        excludeId: currentArrangementId,
        page,
        limit
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
                                data.data.map((arrangement) => (
                                    <button
                                        key={arrangement.id}
                                        onClick={() => handleSelect(arrangement.id)}
                                        disabled={isApplying}
                                        className={`w-full p-4 rounded-lg border transition-all duration-200 text-left ${
                                            selectedId === arrangement.id
                                                ? 'border-[var(--color-primary-500)] bg-[var(--color-primary-50)] ring-2 ring-[var(--color-primary-200)]'
                                                : 'border-[var(--color-border-default)] bg-[var(--color-background-secondary)] hover:border-[var(--color-border-hover)] hover:bg-[var(--color-background-tertiary)]'
                                        } ${isApplying ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h3 className="font-semibold text-[var(--color-text-primary)] truncate">
                                                        {arrangement.title}
                                                    </h3>
                                                    {selectedId === arrangement.id && (
                                                        <Check className="w-4 h-4 text-[var(--color-primary-600)] flex-shrink-0" />
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-4 text-sm text-[var(--color-text-secondary)]">
                                                    <span className="flex items-center gap-1">
                                                        <Calendar className="w-4 h-4" />
                                                        {formatDate(arrangement.date)}
                                                    </span>
                                                    {arrangement.conductor && (
                                                        <span>지휘: {arrangement.conductor}</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </button>
                                ))
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
