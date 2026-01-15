'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { createLogger } from '@/lib/logger';
import Link from 'next/link';

const logger = createLogger({ prefix: 'AdminError' });

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * 관리자 라우트 에러 핸들러
 */
export default function AdminError({ error, reset }: ErrorProps) {
  useEffect(() => {
    logger.error('Admin error:', {
      message: error.message,
      digest: error.digest,
    });
  }, [error]);

  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center p-8">
      <div className="max-w-md text-center">
        <div className="mb-6 flex justify-center">
          <div className="rounded-full bg-red-100 p-4">
            <AlertTriangle className="h-12 w-12 text-red-600" />
          </div>
        </div>

        <h1 className="mb-2 text-2xl font-bold text-gray-900">
          관리자 페이지 오류
        </h1>

        <p className="mb-6 text-gray-600">
          관리자 페이지를 불러오는 중 문제가 발생했습니다.
        </p>

        {process.env.NODE_ENV === 'development' && (
          <div className="mb-6 rounded-lg bg-gray-100 p-4 text-left">
            <p className="font-mono text-sm text-red-600">
              {error.message}
            </p>
          </div>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button
            variant="outline"
            onClick={reset}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            다시 시도
          </Button>

          <Link href="/dashboard">
            <Button className="flex items-center gap-2">
              <Home className="h-4 w-4" />
              대시보드로 이동
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
