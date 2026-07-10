'use client';

import { Plus, X } from 'lucide-react';

import { useState } from 'react';

import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

import { useAuth } from '@/hooks/useAuth';
import { useCreatePoll } from '@/hooks/usePolls';

import {
  PART_LABELS,
  POLL_SENIOR_STAFF_ROLES,
  SELECTABLE_PARTS,
} from '@/lib/community/poll-constants';
import { showError, showSuccess } from '@/lib/toast';
import { cn } from '@/lib/utils';

import type { PollAudience, PollType } from '@/types/community';

const TYPE_OPTIONS: Array<{ value: PollType; label: string; desc: string }> = [
  { value: 'attendance', label: '참석 조사', desc: '참석/불참/미정' },
  { value: 'choice', label: '선택 투표', desc: '선택지 중 고르기' },
  { value: 'open_ended', label: '주관식', desc: '자유 의견 수집' },
];

const AUDIENCE_OPTIONS: Array<{ value: PollAudience; label: string }> = [
  { value: 'ALL', label: '전 대원' },
  { value: 'STAFF', label: '임원' },
  { value: 'PART', label: '특정 파트' },
];

export default function PollForm() {
  const router = useRouter();
  const { profile } = useAuth();
  const createPoll = useCreatePoll();

  // 파트장은 자기 파트 대상만 (RLS와 동일 제약을 폼에서 선반영)
  const isSeniorStaff = POLL_SENIOR_STAFF_ROLES.includes(profile?.role || '');
  const myPart = profile?.linked_member?.part ?? null;
  const partLeaderOnly = !isSeniorStaff;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [pollType, setPollType] = useState<PollType>('attendance');
  const [audience, setAudience] = useState<PollAudience>(
    partLeaderOnly ? 'PART' : 'ALL'
  );
  const [targetParts, setTargetParts] = useState<string[]>(
    partLeaderOnly && myPart ? [myPart] : []
  );
  const [options, setOptions] = useState<string[]>(['', '']);
  const [allowMultiple, setAllowMultiple] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [deadline, setDeadline] = useState('');
  // 결과 공개 시점: 참석 조사는 즉시, 의견 수렴형은 마감 후가 기본
  // 사용자가 직접 바꾸기 전까지는 타입 변경 시 기본값을 따라간다
  const [showResultsEarly, setShowResultsEarly] = useState(true);
  const [resultsTouched, setResultsTouched] = useState(false);

  const handleTypeChange = (type: PollType) => {
    setPollType(type);
    if (!resultsTouched) {
      setShowResultsEarly(type === 'attendance');
    }
  };

  const togglePart = (part: string) => {
    if (partLeaderOnly) return;
    setTargetParts((prev) =>
      prev.includes(part) ? prev.filter((p) => p !== part) : [...prev, part]
    );
  };

  const handleOptionChange = (i: number, value: string) => {
    setOptions((prev) => prev.map((o, idx) => (idx === i ? value : o)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      showError('제목을 입력해주세요.');
      return;
    }
    if (audience === 'PART' && targetParts.length === 0) {
      showError('대상 파트를 선택해주세요.');
      return;
    }
    const trimmedOptions = options.map((o) => o.trim()).filter(Boolean);
    if (pollType === 'choice' && trimmedOptions.length < 2) {
      showError('선택지를 2개 이상 입력해주세요.');
      return;
    }

    try {
      const poll = await createPoll.mutateAsync({
        title: title.trim(),
        description: description.trim() || undefined,
        poll_type: pollType,
        audience_type: audience,
        target_parts: audience === 'PART' ? targetParts : undefined,
        options: pollType === 'choice' ? trimmedOptions : undefined,
        is_anonymous: isAnonymous,
        allow_multiple: pollType === 'choice' ? allowMultiple : undefined,
        deadline_at: deadline ? new Date(deadline).toISOString() : null,
        show_results_before_close: showResultsEarly,
      });
      showSuccess('설문이 등록되었습니다.');
      router.push(`/community/polls/${poll.id}`);
    } catch (err) {
      showError(err instanceof Error ? err.message : '설문 생성에 실패했습니다.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 설문 유형 */}
      <div className="space-y-2">
        <Label>설문 유형</Label>
        <div className="grid grid-cols-3 gap-2">
          {TYPE_OPTIONS.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => handleTypeChange(t.value)}
              className={cn(
                'rounded-xl border p-3 text-left transition-colors',
                pollType === t.value
                  ? 'border-[var(--color-primary-600)] bg-[var(--color-primary-50)]'
                  : 'border-[var(--color-border-default)] bg-[var(--color-background-primary)] hover:bg-[var(--color-background-secondary)]'
              )}
            >
              <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                {t.label}
              </p>
              <p className="mt-0.5 text-xs text-[var(--color-text-tertiary)]">
                {t.desc}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* 제목/설명 */}
      <div className="space-y-2">
        <Label htmlFor="poll-title">제목</Label>
        <Input
          id="poll-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="예: 5월 파트 모임 참석 조사"
          maxLength={200}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="poll-description">설명 (선택)</Label>
        <textarea
          id="poll-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="설문에 대한 안내를 적어주세요."
          maxLength={2000}
          rows={3}
          className="w-full rounded-lg border border-[var(--color-border-default)] bg-[var(--color-background-primary)] px-3 py-2 text-base text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)]"
        />
      </div>

      {/* 대상 */}
      <div className="space-y-2">
        <Label>설문 대상</Label>
        {partLeaderOnly ? (
          <p className="rounded-lg bg-[var(--color-background-tertiary)] px-3 py-2.5 text-sm text-[var(--color-text-secondary)]">
            파트장은 자기 파트({myPart ? PART_LABELS[myPart] : '-'}) 대상
            설문만 만들 수 있습니다.
          </p>
        ) : (
          <div className="flex gap-2">
            {AUDIENCE_OPTIONS.map((a) => (
              <button
                key={a.value}
                type="button"
                onClick={() => setAudience(a.value)}
                className={cn(
                  'flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
                  audience === a.value
                    ? 'border-[var(--color-primary-600)] bg-[var(--color-primary-50)] text-[var(--color-primary-700)]'
                    : 'border-[var(--color-border-default)] text-[var(--color-text-secondary)] hover:bg-[var(--color-background-secondary)]'
                )}
              >
                {a.label}
              </button>
            ))}
          </div>
        )}

        {/* 파트 선택 */}
        {audience === 'PART' && !partLeaderOnly && (
          <div className="flex flex-wrap gap-2 pt-1">
            {SELECTABLE_PARTS.map((part) => (
              <button
                key={part}
                type="button"
                onClick={() => togglePart(part)}
                className={cn(
                  'rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors',
                  targetParts.includes(part)
                    ? 'border-[var(--color-primary-600)] bg-[var(--color-primary-600)] text-white'
                    : 'border-[var(--color-border-default)] text-[var(--color-text-secondary)] hover:bg-[var(--color-background-secondary)]'
                )}
              >
                {PART_LABELS[part]}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 선택지 (choice 전용) */}
      {pollType === 'choice' && (
        <div className="space-y-2">
          <Label>선택지</Label>
          <div className="space-y-2">
            {options.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  value={opt}
                  onChange={(e) => handleOptionChange(i, e.target.value)}
                  placeholder={`선택지 ${i + 1}`}
                  maxLength={100}
                />
                {options.length > 2 && (
                  <button
                    type="button"
                    onClick={() =>
                      setOptions((prev) => prev.filter((_, idx) => idx !== i))
                    }
                    className="shrink-0 rounded-lg p-2 text-[var(--color-text-tertiary)] hover:bg-[var(--color-background-secondary)]"
                    aria-label="선택지 삭제"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
          {options.length < 20 && (
            <button
              type="button"
              onClick={() => setOptions((prev) => [...prev, ''])}
              className="inline-flex items-center gap-1 text-sm font-medium text-[var(--color-primary-600)] hover:text-[var(--color-primary-700)]"
            >
              <Plus className="h-4 w-4" />
              선택지 추가
            </button>
          )}

          <div className="flex items-center justify-between pt-2">
            <Label htmlFor="allow-multiple" className="cursor-pointer">
              복수 선택 허용
            </Label>
            <Switch
              checked={allowMultiple}
              onCheckedChange={setAllowMultiple}
            />
          </div>
        </div>
      )}

      {/* 마감 시각 */}
      <div className="space-y-2">
        <Label htmlFor="poll-deadline">마감 시각 (선택)</Label>
        <Input
          id="poll-deadline"
          type="datetime-local"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
        />
      </div>

      {/* 결과 공개 시점 */}
      <div className="space-y-2">
        <Label>결과 공개 시점</Label>
        <div className="flex gap-2">
          {[
            { value: true, label: '투표 후 바로' },
            { value: false, label: '마감 후 공개' },
          ].map((o) => (
            <button
              key={String(o.value)}
              type="button"
              onClick={() => {
                setShowResultsEarly(o.value);
                setResultsTouched(true);
              }}
              className={cn(
                'flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
                showResultsEarly === o.value
                  ? 'border-[var(--color-primary-600)] bg-[var(--color-primary-50)] text-[var(--color-primary-700)]'
                  : 'border-[var(--color-border-default)] text-[var(--color-text-secondary)] hover:bg-[var(--color-background-secondary)]'
              )}
            >
              {o.label}
            </button>
          ))}
        </div>
        {!showResultsEarly && (
          <p className="text-xs text-[var(--color-text-tertiary)]">
            마감 전에는 생성자와 운영진만 중간 집계를 볼 수 있습니다.
          </p>
        )}
      </div>

      {/* 익명 */}
      <div className="flex items-center justify-between">
        <div>
          <Label htmlFor="anonymous" className="cursor-pointer">
            익명 설문
          </Label>
          <p className="text-xs text-[var(--color-text-tertiary)]">
            누가 투표했는지 표시하지 않습니다.
          </p>
        </div>
        <Switch checked={isAnonymous} onCheckedChange={setIsAnonymous} />
      </div>

      {/* 제출 */}
      <div className="flex gap-2 pt-2">
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          onClick={() => router.back()}
        >
          취소
        </Button>
        <Button
          type="submit"
          className="flex-1"
          disabled={createPoll.isPending}
        >
          {createPoll.isPending ? '등록 중...' : '설문 등록'}
        </Button>
      </div>
    </form>
  );
}
