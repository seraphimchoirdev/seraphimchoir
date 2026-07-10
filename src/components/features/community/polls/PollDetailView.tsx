'use client';

import {
  ArrowLeft,
  CheckCircle2,
  ClipboardList,
  Clock,
  Lock,
  MoreVertical,
  Users,
} from 'lucide-react';

import { useEffect, useRef, useState } from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import TimeAgo from '@/components/features/community/common/TimeAgo';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Spinner } from '@/components/ui/spinner';

import { useAuth } from '@/hooks/useAuth';
import {
  useCancelPollResponse,
  useDeletePoll,
  usePoll,
  useSubmitPollResponse,
  useUpdatePoll,
} from '@/hooks/usePolls';

import {
  ATTENDANCE_STATUS_LABELS,
  formatTargetParts,
  PART_LABELS,
  POLL_AUDIENCE_LABELS,
  POLL_SENIOR_STAFF_ROLES,
  POLL_TYPE_LABELS,
} from '@/lib/community/poll-constants';
import { showError, showSuccess } from '@/lib/toast';
import { cn } from '@/lib/utils';

import type { AttendanceStatus, PollVoter } from '@/types/community';

interface PollDetailViewProps {
  pollId: string;
}

function VoterChips({ voters }: { voters: PollVoter[] }) {
  if (voters.length === 0) return null;
  return (
    <div className="mt-1.5 flex flex-wrap gap-1">
      {voters.map((v) => (
        <span
          key={v.user_id}
          className="rounded-full bg-[var(--color-background-tertiary)] px-2 py-0.5 text-xs text-[var(--color-text-secondary)]"
        >
          {v.name}
          {v.part ? ` · ${PART_LABELS[v.part] || v.part}` : ''}
        </span>
      ))}
    </div>
  );
}

function ResultsHiddenNotice() {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-[var(--color-background-tertiary)] px-4 py-3 text-sm text-[var(--color-text-secondary)]">
      <Lock className="h-4 w-4 shrink-0" />
      결과는 마감 후 공개됩니다.
    </div>
  );
}

export default function PollDetailView({ pollId }: PollDetailViewProps) {
  const router = useRouter();
  const { profile } = useAuth();
  const { data: poll, isLoading, error } = usePoll(pollId);

  const submitResponse = useSubmitPollResponse(pollId);
  const cancelResponse = useCancelPollResponse(pollId);
  const updatePoll = useUpdatePoll(pollId);
  const deletePoll = useDeletePoll();

  // 투표 입력 상태 (서버의 내 응답으로 초기화하되, 사용자가 만진 뒤에는 덮어쓰지 않음)
  const [attendance, setAttendance] = useState<AttendanceStatus | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [textResponse, setTextResponse] = useState('');
  const touchedRef = useRef(false);

  useEffect(() => {
    if (!poll || touchedRef.current) return;
    setAttendance(poll.my_response?.attendance_status ?? null);
    setSelectedOptions(poll.my_response?.selected_option_ids ?? []);
    setTextResponse(poll.my_response?.text_response ?? '');
  }, [poll]);

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showCloseDialog, setShowCloseDialog] = useState(false);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !poll) {
    return (
      <div className="py-12 text-center">
        <p className="text-base text-[var(--color-text-secondary)]">
          {error instanceof Error ? error.message : '설문을 찾을 수 없습니다.'}
        </p>
        <Link
          href="/community/polls"
          className="mt-4 inline-block text-sm font-medium text-[var(--color-primary-600)]"
        >
          목록으로 돌아가기
        </Link>
      </div>
    );
  }

  const audienceLabel =
    poll.audience_type === 'PART'
      ? formatTargetParts(poll.target_parts)
      : POLL_AUDIENCE_LABELS[poll.audience_type] || poll.audience_type;

  const totalOptionVotes = poll.options.reduce(
    (sum, o) => sum + o.vote_count,
    0
  );

  const handleAttendanceVote = async (status: AttendanceStatus) => {
    touchedRef.current = true;
    setAttendance(status);
    try {
      await submitResponse.mutateAsync({ attendance_status: status });
      showSuccess('투표했습니다.');
      touchedRef.current = false;
    } catch (err) {
      showError(err instanceof Error ? err.message : '투표에 실패했습니다.');
    }
  };

  const toggleOption = (optionId: string) => {
    touchedRef.current = true;
    setSelectedOptions((prev) => {
      if (poll.allow_multiple) {
        return prev.includes(optionId)
          ? prev.filter((id) => id !== optionId)
          : [...prev, optionId];
      }
      return [optionId];
    });
  };

  const handleChoiceVote = async () => {
    if (selectedOptions.length === 0) {
      showError('선택지를 골라주세요.');
      return;
    }
    try {
      await submitResponse.mutateAsync({ option_ids: selectedOptions });
      showSuccess('투표했습니다.');
      touchedRef.current = false;
    } catch (err) {
      showError(err instanceof Error ? err.message : '투표에 실패했습니다.');
    }
  };

  const handleTextSubmit = async () => {
    if (!textResponse.trim()) {
      showError('응답 내용을 입력해주세요.');
      return;
    }
    try {
      await submitResponse.mutateAsync({
        text_response: textResponse.trim(),
      });
      showSuccess('응답을 제출했습니다.');
      touchedRef.current = false;
    } catch (err) {
      showError(err instanceof Error ? err.message : '제출에 실패했습니다.');
    }
  };

  const handleCancelResponse = async () => {
    try {
      await cancelResponse.mutateAsync();
      touchedRef.current = false;
      setAttendance(null);
      setSelectedOptions([]);
      setTextResponse('');
      showSuccess('응답을 취소했습니다.');
    } catch (err) {
      showError(err instanceof Error ? err.message : '취소에 실패했습니다.');
    }
  };

  const handleClose = async () => {
    try {
      await updatePoll.mutateAsync({ is_closed: true });
      showSuccess('설문을 마감했습니다.');
    } catch (err) {
      showError(err instanceof Error ? err.message : '마감에 실패했습니다.');
    }
  };

  const handleDelete = async () => {
    try {
      await deletePoll.mutateAsync(pollId);
      showSuccess('설문을 삭제했습니다.');
      router.push('/community/polls');
    } catch (err) {
      showError(err instanceof Error ? err.message : '삭제에 실패했습니다.');
    }
  };

  return (
    <div className="space-y-5">
      {/* 뒤로가기 + 관리 메뉴 */}
      <div className="flex items-center justify-between">
        <Link
          href="/community/polls"
          className="inline-flex items-center gap-1 text-sm text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]"
        >
          <ArrowLeft className="h-4 w-4" />
          목록
        </Link>
        {poll.can_manage && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="rounded-lg p-2 text-[var(--color-text-tertiary)] hover:bg-[var(--color-background-secondary)]"
                aria-label="설문 관리"
              >
                <MoreVertical className="h-5 w-5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {!poll.is_effectively_closed && (
                <DropdownMenuItem onClick={() => setShowCloseDialog(true)}>
                  마감하기
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={() => setShowDeleteDialog(true)}
                className="text-[var(--color-error-600)]"
              >
                삭제
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* 헤더 */}
      <div className="rounded-xl border border-[var(--color-border-default)] bg-[var(--color-background-primary)] p-5">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="rounded-full bg-[var(--color-primary-50)] px-2.5 py-0.5 text-xs font-medium text-[var(--color-primary-700)]">
            {POLL_TYPE_LABELS[poll.poll_type] || poll.poll_type}
          </span>
          <span className="rounded-full bg-[var(--color-background-tertiary)] px-2.5 py-0.5 text-xs font-medium text-[var(--color-text-secondary)]">
            {audienceLabel}
          </span>
          {poll.is_anonymous && (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-[var(--color-background-tertiary)] px-2.5 py-0.5 text-xs font-medium text-[var(--color-text-secondary)]">
              <Lock className="h-3 w-3" />
              익명
            </span>
          )}
          {poll.is_effectively_closed && (
            <span className="rounded-full bg-[var(--color-background-tertiary)] px-2.5 py-0.5 text-xs font-medium text-[var(--color-text-tertiary)]">
              마감
            </span>
          )}
        </div>

        <h1 className="mt-3 text-xl font-bold text-[var(--color-text-primary)]">
          {poll.title}
        </h1>
        {poll.description && (
          <p className="mt-2 whitespace-pre-wrap text-base leading-relaxed text-[var(--color-text-secondary)]">
            {poll.description}
          </p>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-[var(--color-text-tertiary)]">
          {poll.creator && <span>{poll.creator.name}</span>}
          <TimeAgo date={poll.created_at ?? ''} />
          <span className="inline-flex items-center gap-1">
            <Users className="h-4 w-4" />
            {poll.voter_count}명 참여
          </span>
          {poll.deadline_at && (
            <span className="inline-flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {new Date(poll.deadline_at).toLocaleString('ko-KR', {
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}{' '}
              마감
            </span>
          )}
        </div>

        {/* 응답 현황 (운영진 전체 / 파트장 자기 파트 — 익명 설문은 미제공) */}
        {!poll.is_anonymous &&
          (POLL_SENIOR_STAFF_ROLES.includes(profile?.role || '') ||
            (profile?.role === 'PART_LEADER' &&
              poll.audience_type !== 'STAFF')) && (
            <Link
              href={`/community/polls/${pollId}/audience-status`}
              className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-primary-600)] hover:text-[var(--color-primary-700)]"
            >
              <ClipboardList className="h-4 w-4" />
              응답 현황 보기
            </Link>
          )}
      </div>

      {/* ==================== 참석 조사 ==================== */}
      {poll.poll_type === 'attendance' && (
        <div className="rounded-xl border border-[var(--color-border-default)] bg-[var(--color-background-primary)] p-5">
          <div className="grid grid-cols-3 gap-2">
            {(
              ['attending', 'not_attending', 'undecided'] as AttendanceStatus[]
            ).map((status) => {
              const summary = poll.attendance_summary.find(
                (s) => s.status === status
              );
              const isMine = attendance === status;
              return (
                <button
                  key={status}
                  type="button"
                  disabled={!poll.can_vote || submitResponse.isPending}
                  onClick={() => handleAttendanceVote(status)}
                  className={cn(
                    'rounded-xl border p-4 text-center transition-colors disabled:cursor-not-allowed disabled:opacity-60',
                    isMine
                      ? 'border-[var(--color-primary-600)] bg-[var(--color-primary-50)]'
                      : 'border-[var(--color-border-default)] hover:bg-[var(--color-background-secondary)]'
                  )}
                >
                  <p
                    className={cn(
                      'text-sm font-semibold',
                      isMine
                        ? 'text-[var(--color-primary-700)]'
                        : 'text-[var(--color-text-primary)]'
                    )}
                  >
                    {ATTENDANCE_STATUS_LABELS[status]}
                  </p>
                  {poll.results_visible && (
                    <p className="mt-1 text-lg font-bold text-[var(--color-text-primary)]">
                      {summary?.count ?? 0}
                    </p>
                  )}
                </button>
              );
            })}
          </div>

          {/* 상태별 응답자 명단 */}
          {poll.results_visible ? (
            !poll.is_anonymous && (
              <div className="mt-4 space-y-3">
                {poll.attendance_summary
                  .filter((s) => s.voters.length > 0)
                  .map((s) => (
                    <div key={s.status}>
                      <p className="text-sm font-medium text-[var(--color-text-secondary)]">
                        {ATTENDANCE_STATUS_LABELS[s.status]} ({s.count})
                      </p>
                      <VoterChips voters={s.voters} />
                    </div>
                  ))}
              </div>
            )
          ) : (
            <div className="mt-4">
              <ResultsHiddenNotice />
            </div>
          )}
        </div>
      )}

      {/* ==================== 선택 투표 ==================== */}
      {poll.poll_type === 'choice' && (
        <div className="rounded-xl border border-[var(--color-border-default)] bg-[var(--color-background-primary)] p-5">
          {poll.allow_multiple && (
            <p className="mb-3 text-sm text-[var(--color-text-tertiary)]">
              복수 선택이 가능합니다.
            </p>
          )}
          <div className="space-y-2">
            {poll.options.map((opt) => {
              const isSelected = selectedOptions.includes(opt.id);
              const percent =
                poll.results_visible && totalOptionVotes > 0
                  ? Math.round((opt.vote_count / totalOptionVotes) * 100)
                  : 0;
              return (
                <button
                  key={opt.id}
                  type="button"
                  disabled={!poll.can_vote || submitResponse.isPending}
                  onClick={() => toggleOption(opt.id)}
                  className={cn(
                    'relative w-full overflow-hidden rounded-xl border p-3.5 text-left transition-colors disabled:cursor-not-allowed',
                    isSelected
                      ? 'border-[var(--color-primary-600)]'
                      : 'border-[var(--color-border-default)]'
                  )}
                >
                  {/* 결과 막대 (배경) */}
                  {poll.results_visible && (
                    <div
                      className="absolute inset-y-0 left-0 bg-[var(--color-primary-50)]"
                      style={{ width: `${percent}%` }}
                    />
                  )}
                  <div className="relative flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2 text-base text-[var(--color-text-primary)]">
                      {isSelected && (
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-[var(--color-primary-600)]" />
                      )}
                      {opt.label}
                    </span>
                    {poll.results_visible && (
                      <span className="shrink-0 text-sm font-medium text-[var(--color-text-secondary)]">
                        {opt.vote_count}표 · {percent}%
                      </span>
                    )}
                  </div>
                  {poll.results_visible && !poll.is_anonymous && (
                    <div className="relative">
                      <VoterChips voters={opt.voters} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {!poll.results_visible && (
            <div className="mt-4">
              <ResultsHiddenNotice />
            </div>
          )}

          {poll.can_vote && (
            <Button
              type="button"
              className="mt-4 w-full"
              disabled={submitResponse.isPending}
              onClick={handleChoiceVote}
            >
              {submitResponse.isPending
                ? '제출 중...'
                : poll.has_my_response
                  ? '다시 투표하기'
                  : '투표하기'}
            </Button>
          )}
        </div>
      )}

      {/* ==================== 주관식 ==================== */}
      {poll.poll_type === 'open_ended' && (
        <div className="space-y-4">
          {poll.can_vote && (
            <div className="rounded-xl border border-[var(--color-border-default)] bg-[var(--color-background-primary)] p-5">
              <textarea
                value={textResponse}
                onChange={(e) => {
                  touchedRef.current = true;
                  setTextResponse(e.target.value);
                }}
                placeholder="의견을 자유롭게 적어주세요."
                maxLength={2000}
                rows={4}
                className="w-full rounded-lg border border-[var(--color-border-default)] bg-[var(--color-background-primary)] px-3 py-2 text-base text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)]"
              />
              <Button
                type="button"
                className="mt-3 w-full"
                disabled={submitResponse.isPending}
                onClick={handleTextSubmit}
              >
                {submitResponse.isPending
                  ? '제출 중...'
                  : poll.has_my_response
                    ? '응답 수정하기'
                    : '응답 제출'}
              </Button>
            </div>
          )}

          <div className="rounded-xl border border-[var(--color-border-default)] bg-[var(--color-background-primary)] p-5">
            <h2 className="text-sm font-semibold text-[var(--color-text-secondary)]">
              응답 ({poll.results_visible ? poll.text_responses.length : poll.voter_count})
            </h2>
            {poll.results_visible ? (
              poll.text_responses.length === 0 ? (
                <p className="mt-3 text-sm text-[var(--color-text-tertiary)]">
                  아직 응답이 없습니다.
                </p>
              ) : (
                <ul className="mt-3 space-y-3">
                  {poll.text_responses.map((r) => (
                    <li
                      key={r.id}
                      className="rounded-lg bg-[var(--color-background-tertiary)] p-3"
                    >
                      <p className="whitespace-pre-wrap text-base text-[var(--color-text-primary)]">
                        {r.text_response}
                      </p>
                      <p className="mt-1.5 text-xs text-[var(--color-text-tertiary)]">
                        {r.author
                          ? `${r.author.name}${r.author.part ? ` · ${PART_LABELS[r.author.part] || r.author.part}` : ''}`
                          : '익명'}
                        {r.created_at && (
                          <>
                            {' · '}
                            <TimeAgo date={r.created_at} />
                          </>
                        )}
                      </p>
                    </li>
                  ))}
                </ul>
              )
            ) : (
              <div className="mt-3">
                <ResultsHiddenNotice />
              </div>
            )}
          </div>
        </div>
      )}

      {/* 내 응답 취소 */}
      {poll.has_my_response && poll.can_vote && (
        <button
          type="button"
          onClick={handleCancelResponse}
          disabled={cancelResponse.isPending}
          className="text-sm text-[var(--color-text-tertiary)] underline hover:text-[var(--color-text-primary)]"
        >
          내 응답 취소
        </button>
      )}

      {/* 마감 확인 */}
      <ConfirmDialog
        open={showCloseDialog}
        onOpenChange={setShowCloseDialog}
        title="설문 마감"
        description="설문을 마감하면 더 이상 투표할 수 없습니다. 마감할까요?"
        onConfirm={handleClose}
      />

      {/* 삭제 확인 */}
      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="설문 삭제"
        description="설문과 모든 응답이 삭제됩니다. 정말 삭제할까요?"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}
