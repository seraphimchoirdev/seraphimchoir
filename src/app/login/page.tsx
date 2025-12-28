import LoginForm from '@/components/features/auth/LoginForm';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: '로그인 - Choir Seat Arranger',
  description: '찬양대 자리배치 시스템 로그인',
};

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-background-tertiary)] px-4 sm:px-6 lg:px-8">
      <LoginForm />
    </div>
  );
}
