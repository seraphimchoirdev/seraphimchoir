import { Suspense } from 'react';
import LoginForm from '@/components/features/auth/LoginForm';
import { Metadata } from 'next';
import { Loader2 } from 'lucide-react';

export const metadata: Metadata = {
  title: '로그인 - 새로핌On',
  description: '새문안교회 새로핌찬양대 로그인',
};

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-background-tertiary)] px-4 sm:px-6 lg:px-8">
      <Suspense
        fallback={
          <div className="flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary)]" />
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  );
}
