'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import ServiceScheduleForm from './ServiceScheduleForm';
import {
  useCreateServiceSchedule,
  useUpdateServiceSchedule,
} from '@/hooks/useServiceSchedules';
import type { Database } from '@/types/database.types';

type ServiceSchedule = Database['public']['Tables']['service_schedules']['Row'];
type ServiceScheduleInsert =
  Database['public']['Tables']['service_schedules']['Insert'];

interface ServiceScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schedule?: ServiceSchedule | null; // 수정 시
  date?: string | null; // 새 일정 생성 시
  onSuccess?: () => void;
}

export default function ServiceScheduleDialog({
  open,
  onOpenChange,
  schedule,
  date,
  onSuccess,
}: ServiceScheduleDialogProps) {
  const createMutation = useCreateServiceSchedule();
  const updateMutation = useUpdateServiceSchedule();

  const isEditing = !!schedule;
  const isLoading = createMutation.isPending || updateMutation.isPending;

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
      } else {
        await createMutation.mutateAsync(data);
      }
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      // 에러는 mutation에서 처리됨
      console.error(error);
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
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
              <span className="block text-sm font-normal text-[var(--color-text-secondary)] mt-1">
                {formatDate(displayDate)}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>
        <ServiceScheduleForm
          initialData={schedule}
          date={date || undefined}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isLoading={isLoading}
        />
      </DialogContent>
    </Dialog>
  );
}
