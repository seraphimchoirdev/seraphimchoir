'use client';

import { AlertTriangle, Home, RefreshCw } from 'lucide-react';

import React, { Component, ReactNode } from 'react';

import { Button } from '@/components/ui/button';

import { createLogger } from '@/lib/logger';

const logger = createLogger({ prefix: 'ErrorBoundary' });

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

/**
 * React Error Boundary 컴포넌트
 *
 * 하위 컴포넌트에서 발생한 JavaScript 에러를 포착하고
 * 사용자에게 친근한 에러 메시지를 표시합니다.
 *
 * @example
 * <ErrorBoundary>
 *   <YourComponent />
 * </ErrorBoundary>
 *
 * @example
 * // 커스텀 fallback 사용
 * <ErrorBoundary fallback={<CustomErrorComponent />}>
 *   <YourComponent />
 * </ErrorBoundary>
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // 에러 로깅 (프로덕션에서는 외부 서비스로 전송 가능)
    logger.error('Error caught:', {
      error: error.message,
      componentStack: errorInfo.componentStack,
    });

    this.setState({
      error,
      errorInfo,
    });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/dashboard';
  };

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      // 커스텀 fallback이 제공된 경우
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // 기본 에러 UI
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
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="mb-6 rounded-lg bg-gray-100 p-4 text-left">
                <p className="mb-2 font-mono text-sm text-red-600">{this.state.error.message}</p>
                {this.state.errorInfo && (
                  <pre className="max-h-32 overflow-auto text-xs text-gray-500">
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Button
                variant="outline"
                onClick={this.handleRetry}
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                다시 시도
              </Button>

              <Button
                variant="outline"
                onClick={this.handleReload}
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                새로고침
              </Button>

              <Button onClick={this.handleGoHome} className="flex items-center gap-2">
                <Home className="h-4 w-4" />
                홈으로 이동
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * 페이지 레벨 Error Boundary
 * 전체 페이지를 감싸는 용도로 사용
 */
export function PageErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      fallback={
        <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-8">
          <div className="max-w-md text-center">
            <div className="mb-6 flex justify-center">
              <div className="rounded-full bg-red-100 p-4">
                <AlertTriangle className="h-16 w-16 text-red-600" />
              </div>
            </div>

            <h1 className="mb-2 text-3xl font-bold text-gray-900">페이지 오류</h1>

            <p className="mb-8 text-lg text-gray-600">
              이 페이지를 불러오는 중 오류가 발생했습니다.
            </p>

            <div className="flex flex-col gap-4">
              <Button
                size="lg"
                onClick={() => window.location.reload()}
                className="flex items-center justify-center gap-2"
              >
                <RefreshCw className="h-5 w-5" />
                페이지 새로고침
              </Button>

              <Button
                variant="outline"
                size="lg"
                onClick={() => (window.location.href = '/dashboard')}
                className="flex items-center justify-center gap-2"
              >
                <Home className="h-5 w-5" />
                대시보드로 이동
              </Button>
            </div>
          </div>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}

export default ErrorBoundary;
