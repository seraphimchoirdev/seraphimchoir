'use client';

import { useState } from 'react';

import { Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

import {
  useCreateServiceSchedule,
  useDeleteServiceSchedule,
  useUpdateServiceSchedule,
} from '@/hooks/useServiceSchedules';

import { createLogger } from '@/lib/logger';
import { showError, showSuccess } from '@/lib/toast';

import type { Database } from '@/types/database.types';

import ServiceScheduleForm from './ServiceScheduleForm';

type ServiceSchedule = Database['public']['Tables']['service_schedules']['Row'];
type ServiceScheduleInsert = Database['public']['Tables']['service_schedules']['Insert'];

const logger = createLogger({ prefix: 'ServiceScheduleDialog' });

interface ServiceScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schedule?: ServiceSchedule | null; // 수정 시
  date?: string | null; // 새 일정 생성 시
  onSuccess?: () => void;
  canDelete?: boolean; // 삭제 권한 여부
}

export default function ServiceScheduleDialog({
  open,
  onOpenChange,
  schedule,
  date,
  onSuccess,
  canDelete,
}: ServiceScheduleDialogProps) {
  const createMutation = useCreateServiceSchedule();
  const updateMutation = useUpdateServiceSchedule();
  const deleteMutation = useDeleteServiceSchedule();

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const isEditing = !!schedule;
  const isLoading = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  const handleSubmit = async (data: ServiceScheduleInsert) => {
    try {
      if (isEditing && schedule) {
        await updateMutation.mutateAsync({
          id: schedule.id,
          data: {
            service_type: data.service_type,
            hymn_name: data.hymn_name,
            offertory_performer: data.offertory_performer,
            notes: data.notes,
            // 선곡표 필드
            hood_color: data.hood_color,
            composer: data.composer,
            music_source: data.music_source,
            // 연습 설정 필드
            has_post_practice: data.has_post_practice,
            post_practice_start_time: data.post_practice_start_time,
            post_practice_duration: data.post_practice_duration,
            has_pre_practice: data.has_pre_practice,
            pre_practice_minutes_before: data.pre_practice_minutes_before,
            pre_practice_location: data.pre_practice_location,
            post_practice_location: data.post_practice_location,
          },
        });
        showSuccess('일정이 수정되었습니다.');
      } else {
        await createMutation.mutateAsync(data);
        showSuccess('일정이 등록되었습니다.');
      }
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      logger.error('ServiceSchedule mutation error:', error);
      showError('저장에 실패했습니다.');
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  const handleDelete = async () => {
    if (!schedule) return;
    try {
      await deleteMutation.mutateAsync(schedule.id);
      showSuccess('일정이 삭제되었습니다.');
      setShowDeleteConfirm(false);
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      logger.error('ServiceSchedule delete error:', error);
      showError('삭제에 실패했습니다.');
    }
  };

  // 날짜 포맷팅
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
  };

  const displayDate = schedule?.date || date;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? '예배 일정 수정' : '예배 일정 등록'}
            {displayDate && (
              <span className="mt-1 block text-sm font-normal text-[var(--color-text-secondary)]">
                {formatDate(displayDate)}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>
        {isEditing && canDelete && (
          <div className="flex items-center border-b border-[var(--color-border-subtle)] pb-3">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-red-600 hover:bg-red-50 hover:text-red-700"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={isLoading}
            >
              <Trash2 className="h-4 w-4" />
              삭제
            </Button>
          </div>
        )}
        <ServiceScheduleForm
          initialData={schedule}
          date={date || undefined}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isLoading={isLoading}
        />
      </DialogContent>

      <ConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title="예배 일정 삭제"
        description="이 예배 일정을 삭제하시겠습니까? 삭제된 일정은 복구할 수 없습니다."
        variant="destructive"
        onConfirm={handleDelete}
        isLoading={deleteMutation.isPending}
      />
    </Dialog>
  );
}
