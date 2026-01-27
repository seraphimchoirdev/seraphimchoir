'use client';

import { AlertTriangle, Edit, Printer } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { formatDisplayDate } from '@/lib/dashboard-context';

interface EmergencyActionCardProps {
  arrangementId: string;
  arrangementDate: string;
}

/**
 * 긴급 배치표 수정 카드 (총무/부총무용)
 *
 * 주일 당일에 배치표를 긴급 수정해야 할 때 표시됩니다.
 */
export function EmergencyActionCard({ arrangementId, arrangementDate }: EmergencyActionCardProps) {
  return (
    <Card className="border-amber-300 bg-amber-50">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-amber-100 p-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-medium text-amber-900">긴급 배치표 수정</h3>
            <p className="mt-1 text-sm text-amber-700">
              {formatDisplayDate(arrangementDate)} 배치표를 수정하거나 출력할 수 있습니다.
            </p>
            <div className="mt-3 flex gap-2">
              <Button asChild size="sm" variant="default">
                <Link href={`/arrangements/${arrangementId}/edit?emergency=true`}>
                  <Edit className="mr-1.5 h-4 w-4" />
                  긴급 수정
                </Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link href={`/arrangements/${arrangementId}?print=true`}>
                  <Printer className="mr-1.5 h-4 w-4" />
                  출력
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default EmergencyActionCard;
