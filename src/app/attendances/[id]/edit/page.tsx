'use client';

import { use } from 'react';

import Link from 'next/link';

import AttendanceForm from '@/components/features/attendances/AttendanceForm';

import { useAttendance } from '@/hooks/useAttendances';
import { useAuth } from '@/hooks/useAuth';

export default function EditAttendancePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: attendance, isLoading, error } = useAttendance(id);
  const { hasRole } = useAuth();

  // PART_LEADER 이상 권한 확인
  const canEdit = hasRole(['ADMIN', 'CONDUCTOR', 'MANAGER', 'PART_LEADER']);

  if (!canEdit) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-background-tertiary)]">
        <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-md">
          <div className="text-center">
            <svg
              className="mx-auto h-12 w-12 text-[var(--color-error-400)]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <h2 className="mt-4 text-xl font-semibold text-[var(--color-text-primary)]">
              권한 없음
            </h2>
            <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
              출석 수정 권한이 없습니다. PART_LEADER 이상의 권한이 필요합니다.
            </p>
            <div className="mt-6">
              <Link
                href="/attendances"
                className="inline-flex items-center rounded-md border border-transparent bg-[var(--color-primary-600)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-700)]"
              >
                출석 관리로 돌아가기
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-background-tertiary)]">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[var(--color-primary-600)] border-r-transparent"></div>
          <p className="mt-2 text-sm text-[var(--color-text-secondary)]">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (error || !attendance) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-background-tertiary)]">
        <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-md">
          <div className="text-center">
            <svg
              className="mx-auto h-12 w-12 text-[var(--color-error-400)]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h2 className="mt-4 text-xl font-semibold text-[var(--color-text-primary)]">
              오류 발생
            </h2>
            <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
              {error instanceof Error ? error.message : '출석 기록을 불러올 수 없습니다'}
            </p>
            <div className="mt-6">
              <Link
                href="/attendances"
                className="inline-flex items-center rounded-md border border-transparent bg-[var(--color-primary-600)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-700)]"
              >
                출석 관리로 돌아가기
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-background-tertiary)] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6">
          <Link
            href="/attendances"
            className="inline-flex items-center text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
          >
            <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            출석 관리로 돌아가기
          </Link>
        </div>

        <div className="rounded-lg bg-white p-6 shadow-md">
          <h1 className="mb-6 text-2xl font-bold text-[var(--color-text-primary)]">출석 수정</h1>
          <AttendanceForm attendance={attendance} />
        </div>
      </div>
    </div>
  );
}
