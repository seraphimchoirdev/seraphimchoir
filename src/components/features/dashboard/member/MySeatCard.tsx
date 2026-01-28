'use client';

import { MapPin, Star } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDisplayDate } from '@/lib/dashboard-context';
import type { ArrangementStatus } from '@/types/database.types';

interface MySeatCardProps {
  seat: {
    arrangementId: string;
    arrangementDate: string;
    arrangementStatus: ArrangementStatus | null;
    row: number;
    column: number;
    isRowLeader: boolean;
  };
}

/**
 * 내 좌석 위치 카드
 *
 * 배치표가 공유된 후 내 좌석 위치를 표시합니다.
 */
export function MySeatCard({ seat }: MySeatCardProps) {
  const displayDate = formatDisplayDate(seat.arrangementDate);

  return (
    <Card className="border-[var(--color-primary-200)] bg-[var(--color-primary-50)]">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base text-[var(--color-primary-900)]">
          <MapPin className="h-4 w-4 text-[var(--color-primary-500)]" />
          내 좌석
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* 좌석 정보 */}
        <div className="rounded-lg bg-white p-4 shadow-sm">
          <div className="text-sm text-[var(--color-text-secondary)]">{displayDate}</div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[var(--color-primary-700)]">
              {seat.row}열 {seat.column}번
            </span>
            {seat.isRowLeader && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                <Star className="h-3 w-3" />
                줄반장
              </span>
            )}
          </div>
        </div>

        {/* 배치표 보기 버튼 */}
        <Button asChild variant="outline" className="w-full">
          <Link href={`/arrangements/${seat.arrangementId}`}>배치표 전체 보기</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export default MySeatCard;
