/**
 * 과거 자리배치 불러오기 버튼
 * 현재 그리드 레이아웃(AI 추천 분배 등)을 유지하면서 과거 배치 적용
 */
'use client';

import { useState } from 'react';
import { History, Loader2 } from 'lucide-react';
import { useApplyPastArrangement, type ApplyPastResponse } from '@/hooks/usePastArrangement';
import { useArrangementStore } from '@/store/arrangement-store';
import PastArrangementModal from './PastArrangementModal';

interface PastArrangementButtonProps {
    arrangementId: string;
    onApply: (result: ApplyPastResponse) => void;
    disabled?: boolean;
}

export default function PastArrangementButton({
    arrangementId,
    onApply,
    disabled
}: PastArrangementButtonProps) {
    const [showModal, setShowModal] = useState(false);
    const applyMutation = useApplyPastArrangement();
    // 현재 그리드 레이아웃 (AI 추천 분배로 변경된 값 포함)
    const gridLayout = useArrangementStore((state) => state.gridLayout);

    const handleSelect = async (sourceArrangementId: string) => {
        try {
            const result = await applyMutation.mutateAsync({
                currentArrangementId: arrangementId,
                sourceArrangementId,
                // 현재 클라이언트의 그리드 레이아웃 전달 (null인 경우 undefined로 변환)
                gridLayout: gridLayout ?? undefined
            });

            onApply(result);
            setShowModal(false);
        } catch (error) {
            console.error('과거 배치 적용 실패:', error);
            // 에러는 모달 내에서 처리
        }
    };

    const handleCancel = () => {
        setShowModal(false);
    };

    return (
        <>
            <button
                onClick={() => setShowModal(true)}
                disabled={disabled || applyMutation.isPending}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--color-background-secondary)] border border-[var(--color-border-default)] text-[var(--color-text-primary)] rounded-lg font-medium hover:bg-[var(--color-background-tertiary)] hover:border-[var(--color-border-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
                {applyMutation.isPending ? (
                    <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>적용 중...</span>
                    </>
                ) : (
                    <>
                        <History className="w-5 h-5" />
                        <span>과거 배치</span>
                    </>
                )}
            </button>

            {showModal && (
                <PastArrangementModal
                    currentArrangementId={arrangementId}
                    onSelect={handleSelect}
                    onCancel={handleCancel}
                    isApplying={applyMutation.isPending}
                    error={applyMutation.error?.message}
                />
            )}
        </>
    );
}
