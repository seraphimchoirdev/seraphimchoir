'use client';

import { CheckCircle2, Edit, LayoutGrid, Sparkles } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDisplayDate } from '@/lib/dashboard-context';
import type { ArrangementStatus } from '@/types/database.types';

interface ArrangementActionCardProps {
  arrangement: {
    id: string;
    date: string;
    title: string;
    status: ArrangementStatus | null;
    seatCount: number;
    hasRowLeaders: boolean;
  } | null;
  nextServiceDate: string;
}

/**
 * 배치 작업 현황 카드 (지휘자용)
 *
 * 현재 배치표의 상태와 다음 행동을 안내합니다.
 */
export function ArrangementActionCard({ arrangement, nextServiceDate }: ArrangementActionCardProps) {
  // 배치표가 없는 경우
  if (!arrangement) {
    return (
      <Card className="border-2 border-dashed border-[var(--color-border-default)]">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <LayoutGrid className="h-4 w-4 text-[var(--color-primary-500)]" />
            배치 작업
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-[var(--color-background-tertiary)] p-4 text-center">
            <p className="text-sm text-[var(--color-text-secondary)]">
              {formatDisplayDate(nextServiceDate)} 배치표가 아직 없습니다.
            </p>
          </div>
          <Button asChild className="w-full">
            <Link href="/arrangements/new">
              <Sparkles className="mr-2 h-4 w-4" />
              새 배치 만들기
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  // 상태별 UI
  const statusConfig = {
    DRAFT: {
      label: '초안',
      color: 'bg-amber-100 text-amber-700',
      icon: Edit,
    },
    SHARED: {
      label: '공유됨',
      color: 'bg-blue-100 text-blue-700',
      icon: CheckCircle2,
    },
    CONFIRMED: {
      label: '확정',
      color: 'bg-green-100 text-green-700',
      icon: CheckCircle2,
    },
  };

  const status = arrangement.status || 'DRAFT';
  const config = statusConfig[status] || statusConfig.DRAFT;
  const StatusIcon = config.icon;

  // 진행 상황 메시지
  const getProgressMessage = () => {
    if (arrangement.seatCount === 0) {
      return '좌석 배치가 필요합니다';
    }
    if (!arrangement.hasRowLeaders) {
      return `${arrangement.seatCount}명 배치 완료, 줄반장 미지정`;
    }
    return `${arrangement.seatCount}명 배치 완료`;
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <LayoutGrid className="h-4 w-4 text-[var(--color-primary-500)]" />
          배치 작업 현황
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 배치표 정보 */}
        <div className="rounded-lg bg-[var(--color-background-tertiary)] p-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="font-medium text-[var(--color-text-primary)]">
                {formatDisplayDate(arrangement.date)}
              </div>
              <div className="mt-1 text-sm text-[var(--color-text-secondary)]">
                {arrangement.title}
              </div>
            </div>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${config.color}`}
            >
              <StatusIcon className="h-3 w-3" />
              {config.label}
            </span>
          </div>
          <div className="mt-3 text-sm text-[var(--color-text-tertiary)]">{getProgressMessage()}</div>
        </div>

        {/* 액션 버튼 */}
        <div className="flex gap-2">
          <Button asChild variant="default" className="flex-1">
            <Link href={`/arrangements/${arrangement.id}/edit`}>
              <Edit className="mr-2 h-4 w-4" />
              편집 계속하기
            </Link>
          </Button>
          {status === 'DRAFT' && (
            <Button asChild variant="outline">
              <Link href={`/arrangements/${arrangement.id}/recommend`}>
                <Sparkles className="h-4 w-4" />
              </Link>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default ArrangementActionCard;
