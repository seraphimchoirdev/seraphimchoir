'use client';

import { useQuery } from '@tanstack/react-query';
import { FileText, Loader2 } from 'lucide-react';

import Link from 'next/link';

export default function HandoffListPage() {
  const { data: files, isLoading } = useQuery({
    queryKey: ['handoff', 'list'],
    queryFn: async () => {
      const res = await fetch('/api/admin/handoff');
      if (!res.ok) throw new Error('Failed to fetch handoff list');
      return res.json() as Promise<string[]>;
    },
  });

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">핸드오프 문서</h1>
        <p className="mt-2 text-[var(--color-text-secondary)]">
          AI 세션 간 컨텍스트 보존을 위한 핸드오프 문서 목록입니다.
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary)]" />
        </div>
      ) : (
        <div className="space-y-2">
          {files && files.length > 0 ? (
            files.map((file) => {
              const date = file.replace('.md', '');
              return (
                <Link
                  key={file}
                  href={`/admin/handoff/${date}`}
                  className="flex items-center gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4 transition-colors hover:bg-[var(--color-background-secondary)]"
                >
                  <FileText className="h-5 w-5 text-[var(--color-primary)]" />
                  <span className="font-medium text-[var(--color-text-primary)]">{date}</span>
                </Link>
              );
            })
          ) : (
            <p className="py-8 text-center text-[var(--color-text-secondary)]">
              핸드오프 문서가 없습니다.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
