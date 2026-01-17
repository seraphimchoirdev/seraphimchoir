/**
 * 과거 자리배치 불러오기 버튼
 * 현재 그리드 레이아웃(AI 추천 분배 등)을 유지하면서 과거 배치 적용
 * - 현재 날짜의 출석 가능 인원 파트별 구성으로 유사도 매칭
 */
'use client';

import { useState, useMemo } from 'react';
import { History, Loader2 } from 'lucide-react';
import { useApplyPastArrangement, type ApplyPastResponse, type PartComposition } from '@/hooks/usePastArrangement';
import { useArrangementStore } from '@/store/arrangement-store';
import { useMembers } from '@/hooks/useMembers';
import { useAttendances } from '@/hooks/useAttendances';
import PastArrangementModal from './PastArrangementModal';
import { createLogger } from '@/lib/logger';

const logger = createLogger({ prefix: 'PastArrangementButton' });

interface PastArrangementButtonProps {
    arrangementId: string;
    /** 현재 배치표의 날짜 (유사도 계산에 필요) */
    date?: string;
    onApply: (result: ApplyPastResponse) => void;
    disabled?: boolean;
}

export default function PastArrangementButton({
    arrangementId,
    date,
    onApply,
    disabled
}: PastArrangementButtonProps) {
    const [showModal, setShowModal] = useState(false);
    const applyMutation = useApplyPastArrangement();
    // 현재 그리드 레이아웃 (AI 추천 분배로 변경된 값 포함)
    const gridLayout = useArrangementStore((state) => state.gridLayout);

    // 현재 날짜의 출석 가능 인원 조회 (유사도 계산용 - 등단자만)
    const { data: membersData } = useMembers({
        member_status: 'REGULAR',
        is_singer: true, // 등단자만 (지휘자/반주자 제외)
        limit: 100,
    });
    const { data: attendances } = useAttendances({
        date: date || '',
    });

    // 현재 날짜의 파트별 구성 계산
    const currentComposition = useMemo<PartComposition | undefined>(() => {
        if (!date || !membersData?.data) return undefined;

        const members = membersData.data;

        // 출석 Map 생성
        const attendanceMap = new Map<string, boolean>();
        attendances?.forEach((a) => {
            attendanceMap.set(a.member_id, a.is_service_available === true);
        });

        // 파트별 등단 가능 인원 카운트
        const composition: PartComposition = {
            SOPRANO: 0,
            ALTO: 0,
            TENOR: 0,
            BASS: 0,
            SPECIAL: 0,
        };

        members.forEach((member) => {
            // 출석 레코드가 없으면 기본값 true (등단 가능)
            const isAvailable = attendanceMap.has(member.id)
                ? attendanceMap.get(member.id)
                : true;

            if (isAvailable && member.part in composition) {
                composition[member.part as keyof PartComposition]++;
            }
        });

        return composition;
    }, [date, membersData?.data, attendances]);

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
            logger.error('과거 배치 적용 실패:', error);
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
                    currentComposition={currentComposition}
                />
            )}
        </>
    );
}
