'use client';

import { ArrowLeft, CheckCircle, XCircle } from 'lucide-react';

import { useState } from 'react';

import { useRouter } from 'next/navigation';

import TimeAgo from '@/components/features/community/common/TimeAgo';
import { Spinner } from '@/components/ui/spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { usePollAudienceStatus } from '@/hooks/usePolls';

import { PART_LABELS } from '@/lib/community/poll-constants';

const GROUP_LABELS: Record<string, string> = {
  ...PART_LABELS,
  STAFF: '임원',
};

interface PollAudienceStatusProps {
  pollId: string;
}

export default function PollAudienceStatus({
  pollId,
}: PollAudienceStatusProps) {
  const router = useRouter();
  const { data, isLoading, error } = usePollAudienceStatus(pollId);
  const [activeTab, setActiveTab] = useState<string>('');

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !data || data.data.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-lg text-[var(--color-text-tertiary)]">
          {error instanceof Error
            ? error.message
            : '응답 현황 데이터가 없습니다.'}
        </p>
        <button
          onClick={() => router.back()}
          className="mt-4 text-sm font-medium text-[var(--color-primary-600)]"
        >
          돌아가기
        </button>
      </div>
    );
  }

  const groups = data.data;
  const totalResponded = groups.reduce((sum, g) => sum + g.responded_count, 0);
  const totalMembers = groups.reduce((sum, g) => sum + g.total, 0);

  return (
    <div className="space-y-6">
      {/* 뒤로가기 */}
      <button
        onClick={() => router.back()}
        className="inline-flex items-center gap-1 text-base text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
      >
        <ArrowLeft className="h-5 w-5" />
        설문으로 돌아가기
      </button>

      {/* 헤더 + 전체 응답률 */}
      <div className="rounded-xl border border-[var(--color-border-default)] bg-[var(--color-background-primary)] p-6">
        <h2 className="text-xl font-bold text-[var(--color-text-primary)]">
          응답 현황
        </h2>
        <p className="mt-1 text-base text-[var(--color-text-secondary)]">
          {data.poll_title}
        </p>

        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-lg font-semibold text-[var(--color-text-primary)]">
              전체 응답률
            </span>
            <span className="text-lg font-bold text-[var(--color-primary-600)]">
              {totalResponded}/{totalMembers}명
            </span>
          </div>
          <div className="h-4 w-full overflow-hidden rounded-full bg-[var(--color-background-tertiary)]">
            <div
              className="h-full rounded-full bg-[var(--color-primary-500)] transition-all duration-500"
              style={{
                width: `${totalMembers > 0 ? (totalResponded / totalMembers) * 100 : 0}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* 그룹(파트)별 탭 */}
      <div className="rounded-xl border border-[var(--color-border-default)] bg-[var(--color-background-primary)] p-6">
        <Tabs
          value={activeTab || groups[0]?.group || ''}
          onValueChange={setActiveTab}
        >
          <TabsList className="w-full">
            {groups.map((g) => (
              <TabsTrigger
                key={g.group}
                value={g.group}
                className="flex-1 py-2.5 text-base"
              >
                {GROUP_LABELS[g.group] || g.group}
                <span className="ml-1.5 text-sm text-[var(--color-text-tertiary)]">
                  {g.responded_count}/{g.total}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>

          {groups.map((g) => (
            <TabsContent key={g.group} value={g.group} className="mt-4">
              {/* 그룹 진행 바 */}
              <div className="mb-4">
                <div className="h-3 w-full overflow-hidden rounded-full bg-[var(--color-background-tertiary)]">
                  <div
                    className="h-full rounded-full bg-[var(--color-success-500)] transition-all duration-500"
                    style={{
                      width: `${g.total > 0 ? (g.responded_count / g.total) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>

              {/* 응답 완료 목록 */}
              {g.responded.length > 0 && (
                <div className="mb-4">
                  <h4 className="mb-2 flex items-center gap-1.5 text-base font-semibold text-[var(--color-success-700)]">
                    <CheckCircle className="h-5 w-5" />
                    응답 완료 ({g.responded.length}명)
                  </h4>
                  <div className="space-y-1">
                    {g.responded.map((m) => (
                      <div
                        key={m.user_id}
                        className="flex items-center justify-between rounded-lg bg-[var(--color-success-50)] px-4 py-2.5"
                      >
                        <span className="text-base font-medium text-[var(--color-text-primary)]">
                          {m.name}
                        </span>
                        {m.responded_at && (
                          <TimeAgo
                            date={m.responded_at}
                            className="text-sm text-[var(--color-text-tertiary)]"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 미응답 목록 */}
              {g.not_responded.length > 0 && (
                <div>
                  <h4 className="mb-2 flex items-center gap-1.5 text-base font-semibold text-[var(--color-error-700)]">
                    <XCircle className="h-5 w-5" />
                    미응답 ({g.not_responded.length}명)
                  </h4>
                  <div className="space-y-1">
                    {g.not_responded.map((m) => (
                      <div
                        key={m.user_id}
                        className="flex items-center rounded-lg bg-[var(--color-error-50)] px-4 py-2.5"
                      >
                        <span className="text-base font-medium text-[var(--color-text-primary)]">
                          {m.name}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {g.total === 0 && (
                <p className="py-4 text-center text-sm text-[var(--color-text-tertiary)]">
                  이 그룹에 대상자가 없습니다.
                </p>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
}
