
'use client';
'use memo';

import { useState, useCallback, memo } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns/format';
import { ko } from 'date-fns/locale/ko';
import { Calendar, User, Music, Edit, Trash2 } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { useDeleteArrangement, ArrangementWithSchedule } from '@/hooks/useArrangements';

interface ArrangementListProps {
    arrangements: ArrangementWithSchedule[];
}

// 개별 배치표 카드 컴포넌트 (메모이제이션)
interface ArrangementCardProps {
    arrangement: ArrangementWithSchedule;
    onEdit: (id: string) => void;
    onDeleteClick: (e: React.MouseEvent, arrangement: ArrangementWithSchedule) => void;
}

const ArrangementCard = memo(function ArrangementCard({
    arrangement,
    onEdit,
    onDeleteClick,
}: ArrangementCardProps) {
    return (
        <Card className="h-full transition-all duration-200 hover:shadow-md hover:border-[var(--color-primary-400)] group">
            <CardHeader className="pb-3">
                <div className="flex justify-between items-start gap-2">
                    <CardTitle className="text-lg font-bold text-[var(--color-text-primary)] line-clamp-1">
                        {format(new Date(arrangement.date), 'yyyy년 M월 d일', { locale: ko })} {arrangement.service_type || arrangement.service_info || '예배'}
                    </CardTitle>
                    <Badge variant={arrangement.is_published ? 'default' : 'secondary'}>
                        {arrangement.is_published ? '발행됨' : '작성중'}
                    </Badge>
                </div>
                <div className="flex items-center text-sm text-[var(--color-text-secondary)] mt-1">
                    <Calendar className="w-4 h-4 mr-1.5" />
                    {format(new Date(arrangement.date), 'yyyy년 M월 d일 (EEE)', { locale: ko })}
                </div>
            </CardHeader>
            <CardContent className="pb-3 space-y-2">
                {arrangement.hymn_name && (
                    <div className="flex items-start text-sm text-[var(--color-text-secondary)]">
                        <Music className="w-4 h-4 mr-2 mt-0.5 text-[var(--color-text-tertiary)]" />
                        <span className="line-clamp-2">{arrangement.hymn_name}</span>
                    </div>
                )}
                {arrangement.offertory_performer && (
                    <div className="flex items-center text-sm text-[var(--color-text-secondary)]">
                        <User className="w-4 h-4 mr-2 text-[var(--color-text-tertiary)]" />
                        <span>봉헌송: {arrangement.offertory_performer}</span>
                    </div>
                )}
            </CardContent>
            <CardFooter className="pt-3 border-t border-[var(--color-border-default)] flex-col gap-3">
                <div className="w-full flex justify-between items-center text-xs text-[var(--color-text-tertiary)]">
                    <span>
                        수정: {format(new Date(arrangement.updated_at), 'yyyy.MM.dd')}
                    </span>
                </div>
                <div className="w-full flex gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 gap-1.5"
                        onClick={() => onEdit(arrangement.id)}
                    >
                        <Edit className="h-3.5 w-3.5" />
                        수정
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 border-[var(--color-error-200)] text-[var(--color-error-600)] hover:bg-[var(--color-error-50)] hover:text-[var(--color-error-700)]"
                        onClick={(e) => onDeleteClick(e, arrangement)}
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                        삭제
                    </Button>
                </div>
            </CardFooter>
        </Card>
    );
});

export default function ArrangementList({ arrangements }: ArrangementListProps) {
    const router = useRouter();
    const deleteArrangement = useDeleteArrangement();
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedArrangement, setSelectedArrangement] = useState<ArrangementWithSchedule | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // 콜백 함수들 메모이제이션
    const handleEdit = useCallback((id: string) => {
        router.push(`/arrangements/${id}`);
    }, [router]);

    const handleDeleteClick = useCallback((e: React.MouseEvent, arrangement: ArrangementWithSchedule) => {
        e.preventDefault();
        e.stopPropagation();
        setSelectedArrangement(arrangement);
        setDeleteDialogOpen(true);
    }, []);

    const handleDeleteConfirm = useCallback(async () => {
        if (!selectedArrangement) return;

        setIsDeleting(true);
        try {
            await deleteArrangement.mutateAsync(selectedArrangement.id);
            setDeleteDialogOpen(false);
            setSelectedArrangement(null);
        } catch (error) {
            console.error('삭제 실패:', error);
            alert('배치표 삭제에 실패했습니다.');
        } finally {
            setIsDeleting(false);
        }
    }, [selectedArrangement, deleteArrangement]);

    const handleCloseDialog = useCallback(() => {
        setDeleteDialogOpen(false);
    }, []);

    if (arrangements.length === 0) {
        return (
            <div className="text-center py-12 bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[var(--color-border-default)]">
                <div className="mx-auto h-12 w-12 text-[var(--color-text-tertiary)] flex items-center justify-center rounded-full bg-[var(--color-background-tertiary)] mb-4">
                    <Calendar className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-medium text-[var(--color-text-primary)]">
                    생성된 배치표가 없습니다
                </h3>
                <p className="mt-1 text-[var(--color-text-secondary)]">
                    새로운 배치표를 만들어보세요.
                </p>
            </div>
        );
    }

    return (
        <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {arrangements.map((arrangement) => (
                    <ArrangementCard
                        key={arrangement.id}
                        arrangement={arrangement}
                        onEdit={handleEdit}
                        onDeleteClick={handleDeleteClick}
                    />
                ))}
            </div>

            {/* 삭제 확인 다이얼로그 */}
            <Dialog open={deleteDialogOpen} onOpenChange={handleCloseDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>배치표 삭제</DialogTitle>
                        <DialogDescription>
                            정말 &quot;{selectedArrangement ? format(new Date(selectedArrangement.date), 'yyyy년 M월 d일', { locale: ko }) : ''} {selectedArrangement?.service_type || selectedArrangement?.service_info || '예배'}&quot; 배치표를 삭제하시겠습니까?
                            <br />
                            이 작업은 되돌릴 수 없으며, 해당 배치표의 모든 좌석 정보도 함께 삭제됩니다.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setDeleteDialogOpen(false)}
                            disabled={isDeleting}
                        >
                            취소
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDeleteConfirm}
                            disabled={isDeleting}
                            className="bg-[var(--color-error-600)] hover:bg-[var(--color-error-700)] text-white"
                        >
                            {isDeleting ? '삭제 중...' : '삭제'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
