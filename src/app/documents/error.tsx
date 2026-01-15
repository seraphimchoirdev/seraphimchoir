'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, ArrowLeft } from 'lucide-react';
import { createLogger } from '@/lib/logger';
import Link from 'next/link';

const logger = createLogger({ prefix: 'DocumentsError' });

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * 문서 아카이브 라우트 에러 핸들러
 */
export default function DocumentsError({ error, reset }: ErrorProps) {
  useEffect(() => {
    logger.error('Documents error:', {
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

        <h1 className="mb-2 text-2xl font-bold text-gray-900">
          문서 아카이브 오류
        </h1>

        <p className="mb-6 text-gray-600">
          문서를 불러오는 중 문제가 발생했습니다.
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
              <ArrowLeft className="h-4 w-4" />
              대시보드로 이동
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
