'use client';

import { useState } from 'react';
import { useCreateMember, useUpdateMember } from '@/hooks/useMembers';
import type { Database } from '@/types/database.types';
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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { createLogger } from '@/lib/logger';

const logger = createLogger({ prefix: 'MemberForm' });

type Part = Database['public']['Enums']['part'];
type MemberStatus = Database['public']['Enums']['member_status'];
type Member = Database['public']['Tables']['members']['Row'];

interface MemberFormProps {
  member?: Member; // 수정 모드일 때 기존 데이터
  onSuccess?: () => void;
  onCancel?: () => void;
}

const PARTS: { value: Part; label: string }[] = [
  { value: 'SOPRANO', label: '소프라노' },
  { value: 'ALTO', label: '알토' },
  { value: 'TENOR', label: '테너' },
  { value: 'BASS', label: '베이스' },
];

const MEMBER_STATUSES: { value: MemberStatus; label: string }[] = [
  { value: 'NEW', label: '신입대원' },
  { value: 'REGULAR', label: '정대원' },
  { value: 'ON_LEAVE', label: '휴직대원' },
  { value: 'RESIGNED', label: '사직대원' },
];

export default function MemberForm({ member, onSuccess, onCancel }: MemberFormProps) {
  const isEditMode = !!member;

  // Form state
  const [formData, setFormData] = useState({
    name: member?.name || '',
    part: member?.part || ('SOPRANO' as Part),
    is_leader: member?.is_leader || false,
    member_status: member?.member_status || ('NEW' as MemberStatus),
    joined_date: member?.joined_date || new Date().toISOString().split('T')[0],
    height: member?.height?.toString() || '',
    phone_number: member?.phone_number || '',
    email: member?.email || '',
    notes: member?.notes || '',
    // 휴직 관련 필드
    leave_reason: member?.leave_reason || '',
    leave_start_date: member?.leave_start_date || '',
    leave_duration_months: member?.leave_duration_months?.toString() || '',
    expected_return_date: member?.expected_return_date || '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [versionConflict, setVersionConflict] = useState(false); // 버전 충돌 상태

  const createMutation = useCreateMember();
  const updateMutation = useUpdateMember();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;

    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }

    // 에러 제거
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name || formData.name.length < 2) {
      newErrors.name = '이름은 최소 2자 이상이어야 합니다';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = '올바른 이메일 형식이 아닙니다';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent, forceUpdate = false) => {
    e.preventDefault();

    if (!validate()) return;

    // 휴직 상태가 아니면 휴직 관련 필드를 null로 설정
    const isOnLeave = formData.member_status === 'ON_LEAVE';

    const submitData = {
      name: formData.name,
      part: formData.part,
      is_leader: formData.is_leader,
      member_status: formData.member_status,
      joined_date: formData.joined_date,
      height: formData.height ? parseInt(formData.height, 10) : null,
      phone_number: formData.phone_number || null,
      email: formData.email || null,
      notes: formData.notes || null,
      // 휴직 관련 필드 (휴직 상태일 때만 값 저장)
      leave_reason: isOnLeave && formData.leave_reason ? formData.leave_reason : null,
      leave_start_date: isOnLeave && formData.leave_start_date ? formData.leave_start_date : null,
      leave_duration_months: isOnLeave && formData.leave_duration_months ? parseInt(formData.leave_duration_months, 10) : null,
      expected_return_date: isOnLeave && formData.expected_return_date ? formData.expected_return_date : null,
    };

    try {
      if (isEditMode && member) {
        await updateMutation.mutateAsync({ id: member.id, data: submitData });
      } else {
        await createMutation.mutateAsync(submitData);
      }
      setVersionConflict(false); // 성공 시 충돌 상태 초기화
      onSuccess?.();
    } catch (error) {
      logger.error('Form submission error:', error);

      // 버전 충돌 감지 (409 Conflict)
      const err = error as Error & { code?: string };
      if (err?.message?.includes('다른 곳에서 수정') || err?.code === 'VERSION_CONFLICT') {
        setVersionConflict(true);
      }
    }
  };

  // 페이지 새로고침 핸들러
  const handleRefresh = () => {
    window.location.reload();
  };

  // 강제 저장 핸들러 (version 체크 없이)
  const handleForceUpdate = (e: React.FormEvent) => {
    handleSubmit(e, true);
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;
  const error = createMutation.error || updateMutation.error;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Subtitle - 모달 컨텍스트 설명 */}
      <div className="pb-4 border-b border-[var(--color-border-default)]">
        <p className="text-sm text-[var(--color-text-secondary)]">
          {isEditMode
            ? '찬양대원의 정보를 수정합니다. 변경 사항은 즉시 반영됩니다.'
            : '새로운 찬양대원의 정보를 입력해주세요. 필수 항목은 * 표시되어 있습니다.'}
        </p>
      </div>

      {/* 버전 충돌 경고 */}
      {versionConflict && (
        <Alert variant="warning">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>버전 충돌 감지</AlertTitle>
          <AlertDescription>
            이 대원 정보가 다른 곳에서 수정되었습니다. 최신 데이터를 불러오거나 현재 입력한 내용으로 덮어쓸 수 있습니다.
            <div className="mt-4 flex gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRefresh}
              >
                새로고침
              </Button>
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={handleForceUpdate}
                disabled={isLoading}
              >
                무시하고 저장
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* 일반 에러 메시지 */}
      {error && !versionConflict && (
        <Alert variant="error">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>오류가 발생했습니다</AlertTitle>
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}

      {/* 기본 정보 섹션 */}
      <div className="space-y-5">
        <div>
          <h3 className="text-base font-semibold text-[var(--color-text-primary)] mb-4">기본 정보</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 이름 */}
            <div className="space-y-2">
              <Label htmlFor="name">
                이름 <span className="text-[var(--color-error-600)]">*</span>
              </Label>
              <Input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="홍길동"
                required
                className={errors.name ? 'border-[var(--color-error-300)] focus-visible:ring-[var(--color-error-500)]' : ''}
              />
              {errors.name && (
                <p className="text-sm text-[var(--color-error-600)]">{errors.name}</p>
              )}
            </div>

            {/* 파트 */}
            <div className="space-y-2">
              <Label htmlFor="part">
                파트 <span className="text-[var(--color-error-600)]">*</span>
              </Label>
              <Select
                value={formData.part}
                onValueChange={(value) => handleSelectChange('part', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="파트 선택" />
                </SelectTrigger>
                <SelectContent>
                  {PARTS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 키 */}
            <div className="space-y-2">
              <Label htmlFor="height">키 (cm)</Label>
              <Input
                type="number"
                id="height"
                name="height"
                value={formData.height}
                onChange={handleChange}
                placeholder="170"
                min={100}
                max={250}
              />
              <p className="text-xs text-[var(--color-text-tertiary)]">
                자리배치 AI 추천에 활용됩니다
              </p>
            </div>

            {/* 파트장 여부 */}
            <div className="flex items-center gap-2 pt-2 md:col-span-2">
              <input
                type="checkbox"
                id="is_leader"
                name="is_leader"
                checked={formData.is_leader}
                onChange={handleChange}
                className="h-4 w-4 rounded border-[var(--color-border-default)] text-[var(--color-primary-600)] focus:ring-[var(--color-primary-500)] cursor-pointer"
              />
              <Label htmlFor="is_leader" className="cursor-pointer font-normal">
                파트장으로 지정
              </Label>
            </div>
          </div>
        </div>

        {/* 대원 상태 섹션 */}
        <div className="pt-6 border-t border-[var(--color-border-default)]">
          <h3 className="text-base font-semibold text-[var(--color-text-primary)] mb-4">대원 상태</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="member_status">상태 구분</Label>
              <Select
                value={formData.member_status}
                onValueChange={(value) => handleSelectChange('member_status', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="상태 선택" />
                </SelectTrigger>
                <SelectContent>
                  {MEMBER_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-[var(--color-text-tertiary)]">
                신입대원은 3개월 후 자동으로 정대원으로 전환됩니다
              </p>
            </div>

            {/* 정대원 임명일 */}
            <div className="space-y-2">
              <Label htmlFor="joined_date">
                정대원 임명일 <span className="text-[var(--color-error-600)]">*</span>
              </Label>
              <Input
                type="date"
                id="joined_date"
                name="joined_date"
                value={formData.joined_date}
                onChange={handleChange}
                required
              />
              <p className="text-xs text-[var(--color-text-tertiary)]">
                이 날짜 이후의 배치표에만 표시됩니다
              </p>
            </div>
          </div>

          {/* 휴직 정보 (휴직대원일 때만 표시) */}
          {formData.member_status === 'ON_LEAVE' && (
            <div className="mt-6 p-4 bg-[var(--color-warning-50)] border border-[var(--color-warning-200)] rounded-lg">
              <h4 className="text-sm font-semibold text-[var(--color-warning-700)] mb-4">휴직 정보</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 휴직 사유 */}
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="leave_reason">휴직 사유</Label>
                  <Input
                    type="text"
                    id="leave_reason"
                    name="leave_reason"
                    value={formData.leave_reason}
                    onChange={handleChange}
                    placeholder="예: 해외 출장, 건강 문제, 개인 사정 등"
                  />
                </div>

                {/* 휴직 시작일 */}
                <div className="space-y-2">
                  <Label htmlFor="leave_start_date">휴직 시작일</Label>
                  <Input
                    type="date"
                    id="leave_start_date"
                    name="leave_start_date"
                    value={formData.leave_start_date}
                    onChange={handleChange}
                  />
                </div>

                {/* 휴직 기간 */}
                <div className="space-y-2">
                  <Label htmlFor="leave_duration_months">휴직 기간 (개월)</Label>
                  <Input
                    type="number"
                    id="leave_duration_months"
                    name="leave_duration_months"
                    value={formData.leave_duration_months}
                    onChange={handleChange}
                    placeholder="3"
                    min={1}
                    max={24}
                  />
                </div>

                {/* 복직 예정일 */}
                <div className="space-y-2">
                  <Label htmlFor="expected_return_date">복직 예정일</Label>
                  <Input
                    type="date"
                    id="expected_return_date"
                    name="expected_return_date"
                    value={formData.expected_return_date}
                    onChange={handleChange}
                  />
                  <p className="text-xs text-[var(--color-text-tertiary)]">
                    복직 예정일이 지나면 알림이 표시됩니다
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 연락처 정보 섹션 */}
        <div className="pt-6 border-t border-[var(--color-border-default)]">
          <h3 className="text-base font-semibold text-[var(--color-text-primary)] mb-4">연락처 정보</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 전화번호 */}
            <div className="space-y-2">
              <Label htmlFor="phone_number">연락처</Label>
              <Input
                type="tel"
                id="phone_number"
                name="phone_number"
                value={formData.phone_number}
                onChange={handleChange}
                placeholder="010-1234-5678"
              />
              <p className="text-xs text-[var(--color-text-tertiary)]">
                출석 확인 및 공지사항 전달에 사용됩니다
              </p>
            </div>

            {/* 이메일 */}
            <div className="space-y-2">
              <Label htmlFor="email">이메일</Label>
              <Input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="example@email.com"
                className={errors.email ? 'border-[var(--color-error-300)] focus-visible:ring-[var(--color-error-500)]' : ''}
              />
              {errors.email && (
                <p className="text-sm text-[var(--color-error-600)]">{errors.email}</p>
              )}
            </div>
          </div>
        </div>

        {/* 추가 정보 섹션 */}
        <div className="pt-6 border-t border-[var(--color-border-default)]">
          <h3 className="text-base font-semibold text-[var(--color-text-primary)] mb-4">추가 정보</h3>
          <div className="space-y-2">
            <Label htmlFor="notes">특이사항</Label>
            <Textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={4}
              placeholder="건강 상태, 자리배치 시 고려사항 등을 입력해주세요"
              className="resize-none"
            />
            <p className="text-xs text-[var(--color-text-tertiary)]">
              자리배치 시 참고할 사항을 자유롭게 기록해주세요
            </p>
          </div>
        </div>
      </div>

      {/* 액션 버튼 */}
      <div className="flex items-center justify-end gap-3 pt-6 border-t border-[var(--color-border-default)]">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
          >
            취소
          </Button>
        )}
        <Button
          type="submit"
          disabled={isLoading}
        >
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isLoading ? '처리 중...' : isEditMode ? '수정 완료' : '대원 등록'}
        </Button>
      </div>
    </form>
  );
}
