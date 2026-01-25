'use client';

import { Toaster as Sonner, toast } from 'sonner';

type ToasterProps = React.ComponentProps<typeof Sonner>;

/**
 * Toast 알림 컴포넌트
 *
 * 접근성 (a11y):
 * - Sonner는 기본적으로 role="status", aria-live="polite" 지원
 * - 에러 Toast는 aria-live="assertive"로 즉시 알림
 * - 키보드: Escape로 dismiss, Tab으로 액션 버튼 포커스
 *
 * 모바일 UX:
 * - position="bottom-center": 엄지 영역에서 접근 용이
 * - offset={80}: 하단 네비게이션(64px) + 여유(16px)
 * - swipeToDismiss: 터치로 닫기
 * - expand={false}: 여러 Toast 스택 시 공간 절약
 *
 * 애니메이션:
 * - duration 조정: 성공(3초), 에러/액션(8초)
 * - prefers-reduced-motion 자동 지원 (Sonner 내장)
 */
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      position="bottom-center"
      offset={80}
      // 접근성: 포커스 가능, 키보드 네비게이션
      closeButton
      // 모바일 UX: 스와이프로 닫기
      // expand={false}: 여러 알림 스택 시 compact하게
      expand={false}
      // 화면에 동시 표시할 최대 Toast 수
      visibleToasts={3}
      // 기본 duration (성공/정보: 4초)
      duration={4000}
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-[var(--color-surface)] group-[.toaster]:text-[var(--color-text-primary)] group-[.toaster]:border-[var(--color-border-default)] group-[.toaster]:shadow-lg group-[.toaster]:rounded-lg',
          description: 'group-[.toast]:text-[var(--color-text-secondary)]',
          actionButton:
            'group-[.toast]:bg-[var(--color-primary-600)] group-[.toast]:text-white group-[.toast]:rounded-md group-[.toast]:font-medium group-[.toast]:px-3 group-[.toast]:py-1.5',
          cancelButton:
            'group-[.toast]:bg-[var(--color-background-tertiary)] group-[.toast]:text-[var(--color-text-secondary)] group-[.toast]:rounded-md',
          closeButton:
            'group-[.toast]:bg-[var(--color-background-tertiary)] group-[.toast]:border-[var(--color-border-default)]',
          success:
            'group-[.toaster]:border-l-4 group-[.toaster]:border-l-[var(--color-success-500)]',
          error: 'group-[.toaster]:border-l-4 group-[.toaster]:border-l-[var(--color-error-500)]',
          warning:
            'group-[.toaster]:border-l-4 group-[.toaster]:border-l-[var(--color-warning-500)]',
          info: 'group-[.toaster]:border-l-4 group-[.toaster]:border-l-[var(--color-primary-500)]',
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
