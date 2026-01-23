'use client';

import { useMemo } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Clock, Users, ArrowRight, Database, RefreshCw } from 'lucide-react';
import type { DraftInfo, RestoreOption } from '@/hooks/useRestoreDraft';

interface RestoreDialogProps {
    /** 다이얼로그 열림 상태 */
    open: boolean;
    /** Draft 정보 */
    draftInfo: DraftInfo | null;
    /** DB에 저장된 데이터가 있는지 */
    hasDbData: boolean;
    /** 선택 처리 */
    onChoice: (choice: RestoreOption) => void;
    /** 다이얼로그 닫기 */
    onClose: () => void;
}

/**
 * 복원 확인 다이얼로그
 *
 * 이전 작업이 있을 때 사용자에게 복원 여부를 선택하게 합니다.
 */
export default function RestoreDialog({
    open,
    draftInfo,
    hasDbData,
    onChoice,
    onClose,
}: RestoreDialogProps) {
    // 저장 시점 포맷팅
    const formattedSavedAt = useMemo(() => {
        if (!draftInfo) return '';

        const date = draftInfo.savedAt;
        const month = date.getMonth() + 1;
        const day = date.getDate();
        const hour = date.getHours();
        const minute = date.getMinutes().toString().padStart(2, '0');
        const ampm = hour < 12 ? '오전' : '오후';
        const hour12 = hour % 12 || 12;

        return `${month}월 ${day}일 ${ampm} ${hour12}:${minute}`;
    }, [draftInfo]);

    if (!draftInfo) return null;

    return (
        <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <RefreshCw className="h-5 w-5 text-blue-500" />
                        이전 작업 복원
                    </DialogTitle>
                    <DialogDescription>
                        저장하지 않은 작업이 있습니다.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4 space-y-3">
                    {/* Draft 정보 표시 */}
                    <div className="bg-[var(--color-background-secondary)] rounded-lg p-4 space-y-2">
                        <div className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
                            <Clock className="h-4 w-4" />
                            <span>저장 시점:</span>
                            <span className="font-medium text-[var(--color-text-primary)]">
                                {formattedSavedAt}
                            </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
                            <ArrowRight className="h-4 w-4" />
                            <span>진행 단계:</span>
                            <span className="font-medium text-[var(--color-text-primary)]">
                                {draftInfo.stepTitle} ({draftInfo.currentStep}/7)
                            </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
                            <Users className="h-4 w-4" />
                            <span>배치된 대원:</span>
                            <span className="font-medium text-[var(--color-text-primary)]">
                                {draftInfo.assignedCount}명
                            </span>
                        </div>
                    </div>

                    {/* DB 데이터 존재 시 안내 */}
                    {hasDbData && (
                        <div className="flex items-start gap-2 text-xs text-[var(--color-text-tertiary)] bg-[var(--color-background-tertiary)] rounded-lg p-3">
                            <Database className="h-4 w-4 flex-shrink-0 mt-0.5" />
                            <span>
                                서버에 저장된 데이터가 있습니다.
                                <br />
                                &quot;저장된 데이터 사용&quot;을 선택하면 서버의 최신 상태로 시작합니다.
                            </span>
                        </div>
                    )}
                </div>

                <DialogFooter className="flex-col sm:flex-row gap-2">
                    {/* 새로 시작 버튼 */}
                    <Button
                        variant="outline"
                        onClick={() => onChoice('startFresh')}
                        className="w-full sm:w-auto"
                    >
                        새로 시작
                    </Button>

                    {/* DB 데이터가 있을 때 추가 옵션 */}
                    {hasDbData && (
                        <Button
                            variant="outline"
                            onClick={() => onChoice('useDb')}
                            className="w-full sm:w-auto"
                        >
                            <Database className="h-4 w-4 mr-2" />
                            저장된 데이터 사용
                        </Button>
                    )}

                    {/* 복원 버튼 (강조) */}
                    <Button
                        onClick={() => onChoice('restore')}
                        className="w-full sm:w-auto"
                    >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        복원하기
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
