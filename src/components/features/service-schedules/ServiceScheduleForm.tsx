'use client';

import { useState } from 'react';
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
import type { Database } from '@/types/database.types';

// 예배 유형 옵션
const SERVICE_TYPE_OPTIONS = [
  { value: '주일2부예배', label: '주일 2부 예배' },
  { value: '주일오후찬양예배', label: '주일 오후 찬양예배' },
  { value: '새벽기도회', label: '새벽기도회' },
  { value: '기타', label: '기타' },
] as const;

type ServiceSchedule = Database['public']['Tables']['service_schedules']['Row'];
type ServiceScheduleInsert =
  Database['public']['Tables']['service_schedules']['Insert'];

interface ServiceScheduleFormProps {
  initialData?: ServiceSchedule | null;
  date?: string; // 새 일정 생성 시 날짜 지정
  onSubmit: (data: ServiceScheduleInsert) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

// 기존 옵션에 포함된 값인지 확인
function isPresetServiceType(value: string | null | undefined): boolean {
  return SERVICE_TYPE_OPTIONS.some((opt) => opt.value === value);
}

export default function ServiceScheduleForm({
  initialData,
  date,
  onSubmit,
  onCancel,
  isLoading = false,
}: ServiceScheduleFormProps) {
  // 기존 데이터가 프리셋에 없는 경우 "기타" 모드로 시작
  const initialServiceType = initialData?.service_type || '주일2부예배';
  const initialIsCustom = initialServiceType && !isPresetServiceType(initialServiceType);

  const [formData, setFormData] = useState<ServiceScheduleInsert>({
    date: initialData?.date || date || '',
    service_type: initialServiceType,
    hymn_name: initialData?.hymn_name || '',
    offertory_performer: initialData?.offertory_performer || '',
    notes: initialData?.notes || '',
  });

  // "기타" 모드 여부 (직접 입력 모드)
  const [isCustomMode, setIsCustomMode] = useState(initialIsCustom);

  // "기타" 선택 시 직접 입력값
  const [customServiceType, setCustomServiceType] = useState(
    initialIsCustom ? initialServiceType : ''
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="date">예배 날짜</Label>
          <Input
            id="date"
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            disabled={!!initialData} // 수정 시 날짜 변경 불가
            required
          />
        </div>
        <div>
          <Label htmlFor="service_type">예배 유형</Label>
          <Select
            value={isCustomMode ? '기타' : (formData.service_type || '주일2부예배')}
            onValueChange={(value) => {
              if (value === '기타') {
                setIsCustomMode(true);
                setCustomServiceType('');
                setFormData({ ...formData, service_type: '' });
              } else {
                setIsCustomMode(false);
                setCustomServiceType('');
                setFormData({ ...formData, service_type: value });
              }
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="예배 유형 선택" />
            </SelectTrigger>
            <SelectContent>
              {SERVICE_TYPE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {isCustomMode && (
            <Input
              className="mt-2"
              value={customServiceType}
              onChange={(e) => {
                const value = e.target.value;
                setCustomServiceType(value);
                setFormData({ ...formData, service_type: value });
              }}
              placeholder="예배 유형 직접 입력"
              autoFocus
            />
          )}
        </div>
      </div>

      <div>
        <Label htmlFor="hymn_name">찬양곡명</Label>
        <Input
          id="hymn_name"
          value={formData.hymn_name || ''}
          onChange={(e) =>
            setFormData({ ...formData, hymn_name: e.target.value })
          }
          placeholder="예: 나 같은 죄인 살리신"
        />
      </div>

      <div>
        <Label htmlFor="offertory_performer">봉헌송 연주자</Label>
        <Input
          id="offertory_performer"
          value={formData.offertory_performer || ''}
          onChange={(e) =>
            setFormData({ ...formData, offertory_performer: e.target.value })
          }
          placeholder="예: 홍길동 (피아노)"
        />
      </div>

      <div>
        <Label htmlFor="notes">비고</Label>
        <Textarea
          id="notes"
          value={formData.notes || ''}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="추가 메모"
          rows={3}
        />
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
        >
          취소
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? '저장 중...' : initialData ? '수정' : '등록'}
        </Button>
      </div>
    </form>
  );
}
