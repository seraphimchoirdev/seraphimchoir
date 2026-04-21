'use client';

import { ArrowLeft, CheckCircle, XCircle } from 'lucide-react';

import { useState } from 'react';

import { useRouter } from 'next/navigation';

import TimeAgo from '@/components/features/community/common/TimeAgo';
import { Spinner } from '@/components/ui/spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { useConfirmationStatus } from '@/hooks/useConfirmations';
import { usePost } from '@/hooks/usePosts';

const PART_LABELS: Record<string, string> = {
  SOPRANO: '소프라노',
  ALTO: '알토',
  TENOR: '테너',
  BASS: '베이스',
};

interface ConfirmationStatusProps {
  postId: string;
}

export default function ConfirmationStatus({
  postId,
}: ConfirmationStatusProps) {
  const router = useRouter();
  const { data: post } = usePost(postId);
  const { data: statuses, isLoading } = useConfirmationStatus(postId);
  const [activeTab, setActiveTab] = useState<string>('');

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!statuses || statuses.length === 0) {
    return (
      <div className="py-12 text-center text-lg text-[var(--color-text-tertiary)]">
        확인 현황 데이터가 없습니다.
      </div>
    );
  }

  // 전체 합계
  const totalConfirmed = statuses.reduce(
    (sum, s) => sum + s.confirmed_count,
    0
  );
  const totalMembers = statuses.reduce((sum, s) => sum + s.total, 0);

  return (
    <div className="space-y-6">
      {/* 뒤로가기 */}
      <button
        onClick={() => router.back()}
        className="inline-flex items-center gap-1 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] text-base"
      >
        <ArrowLeft className="h-5 w-5" />
        공지로 돌아가기
      </button>

      {/* 헤더 */}
      <div className="rounded-xl border border-[var(--color-border-default)] bg-[var(--color-background-primary)] p-6">
        <h2 className="text-xl font-bold text-[var(--color-text-primary)]">
          확인 현황
        </h2>
        {post && (
          <p className="mt-1 text-base text-[var(--color-text-secondary)]">
            {post.title}
          </p>
        )}

        {/* 전체 진행 바 */}
        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-lg font-semibold text-[var(--color-text-primary)]">
              전체 확인률
            </span>
            <span className="text-lg font-bold text-[var(--color-primary-600)]">
              {totalConfirmed}/{totalMembers}명
            </span>
          </div>
          <div className="h-4 w-full overflow-hidden rounded-full bg-[var(--color-background-tertiary)]">
            <div
              className="h-full rounded-full bg-[var(--color-primary-500)] transition-all duration-500"
              style={{
                width: `${totalMembers > 0 ? (totalConfirmed / totalMembers) * 100 : 0}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* 파트별 탭 */}
      <div className="rounded-xl border border-[var(--color-border-default)] bg-[var(--color-background-primary)] p-6">
        <Tabs value={activeTab || statuses[0]?.part || ''} onValueChange={setActiveTab}>
          <TabsList className="w-full">
            {statuses.map((s) => (
              <TabsTrigger
                key={s.part}
                value={s.part}
                className="flex-1 text-base py-2.5"
              >
                {PART_LABELS[s.part] || s.part}
                <span className="ml-1.5 text-sm text-[var(--color-text-tertiary)]">
                  {s.confirmed_count}/{s.total}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>

          {statuses.map((s) => (
            <TabsContent key={s.part} value={s.part} className="mt-4">
              {/* 파트 진행 바 */}
              <div className="mb-4">
                <div className="h-3 w-full overflow-hidden rounded-full bg-[var(--color-background-tertiary)]">
                  <div
                    className="h-full rounded-full bg-[var(--color-success-500)] transition-all duration-500"
                    style={{
                      width: `${s.total > 0 ? (s.confirmed_count / s.total) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>

              {/* 확인 완료 목록 */}
              {s.confirmed.length > 0 && (
                <div className="mb-4">
                  <h4 className="mb-2 flex items-center gap-1.5 text-base font-semibold text-[var(--color-success-700)]">
                    <CheckCircle className="h-5 w-5" />
                    확인 완료 ({s.confirmed.length}명)
                  </h4>
                  <div className="space-y-1">
                    {s.confirmed.map((m) => (
                      <div
                        key={m.user_id}
                        className="flex items-center justify-between rounded-lg bg-[var(--color-success-50)] px-4 py-2.5"
                      >
                        <span className="text-base font-medium text-[var(--color-text-primary)]">
                          {m.name}
                        </span>
                        <TimeAgo
                          date={m.confirmed_at}
                          className="text-sm text-[var(--color-text-tertiary)]"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 미확인 목록 */}
              {s.unconfirmed.length > 0 && (
                <div>
                  <h4 className="mb-2 flex items-center gap-1.5 text-base font-semibold text-[var(--color-error-700)]">
                    <XCircle className="h-5 w-5" />
                    미확인 ({s.unconfirmed.length}명)
                  </h4>
                  <div className="space-y-1">
                    {s.unconfirmed.map((m) => (
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
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
}
