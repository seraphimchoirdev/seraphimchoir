'use client';

import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Loader2 } from 'lucide-react';

import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function HandoffDetailPage() {
  const params = useParams();
  const date = params.date as string;

  const { data: content, isLoading, error } = useQuery({
    queryKey: ['handoff', 'detail', date],
    queryFn: async () => {
      const res = await fetch(`/api/admin/handoff/${date}`);
      if (!res.ok) throw new Error('Failed to fetch handoff');
      return res.json() as Promise<{ html: string }>;
    },
  });

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <Link
        href="/admin/handoff"
        className="mb-6 inline-flex items-center gap-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
      >
        <ArrowLeft className="h-4 w-4" />
        목록으로
      </Link>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary)]" />
        </div>
      ) : error ? (
        <div className="rounded-lg border border-[var(--color-error)] bg-[var(--color-error-50)] p-4 text-[var(--color-error)]">
          문서를 불러오는데 실패했습니다.
        </div>
      ) : (
        <article
          className="prose prose-slate dark:prose-invert max-w-none rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-6"
          dangerouslySetInnerHTML={{ __html: content?.html || '' }}
        />
      )}
    </div>
  );
}
