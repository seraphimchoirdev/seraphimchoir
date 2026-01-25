'use client';

import { AlertTriangle, Home, RefreshCw } from 'lucide-react';

import { useEffect } from 'react';

import { Button } from '@/components/ui/button';

import { logger } from '@/lib/logger';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Next.js App Router 전역 에러 핸들러
 *
 * 라우트 세그먼트에서 발생한 에러를 포착하고
 * 사용자에게 복구 옵션을 제공합니다.
 */
export default function GlobalError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // 에러 로깅 (프로덕션에서는 외부 모니터링 서비스로 전송 가능)
    logger.error('Global error caught:', {
      message: error.message,
      digest: error.digest,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
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

        <h1 className="mb-2 text-2xl font-bold text-gray-900">오류가 발생했습니다</h1>

        <p className="mb-6 text-gray-600">
          페이지를 표시하는 중 문제가 발생했습니다.
          <br />
          잠시 후 다시 시도해주세요.
        </p>

        {/* 개발 환경에서만 에러 상세 정보 표시 */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mb-6 rounded-lg bg-gray-100 p-4 text-left">
            <p className="mb-2 font-mono text-sm text-red-600">{error.message}</p>
            {error.digest && <p className="text-xs text-gray-500">Error ID: {error.digest}</p>}
          </div>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button variant="outline" onClick={reset} className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            다시 시도
          </Button>

          <Button
            variant="outline"
            onClick={() => window.location.reload()}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            새로고침
          </Button>

          <Button
            onClick={() => (window.location.href = '/dashboard')}
            className="flex items-center gap-2"
          >
            <Home className="h-4 w-4" />
            홈으로 이동
          </Button>
        </div>
      </div>
    </div>
  );
}
