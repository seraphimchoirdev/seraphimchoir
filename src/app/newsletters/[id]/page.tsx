'use client';

import { ArrowLeft, Edit, Loader2, Printer } from 'lucide-react';

import { use } from 'react';

import Link from 'next/link';

import AppShell from '@/components/layout/AppShell';
import NewsletterView from '@/components/features/newsletters/NewsletterView';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

import { useAuth } from '@/hooks/useAuth';
import { useNewsletter } from '@/hooks/useNewsletters';

export default function NewsletterDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { hasRole } = useAuth();
  const { data: newsletter, isLoading, error } = useNewsletter(id);

  const canEdit = hasRole(['ADMIN', 'SECRETARY']);
  const canEditAnnouncements = hasRole(['MANAGER']);

  if (isLoading) {
    return (
      <AppShell>
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary)]" />
        </div>
      </AppShell>
    );
  }

  if (error || !newsletter) {
    return (
      <AppShell>
        <div className="container mx-auto max-w-3xl px-4 py-8">
          <p className="text-center text-[var(--color-text-tertiary)]">
            소식지를 찾을 수 없습니다.
          </p>
          <div className="mt-4 flex justify-center">
            <Link href="/newsletters">
              <Button variant="outline">
                <ArrowLeft className="mr-1 h-4 w-4" />
                목록으로
              </Button>
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="container mx-auto max-w-4xl px-4 py-8">
        {/* 상단 바 */}
        <div className="mb-6 flex items-center gap-3 flex-wrap" data-print-hide>
          <Link href="/newsletters">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-1 h-4 w-4" />
              목록
            </Button>
          </Link>

          <Badge variant={newsletter.status === 'PUBLISHED' ? 'success' : 'secondary'}>
            {newsletter.status === 'PUBLISHED' ? '발행됨' : '초안'}
          </Badge>

          <div className="flex-1" />

          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="mr-1 h-4 w-4" />
            인쇄
          </Button>

          {(canEdit || canEditAnnouncements) && (
            <Link href={`/newsletters/edit/${newsletter.id}`}>
              <Button variant="outline" size="sm">
                <Edit className="mr-1 h-4 w-4" />
                수정
              </Button>
            </Link>
          )}
        </div>

        <NewsletterView
          issueDate={newsletter.issue_date}
          volume={newsletter.volume}
          issueNumber={newsletter.issue_number}
          serialNumber={newsletter.serial_number}
          yearMotto={newsletter.year_motto}
          publisherName={newsletter.publisher_name}
          editorName={newsletter.editor_name}
          editorWeeklyName={newsletter.editor_weekly_name}
          announcements={newsletter.announcements || ''}
          fixedFooterText={newsletter.fixed_footer_text || ''}
          editable={canEdit || canEditAnnouncements}
        />
      </div>
    </AppShell>
  );
}
