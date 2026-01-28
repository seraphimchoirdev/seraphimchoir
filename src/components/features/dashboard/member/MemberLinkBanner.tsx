'use client';

import { AlertCircle, CheckCircle2, Clock, UserPlus } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface MemberLinkBannerProps {
  linkStatus: 'pending' | 'approved' | 'rejected' | null;
}

/**
 * 대원 연결 안내 배너
 *
 * 아직 대원 정보와 연결되지 않은 사용자에게 안내를 표시합니다.
 */
export function MemberLinkBanner({ linkStatus }: MemberLinkBannerProps) {
  // 승인 대기 중
  if (linkStatus === 'pending') {
    return (
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="flex items-start gap-4 p-4">
          <div className="rounded-full bg-amber-100 p-2">
            <Clock className="h-5 w-5 text-amber-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-medium text-amber-900">대원 연결 승인 대기 중</h3>
            <p className="mt-1 text-sm text-amber-700">
              관리자가 연결 요청을 검토 중입니다. 승인되면 출석 투표와 좌석 확인이 가능합니다.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // 연결 거절됨
  if (linkStatus === 'rejected') {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="flex items-start gap-4 p-4">
          <div className="rounded-full bg-red-100 p-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-medium text-red-900">대원 연결 요청이 거절되었습니다</h3>
            <p className="mt-1 text-sm text-red-700">
              정보가 일치하지 않을 수 있습니다. 관리자에게 문의하거나 다시 요청해 주세요.
            </p>
            <Button asChild variant="outline" size="sm" className="mt-3">
              <Link href="/profile/link-member">다시 요청하기</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // 연결 안됨 (기본)
  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardContent className="flex items-start gap-4 p-4">
        <div className="rounded-full bg-blue-100 p-2">
          <UserPlus className="h-5 w-5 text-blue-600" />
        </div>
        <div className="flex-1">
          <h3 className="font-medium text-blue-900">대원 정보와 연결하세요</h3>
          <p className="mt-1 text-sm text-blue-700">
            내 출석 투표와 좌석 정보를 확인하려면 찬양대원 정보와 연결이 필요합니다.
          </p>
          <Button asChild size="sm" className="mt-3">
            <Link href="/profile/link-member">대원 연결 요청하기</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default MemberLinkBanner;
