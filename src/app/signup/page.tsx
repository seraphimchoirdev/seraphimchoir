'use client';

import { useEffect, useState } from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';

import { useAuth } from '@/hooks/useAuth';

import { createLogger } from '@/lib/logger';

const logger = createLogger({ prefix: 'SignupPage' });

export default function SignupPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const router = useRouter();
  const { signUp, isAuthenticated, isLoading: authLoading } = useAuth();

  // 이미 로그인된 경우 리다이렉트
  useEffect(() => {
    logger.debug('SignupPage: authLoading =', authLoading, 'isAuthenticated =', isAuthenticated);

    if (!authLoading && isAuthenticated) {
      logger.debug('SignupPage: 이미 로그인됨, /members로 리다이렉트');
      router.push('/members');
    }
  }, [isAuthenticated, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    // 유효성 검사
    if (password !== confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }

    if (password.length < 6) {
      setError('비밀번호는 최소 6자 이상이어야 합니다.');
      return;
    }

    setIsLoading(true);

    const { error } = await signUp(email, password, name);

    logger.debug('회원가입 결과:', { error });

    if (error) {
      logger.error('회원가입 에러:', error);
      setError(error.message || '회원가입에 실패했습니다.');
      setIsLoading(false);
    } else {
      logger.debug('회원가입 성공');

      setSuccess(true);
      setIsLoading(false);

      // 3초 후 로그인 페이지로 이동
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-background-primary)]">
        <div className="text-center">
          <Spinner size="lg" variant="default" />
          <p className="body-base mt-4 text-[var(--color-text-secondary)]">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-background-secondary)] px-4 py-12 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md border-none shadow-[var(--shadow-lg)]">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="heading-2 text-[var(--color-primary-700)]">회원가입</CardTitle>
          <CardDescription className="body-base text-[var(--color-text-secondary)]">
            새 계정 만들기
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <Alert variant="error">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert variant="success">
                <AlertDescription>
                  회원가입이 완료되었습니다! 이메일 인증 후 로그인해주세요.
                  <br />곧 로그인 페이지로 이동합니다...
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">이름</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="홍길동"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={isLoading || success}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">이메일</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="example@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading || success}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">비밀번호</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="비밀번호 (최소 6자)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading || success}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">비밀번호 확인</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="비밀번호 확인"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={isLoading || success}
                />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading || success}>
              {isLoading ? (
                <>
                  <Spinner size="sm" variant="white" className="mr-2" />
                  회원가입 중...
                </>
              ) : (
                '회원가입'
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <div className="text-center">
            <p className="text-sm text-[var(--color-text-secondary)]">
              이미 계정이 있으신가요?{' '}
              <Link
                href="/login"
                className="font-medium text-[var(--color-primary-600)] hover:text-[var(--color-primary-500)] hover:underline"
              >
                로그인
              </Link>
            </p>
          </div>
          <div className="text-center text-xs text-[var(--color-text-tertiary)]">
            <p>회원가입 후 관리자가 역할을 부여해야 시스템을 사용할 수 있습니다.</p>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
