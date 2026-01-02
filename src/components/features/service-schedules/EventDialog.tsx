'use client';

import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Trash2 } from 'lucide-react';
import {
  useCreateChoirEvent,
  useUpdateChoirEvent,
  useDeleteChoirEvent,
  EVENT_TYPES,
  EVENT_TYPE_LABELS,
} from '@/hooks/useChoirEvents';
import type { Database } from '@/types/database.types';

type ChoirEvent = Database['public']['Tables']['choir_events']['Row'];
type ChoirEventInsert = Database['public']['Tables']['choir_events']['Insert'];

interface EventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event?: ChoirEvent | null; // 수정 시
  date?: string | null; // 새 행사 생성 시
  onSuccess?: () => void;
}

// 폼 컴포넌트 분리 - key로 리마운트하여 상태 리셋
function EventForm({
  event,
  date,
  onSubmit,
  onCancel,
  onDelete,
  isLoading,
}: {
  event?: ChoirEvent | null;
  date?: string | null;
  onSubmit: (data: ChoirEventInsert) => void;
  onCancel: () => void;
  onDelete?: () => void;
  isLoading: boolean;
}) {
  const isEditing = !!event;

  // 초기 폼 데이터 계산 (컴포넌트 마운트 시 1회만)
  const initialFormData = useMemo<ChoirEventInsert>(() => {
    if (event) {
      return {
        date: event.date,
        title: event.title,
        event_type: event.event_type,
        start_time: event.start_time,
        end_time: event.end_time,
        location: event.location,
        description: event.description,
      };
    }
    return {
      date: date || '',
      title: '',
      event_type: EVENT_TYPES.FELLOWSHIP,
      start_time: null,
      end_time: null,
      location: null,
      description: null,
    };
  }, [event, date]);

  const [formData, setFormData] = useState<ChoirEventInsert>(initialFormData);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="event_date">날짜</Label>
          <Input
            id="event_date"
            type="date"
            value={formData.date}
            onChange={(e) =>
              setFormData({ ...formData, date: e.target.value })
            }
            disabled={isEditing}
            required
          />
        </div>
        <div>
          <Label htmlFor="event_type">행사 유형</Label>
          <Select
            value={formData.event_type}
            onValueChange={(value) =>
              setFormData({ ...formData, event_type: value })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="유형 선택" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(EVENT_TYPE_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="title">행사명</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) =>
            setFormData({ ...formData, title: e.target.value })
          }
          placeholder="예: 찬양대 야유회"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="start_time">시작 시간</Label>
          <Input
            id="start_time"
            type="time"
            value={formData.start_time || ''}
            onChange={(e) =>
              setFormData({
                ...formData,
                start_time: e.target.value || null,
              })
            }
          />
        </div>
        <div>
          <Label htmlFor="end_time">종료 시간</Label>
          <Input
            id="end_time"
            type="time"
            value={formData.end_time || ''}
            onChange={(e) =>
              setFormData({
                ...formData,
                end_time: e.target.value || null,
              })
            }
          />
        </div>
      </div>

      <div>
        <Label htmlFor="location">장소</Label>
        <Input
          id="location"
          value={formData.location || ''}
          onChange={(e) =>
            setFormData({
              ...formData,
              location: e.target.value || null,
            })
          }
          placeholder="예: 남한산성, 본당"
        />
      </div>

      <div>
        <Label htmlFor="description">설명</Label>
        <Textarea
          id="description"
          value={formData.description || ''}
          onChange={(e) =>
            setFormData({
              ...formData,
              description: e.target.value || null,
            })
          }
          placeholder="행사에 대한 추가 정보"
          rows={3}
        />
      </div>

      <div className="flex justify-between items-center pt-4">
        <div>
          {isEditing && onDelete && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  className="text-red-500 hover:text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  삭제
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>행사 삭제</AlertDialogTitle>
                  <AlertDialogDescription>
                    &quot;{event?.title}&quot; 행사를 삭제하시겠습니까?
                    <br />이 작업은 되돌릴 수 없습니다.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>취소</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={onDelete}
                    className="bg-red-500 hover:bg-red-600"
                  >
                    삭제
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
          >
            취소
          </Button>
          <Button
            type="submit"
            disabled={isLoading}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {isLoading ? '저장 중...' : isEditing ? '수정' : '등록'}
          </Button>
        </div>
      </div>
    </form>
  );
}

export default function EventDialog({
  open,
  onOpenChange,
  event,
  date,
  onSuccess,
}: EventDialogProps) {
  const createMutation = useCreateChoirEvent();
  const updateMutation = useUpdateChoirEvent();
  const deleteMutation = useDeleteChoirEvent();

  const isEditing = !!event;
  const isLoading =
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending;

  // 폼 리마운트용 key (이벤트 ID나 날짜 변경 시 리셋)
  const formKey = event?.id || date || 'new';

  const handleSubmit = async (data: ChoirEventInsert) => {
    try {
      if (isEditing && event) {
        await updateMutation.mutateAsync({
          id: event.id,
          data: {
            title: data.title,
            event_type: data.event_type,
            start_time: data.start_time || null,
            end_time: data.end_time || null,
            location: data.location || null,
            description: data.description || null,
          },
        });
      } else {
        await createMutation.mutateAsync(data);
      }
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error(error);
    }
  };

  const handleDelete = async () => {
    if (!event) return;

    try {
      await deleteMutation.mutateAsync(event.id);
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
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

  const displayDate = event?.date || date;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? '행사 수정' : '행사 등록'}
            {displayDate && (
              <span className="block text-sm font-normal text-[var(--color-text-secondary)] mt-1">
                {formatDate(displayDate)}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <EventForm
          key={formKey}
          event={event}
          date={date}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          onDelete={isEditing ? handleDelete : undefined}
          isLoading={isLoading}
        />
      </DialogContent>
    </Dialog>
  );
}
