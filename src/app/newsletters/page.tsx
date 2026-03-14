'use client';

import { Loader2, Plus } from 'lucide-react';

import Link from 'next/link';

import AppShell from '@/components/layout/AppShell';
import NewsletterCard from '@/components/features/newsletters/NewsletterCard';
import { Button } from '@/components/ui/button';

import { useAuth } from '@/hooks/useAuth';
import { useNewsletters } from '@/hooks/useNewsletters';

export default function NewslettersPage() {
  const { hasRole, isLoading: authLoading } = useAuth();
  const { data: response, isLoading } = useNewsletters();

  const canEdit = hasRole(['ADMIN', 'SECRETARY']);

  if (authLoading) {
    return (
      <AppShell>
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary)]" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="container mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">새로핌지</h1>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              새로핌찬양대 주간 소식지
            </p>
          </div>

          {canEdit && (
            <Link href="/newsletters/edit">
              <Button>
                <Plus className="mr-1 h-4 w-4" />
                새 작성
              </Button>
            </Link>
          )}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary)]" />
          </div>
        ) : (
          <div className="space-y-3">
            {response?.data && response.data.length > 0 ? (
              response.data.map(newsletter => (
                <NewsletterCard
                  key={newsletter.id}
                  id={newsletter.id}
                  issueDate={newsletter.issue_date}
                  volume={newsletter.volume}
                  issueNumber={newsletter.issue_number}
                  serialNumber={newsletter.serial_number}
                  status={newsletter.status}
                  publishedAt={newsletter.published_at}
                />
              ))
            ) : (
              <p className="py-12 text-center text-sm text-[var(--color-text-tertiary)]">
                아직 발행된 소식지가 없습니다.
              </p>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
