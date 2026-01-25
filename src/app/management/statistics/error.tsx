'use client';

import { AlertTriangle, ArrowLeft, RefreshCw } from 'lucide-react';

import { useEffect } from 'react';

import Link from 'next/link';

import { Button } from '@/components/ui/button';

import { createLogger } from '@/lib/logger';

const logger = createLogger({ prefix: 'ManagementStatisticsError' });

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * 임원 포털 통계 라우트 에러 핸들러
 */
export default function ManagementStatisticsError({ error, reset }: ErrorProps) {
  useEffect(() => {
    logger.error('Management Statistics error:', {
      message: error.message,
      digest: error.digest,
    });
  }, [error]);

  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center p-8">
      <div className="max-w-md text-center">
        <div className="mb-6 flex justify-center">
          <div className="rounded-full bg-amber-100 p-4">
            <AlertTriangle className="h-12 w-12 text-amber-600" />
          </div>
        </div>

        <h1 className="mb-2 text-2xl font-bold text-gray-900">통계 오류</h1>

        <p className="mb-6 text-gray-600">통계 정보를 불러오는 중 문제가 발생했습니다.</p>

        {process.env.NODE_ENV === 'development' && (
          <div className="mb-6 rounded-lg bg-gray-100 p-4 text-left">
            <p className="font-mono text-sm text-red-600">{error.message}</p>
          </div>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button variant="outline" onClick={reset} className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            다시 시도
          </Button>

          <Link href="/management">
            <Button className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              임원 포털로 이동
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
