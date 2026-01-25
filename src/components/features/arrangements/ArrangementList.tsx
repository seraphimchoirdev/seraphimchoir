'use client';
'use memo';

import { format } from 'date-fns/format';
import { ko } from 'date-fns/locale/ko';
import { AlertTriangle, Calendar, Edit, Eye, Lock, Music, Trash2, User } from 'lucide-react';

import { memo, useCallback, useState } from 'react';

import { useRouter } from 'next/navigation';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import { ArrangementWithSchedule, useDeleteArrangement } from '@/hooks/useArrangements';

import { createLogger } from '@/lib/logger';
import { showError } from '@/lib/toast';

import type { ArrangementStatus } from '@/types/database.types';

const logger = createLogger({ prefix: 'ArrangementList' });

// 상태별 배지 설정 헬퍼
const getStatusBadgeConfig = (status: ArrangementStatus | string | null) => {
  switch (status) {
    case 'SHARED':
      return {
        label: '공유됨',
        className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      };
    case 'CONFIRMED':
      return {
        label: '확정됨',
        className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      };
    case 'DRAFT':
    default:
      return {
        label: '작성중',
        className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      };
  }
};

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
  const currentStatus =
    (arrangement as ArrangementWithSchedule & { status?: string }).status || 'DRAFT';
  const statusBadge = getStatusBadgeConfig(currentStatus);
  const isConfirmed = currentStatus === 'CONFIRMED';
  const isShared = currentStatus === 'SHARED';

  // 2026년 데이터 호환성: service_type에 '찬양곡' 등이 포함된 경우 '주일 2부 예배'로 표시
  const displayServiceType = arrangement.service_type?.includes('찬양곡')
    ? '주일 2부 예배'
    : arrangement.service_type || '예배';

  return (
    <Card className="group flex h-full flex-col transition-all duration-200 hover:border-[var(--color-primary-400)] hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle
            className="line-clamp-1 text-lg font-bold text-[var(--color-text-primary)]"
            title={`${format(new Date(arrangement.date), 'yyyy년 M월 d일', { locale: ko })} ${displayServiceType}`}
          >
            {format(new Date(arrangement.date), 'yyyy년 M월 d일', { locale: ko })}{' '}
            {displayServiceType}
          </CardTitle>
          <div className="flex shrink-0 items-center gap-1">
            <Badge className={`text-xs ${statusBadge.className}`}>{statusBadge.label}</Badge>
            {isShared && (
              <span title="긴급 수정 가능">
                <AlertTriangle className="h-3.5 w-3.5 text-blue-600" />
              </span>
            )}
          </div>
        </div>
        <div className="mt-1 flex items-center text-sm text-[var(--color-text-secondary)]">
          <Calendar className="mr-1.5 h-4 w-4" />
          {format(new Date(arrangement.date), 'yyyy년 M월 d일 (EEE)', { locale: ko })}
        </div>
      </CardHeader>
      <CardContent className="flex-1 space-y-2 pb-3">
        {/* 1. 찬양곡명 표시 (DB 필드 우선) */}
        {arrangement.hymn_name && (
          <div className="flex items-start text-sm text-[var(--color-text-secondary)]">
            <Music className="mt-0.5 mr-2 h-4 w-4 shrink-0 text-[var(--color-text-tertiary)]" />
            <span className="line-clamp-2">{arrangement.hymn_name}</span>
          </div>
        )}

        {/* 2. service_info 파싱하여 부족한 정보 보충 표시 */}
        {arrangement.service_info && (
          <>
            {arrangement.service_info.split('\n').map((line, index) => {
              const isOffertoryLine = line.includes('봉헌송:');

              // 이미 DB 필드로 표시된 정보는 중복 표시 방지
              if (isOffertoryLine && arrangement.offertory_performer) return null;
              if (!isOffertoryLine && arrangement.hymn_name) return null;

              if (!line.trim()) return null;

              if (isOffertoryLine) {
                return (
                  <div
                    key={`info-${index}`}
                    className="flex items-center text-sm text-[var(--color-text-secondary)]"
                  >
                    <User className="mr-2 h-4 w-4 shrink-0 text-[var(--color-text-tertiary)]" />
                    <span className="line-clamp-1">
                      {line.replace('봉헌송:', '').trim() || line}
                    </span>
                  </div>
                );
              } else {
                return (
                  <div
                    key={`info-${index}`}
                    className="flex items-start text-sm text-[var(--color-text-secondary)]"
                  >
                    <Music className="mt-0.5 mr-2 h-4 w-4 shrink-0 text-[var(--color-text-tertiary)]" />
                    <span className="line-clamp-2">
                      {line.replace('찬양곡:', '').trim() || line}
                    </span>
                  </div>
                );
              }
            })}
          </>
        )}

        {/* 3. 봉헌송 연주자 표시 (DB 필드 우선) */}
        {arrangement.offertory_performer && (
          <div className="flex items-center text-sm text-[var(--color-text-secondary)]">
            <User className="mr-2 h-4 w-4 shrink-0 text-[var(--color-text-tertiary)]" />
            <span>봉헌송: {arrangement.offertory_performer}</span>
          </div>
        )}
      </CardContent>
      <CardFooter className="mt-auto flex-col gap-3 border-t border-[var(--color-border-default)] pt-3">
        <div className="flex w-full items-center justify-between text-xs text-[var(--color-text-tertiary)]">
          <span>수정: {format(new Date(arrangement.updated_at), 'yyyy.MM.dd')}</span>
        </div>
        <div className="flex w-full gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 gap-1.5"
            onClick={() => onEdit(arrangement.id)}
          >
            {isConfirmed ? (
              <>
                <Eye className="h-3.5 w-3.5" />
                보기
              </>
            ) : isShared ? (
              <>
                <AlertTriangle className="h-3.5 w-3.5 text-blue-600" />
                긴급수정
              </>
            ) : (
              <>
                <Edit className="h-3.5 w-3.5" />
                수정
              </>
            )}
          </Button>
          {isConfirmed ? (
            <Button
              variant="outline"
              size="sm"
              className="cursor-not-allowed gap-1.5 text-[var(--color-text-tertiary)]"
              disabled
              title="확정된 배치표는 삭제할 수 없습니다"
            >
              <Lock className="h-3.5 w-3.5" />
              잠금
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 border-[var(--color-error-200)] text-[var(--color-error-600)] hover:bg-[var(--color-error-50)] hover:text-[var(--color-error-700)]"
              onClick={(e) => onDeleteClick(e, arrangement)}
            >
              <Trash2 className="h-3.5 w-3.5" />
              삭제
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  );
});

export default function ArrangementList({ arrangements }: ArrangementListProps) {
  const router = useRouter();
  const deleteArrangement = useDeleteArrangement();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedArrangement, setSelectedArrangement] = useState<ArrangementWithSchedule | null>(
    null
  );
  const [isDeleting, setIsDeleting] = useState(false);

  // 콜백 함수들 메모이제이션
  const handleEdit = useCallback(
    (id: string) => {
      router.push(`/arrangements/${id}`);
    },
    [router]
  );

  const handleDeleteClick = useCallback(
    (e: React.MouseEvent, arrangement: ArrangementWithSchedule) => {
      e.preventDefault();
      e.stopPropagation();
      setSelectedArrangement(arrangement);
      setDeleteDialogOpen(true);
    },
    []
  );

  const handleDeleteConfirm = useCallback(async () => {
    if (!selectedArrangement) return;

    setIsDeleting(true);
    try {
      await deleteArrangement.mutateAsync(selectedArrangement.id);
      setDeleteDialogOpen(false);
      setSelectedArrangement(null);
    } catch (error) {
      logger.error('삭제 실패:', error);
      showError('배치표 삭제에 실패했습니다.');
    } finally {
      setIsDeleting(false);
    }
  }, [selectedArrangement, deleteArrangement]);

  const handleCloseDialog = useCallback(() => {
    setDeleteDialogOpen(false);
  }, []);

  if (arrangements.length === 0) {
    return (
      <div className="rounded-[var(--radius-lg)] border border-[var(--color-border-default)] bg-[var(--color-surface)] py-12 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-background-tertiary)] text-[var(--color-text-tertiary)]">
          <Calendar className="h-6 w-6" />
        </div>
        <h3 className="text-lg font-medium text-[var(--color-text-primary)]">
          생성된 배치표가 없습니다
        </h3>
        <p className="mt-1 text-[var(--color-text-secondary)]">새로운 배치표를 만들어보세요.</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
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
              정말 &quot;
              {selectedArrangement
                ? format(new Date(selectedArrangement.date), 'yyyy년 M월 d일', { locale: ko })
                : ''}{' '}
              {selectedArrangement?.service_type || '예배'}&quot; 배치표를 삭제하시겠습니까?
              <br />이 작업은 되돌릴 수 없으며, 해당 배치표의 모든 좌석 정보도 함께 삭제됩니다.
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
              className="bg-[var(--color-error-600)] text-white hover:bg-[var(--color-error-700)]"
            >
              {isDeleting ? '삭제 중...' : '삭제'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
