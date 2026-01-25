'use client';

import { Loader2, MessageCircle } from 'lucide-react';

import { useState } from 'react';

import { useRouter, useSearchParams } from 'next/navigation';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { useAuth } from '@/hooks/useAuth';

import { createLogger } from '@/lib/logger';

const logger = createLogger({ prefix: 'LoginForm' });

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signIn, signInWithKakao } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isKakaoLoading, setIsKakaoLoading] = useState(false);

  // URL에서 에러 파라미터 확인
  const urlError = searchParams.get('error');
  const errorMessage =
    urlError === 'oauth_failed'
      ? '카카오 로그인에 실패했습니다. 다시 시도해주세요.'
      : urlError === 'user_fetch_failed'
        ? '사용자 정보를 가져오는데 실패했습니다.'
        : urlError === 'session_required'
          ? '로그인이 필요합니다. 아래 카카오 로그인 버튼을 눌러주세요.'
          : urlError === 'no_code'
            ? '로그인이 필요합니다. 아래 카카오 로그인 버튼을 눌러주세요.'
            : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const { error } = await signIn(email, password);

      if (error) {
        setError(error.message);
      } else {
        // 로그인 성공 시 대시보드로 이동
        router.push('/dashboard');
        router.refresh();
      }
    } catch (err) {
      setError('로그인 중 오류가 발생했습니다.');
      logger.error('Login error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKakaoLogin = async () => {
    setError(null);
    setIsKakaoLoading(true);

    try {
      const { error } = await signInWithKakao();

      if (error) {
        setError(error.message);
        setIsKakaoLoading(false);
      }
      // 성공 시 리다이렉트되므로 로딩 상태 유지
    } catch (err) {
      setError('카카오 로그인 중 오류가 발생했습니다.');
      logger.error('Login error:', err);
      setIsKakaoLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md space-y-8">
      <div className="text-center">
        <h2 className="mt-6 text-3xl font-bold tracking-tight text-[var(--color-text-primary)]">
          로그인
        </h2>
        <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
          새로핌On에 오신 것을 환영합니다
        </p>
      </div>

      {/* 카카오 로그인 섹션 */}
      <div className="mt-8 space-y-4">
        {(error || errorMessage) && (
          <Alert variant="error">
            <AlertDescription>{error || errorMessage}</AlertDescription>
          </Alert>
        )}

        {/* 다중 기기 로그인 안내 */}
        {(urlError === 'session_required' || urlError === 'no_code') && (
          <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-[var(--color-text-secondary)] dark:border-blue-800 dark:bg-blue-900/20">
            <p className="mb-1 font-medium text-blue-900 dark:text-blue-100">
              💡 다른 기기에서 로그인하시나요?
            </p>
            <p className="text-blue-800 dark:text-blue-200">
              다른 기기나 브라우저에서 로그인하려면 아래 카카오 로그인 버튼을 다시 눌러주세요.
            </p>
          </div>
        )}

        <div className="text-center">
          <p className="mb-3 text-sm text-[var(--color-text-secondary)]">
            찬양대원이신가요? 카카오로 간편하게 로그인하세요
          </p>
          <Button
            type="button"
            onClick={handleKakaoLogin}
            disabled={isKakaoLoading || isLoading}
            className="w-full bg-[#FEE500] font-medium text-[#191919] hover:bg-[#FDD835]"
          >
            {isKakaoLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                카카오 로그인 중...
              </>
            ) : (
              <>
                <MessageCircle className="mr-2 h-4 w-4" />
                카카오 로그인
              </>
            )}
          </Button>
        </div>

        {/* 구분선 */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-[var(--color-border)]" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-[var(--color-background-tertiary)] px-2 text-[var(--color-text-secondary)]">
              또는
            </span>
          </div>
        </div>
      </div>

      {/* 이메일/비밀번호 로그인 폼 */}
      <form className="space-y-6" onSubmit={handleSubmit}>
        <div className="space-y-4 rounded-md shadow-sm">
          <div className="space-y-2">
            <Label htmlFor="email">이메일</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">비밀번호</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={isLoading}
            />
          </div>
        </div>

        <div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                로그인 중...
              </>
            ) : (
              '로그인'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
