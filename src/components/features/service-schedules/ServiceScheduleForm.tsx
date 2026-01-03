'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ChevronDown, ChevronUp, Music, Info } from 'lucide-react';
import type { Database } from '@/types/database.types';

// 예배 유형 옵션
const SERVICE_TYPE_OPTIONS = [
  { value: '주일2부예배', label: '주일 2부 예배' },
  { value: '주일오후찬양예배', label: '주일 오후 찬양예배' },
  { value: '절기찬양예배', label: '절기 찬양예배' },
  { value: '기도회', label: '기도회' },
  { value: '기타', label: '기타' },
] as const;

// 후드 색상 옵션
const HOOD_COLOR_OPTIONS = [
  { value: '', label: '선택 안함' },
  { value: '백', label: '백색' },
  { value: '녹', label: '녹색' },
  { value: '보라', label: '보라색' },
  { value: '적', label: '적색' },
  { value: '검정', label: '검정색' },
] as const;

// 특별예배 여부 확인 (주일2부예배가 아닌 경우)
function isSpecialService(serviceType: string | null | undefined): boolean {
  return !!serviceType && serviceType !== '주일2부예배';
}

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

  const [formData, setFormData] = useState<ServiceScheduleInsert>(() => {
    const serviceType = initialServiceType;
    // 특별예배는 예배 후 연습이 보통 없음
    const isSpecial = isSpecialService(serviceType);

    return {
      date: initialData?.date || date || '',
      service_type: serviceType,
      hymn_name: initialData?.hymn_name || '',
      offertory_performer: initialData?.offertory_performer || '',
      notes: initialData?.notes || '',
      // 신규 필드 (선곡표 관련)
      hood_color: initialData?.hood_color || '',
      composer: initialData?.composer || '',
      music_source: initialData?.music_source || '',
      // 연습 설정 필드
      // 특별예배는 예배 후 연습 기본값 false, 일반예배는 true
      has_post_practice: initialData?.has_post_practice ?? !isSpecial,
      post_practice_start_time: initialData?.post_practice_start_time || '07:30',
      post_practice_duration: initialData?.post_practice_duration ?? 60,
      // 예배 전 연습은 모든 예배에서 필수 (등단 인원 전원 참석)
      has_pre_practice: true,
      pre_practice_minutes_before: initialData?.pre_practice_minutes_before ?? 60,
      // 연습 장소
      pre_practice_location: initialData?.pre_practice_location || '2층 1찬양대실',
      post_practice_location: initialData?.post_practice_location || '7층 2찬양대실',
    };
  });

  // 연습 설정 섹션 펼침/접힘 상태
  const [showPracticeSettings, setShowPracticeSettings] = useState(false);

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
                // 기타는 특별예배로 간주 → 예배 후 연습 기본 false
                setFormData({ ...formData, service_type: '', has_post_practice: false });
              } else {
                setIsCustomMode(false);
                setCustomServiceType('');
                // 주일2부예배가 아니면 특별예배 → 예배 후 연습 기본 false
                const isSpecial = isSpecialService(value);
                setFormData({ ...formData, service_type: value, has_post_practice: !isSpecial });
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
                // 기타(커스텀) 유형은 항상 특별예배로 간주 → 예배 후 연습 기본 false
                setFormData({ ...formData, service_type: value });
              }}
              placeholder="예배 유형 직접 입력"
              autoFocus
            />
          )}
        </div>
      </div>

      {/* 후드 색상 */}
      <div>
        <Label htmlFor="hood_color">후드 색상</Label>
        <Select
          value={formData.hood_color || ''}
          onValueChange={(value) =>
            setFormData({ ...formData, hood_color: value || null })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="후드 색상 선택" />
          </SelectTrigger>
          <SelectContent>
            {HOOD_COLOR_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value || 'none'}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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

      {/* 작곡가/편곡자 */}
      <div>
        <Label htmlFor="composer">작곡가/편곡자</Label>
        <Input
          id="composer"
          value={formData.composer || ''}
          onChange={(e) =>
            setFormData({ ...formData, composer: e.target.value })
          }
          placeholder="예: 김영수 편곡"
        />
      </div>

      {/* 악보 출처 */}
      <div>
        <Label htmlFor="music_source">악보 출처</Label>
        <Input
          id="music_source"
          value={formData.music_source || ''}
          onChange={(e) =>
            setFormData({ ...formData, music_source: e.target.value })
          }
          placeholder="예: 성가대곡집 3권 p.45"
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

      {/* 연습 설정 섹션 (접기/펼치기) */}
      <div className="border border-[var(--color-border-default)] rounded-lg overflow-hidden">
        <button
          type="button"
          onClick={() => setShowPracticeSettings(!showPracticeSettings)}
          className="w-full flex items-center justify-between px-4 py-3 bg-[var(--color-background-secondary)] hover:bg-[var(--color-background-tertiary)] transition-colors"
        >
          <div className="flex items-center gap-2">
            <Music className="h-4 w-4 text-[var(--color-text-secondary)]" />
            <span className="font-medium text-[var(--color-text-primary)]">
              연습 설정
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
              예배 전 연습
            </span>
            {formData.has_post_practice && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                예배 후 연습
              </span>
            )}
          </div>
          {showPracticeSettings ? (
            <ChevronUp className="h-4 w-4 text-[var(--color-text-tertiary)]" />
          ) : (
            <ChevronDown className="h-4 w-4 text-[var(--color-text-tertiary)]" />
          )}
        </button>

        {showPracticeSettings && (
          <div className="p-4 space-y-4 bg-[var(--color-surface)]">
            {/* 예배 전 연습 (모든 예배에서 필수) */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-md">
                <Info className="h-4 w-4 text-blue-600 flex-shrink-0" />
                <span className="text-sm text-blue-700">
                  예배 전 연습은 등단 인원 전원 필수 참석입니다
                </span>
              </div>

              <div>
                <Label htmlFor="pre_practice_minutes_before" className="text-sm">
                  예배 시작 몇 분 전
                </Label>
                <Input
                  id="pre_practice_minutes_before"
                  type="number"
                  min={30}
                  max={120}
                  step={10}
                  value={formData.pre_practice_minutes_before ?? 60}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      pre_practice_minutes_before: parseInt(e.target.value) || 60,
                    })
                  }
                  className="w-32"
                />
              </div>
            </div>

            {/* 예배 후 연습 */}
            <div className="space-y-3 pt-3 border-t border-[var(--color-border-subtle)]">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="has_post_practice"
                  checked={formData.has_post_practice ?? true}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, has_post_practice: !!checked })
                  }
                />
                <Label htmlFor="has_post_practice" className="font-medium cursor-pointer">
                  예배 후 연습
                </Label>
              </div>

              {formData.has_post_practice && (
                <div className="ml-6 grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="post_practice_start_time" className="text-sm">
                      시작 시간
                    </Label>
                    <Input
                      id="post_practice_start_time"
                      type="time"
                      value={formData.post_practice_start_time || '07:30'}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          post_practice_start_time: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="post_practice_duration" className="text-sm">
                      소요 시간 (분)
                    </Label>
                    <Input
                      id="post_practice_duration"
                      type="number"
                      min={15}
                      max={180}
                      step={15}
                      value={formData.post_practice_duration ?? 60}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          post_practice_duration: parseInt(e.target.value) || 60,
                        })
                      }
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 연습 장소 */}
            <div className="pt-3 border-t border-[var(--color-border-subtle)] space-y-3">
              <div>
                <Label htmlFor="pre_practice_location" className="text-sm">
                  예배 전 연습 장소
                </Label>
                <Input
                  id="pre_practice_location"
                  value={formData.pre_practice_location || '2층 1찬양대실'}
                  onChange={(e) =>
                    setFormData({ ...formData, pre_practice_location: e.target.value })
                  }
                  placeholder="예: 2층 1찬양대실"
                />
              </div>
              <div>
                <Label htmlFor="post_practice_location" className="text-sm">
                  예배 후 연습 장소
                </Label>
                <Input
                  id="post_practice_location"
                  value={formData.post_practice_location || '7층 2찬양대실'}
                  onChange={(e) =>
                    setFormData({ ...formData, post_practice_location: e.target.value })
                  }
                  placeholder="예: 7층 2찬양대실"
                />
              </div>
            </div>
          </div>
        )}
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
