'use client';

import { ArrowLeft, Loader2 } from 'lucide-react';

import Link from 'next/link';

import AppShell from '@/components/layout/AppShell';
import NewsletterEditor from '@/components/features/newsletters/NewsletterEditor';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

import { useAuth } from '@/hooks/useAuth';

export default function NewNewsletterPage() {
  const { hasRole, isLoading } = useAuth();

  const canEdit = hasRole(['ADMIN', 'SECRETARY']);

  if (isLoading) {
    return (
      <AppShell>
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary)]" />
        </div>
      </AppShell>
    );
  }

  if (!canEdit) {
    return (
      <AppShell>
        <div className="container mx-auto max-w-2xl px-4 py-8">
          <Alert variant="error">
            <AlertDescription>소식지 작성 권한이 없습니다.</AlertDescription>
          </Alert>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <div className="mb-6 flex items-center gap-3">
          <Link href="/newsletters">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-1 h-4 w-4" />
              목록
            </Button>
          </Link>
          <h1 className="text-xl font-bold text-[var(--color-text-primary)]">새 소식지 작성</h1>
        </div>

        <NewsletterEditor />
      </div>
    </AppShell>
  );
}
