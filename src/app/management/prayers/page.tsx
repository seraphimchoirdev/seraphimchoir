'use client';

import { BookOpen } from 'lucide-react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';

import PrayerAssignmentManager from '@/components/features/newsletters/PrayerAssignmentManager';

import { useAuth } from '@/hooks/useAuth';

export default function ManagementPrayersPage() {
  const { hasRole, isLoading: authLoading } = useAuth();

  const canManage = hasRole(['ADMIN', 'SECRETARY']);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" variant="default" />
      </div>
    );
  }

  if (!canManage) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-8">
        <Alert variant="error">
          <AlertDescription className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            기도 담당 관리 권한이 없습니다. 서기(SECRETARY) 이상 권한이 필요합니다.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">기도 담당 관리</h1>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          분기별 기도 담당자와 가운 파트를 등록합니다. 소식지에 자동으로 반영됩니다.
        </p>
      </div>

      <PrayerAssignmentManager />
    </div>
  );
}
