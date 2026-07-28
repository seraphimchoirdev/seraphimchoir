'use client';

import { useEffect, useState } from 'react';

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
 * 반응형 위치:
 * - 데스크탑(sm+): top-center — F-pattern 시선 흐름, 편집 작업 방해 최소
 * - 모바일: bottom-center — 엄지 접근성, 하단 네비 회피(offset 80px)
 *
 * 애니메이션:
 * - duration 조정: 성공(4초), 에러/액션(8초)
 * - prefers-reduced-motion 자동 지원 (Sonner 내장)
 */
const Toaster = ({ ...props }: ToasterProps) => {
  // 모바일 기본값으로 시작 (SSR/hydration 안전)
  const [isMobile, setIsMobile] = useState(true);

  useEffect(() => {
    const mql = window.matchMedia('(max-width: 639px)');
    setIsMobile(mql.matches);

    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener('change', handler);

    // DEV ONLY: Playwright 테스트용 글로벌 노출 (프로덕션 빌드에서 제거됨)
    if (process.env.NODE_ENV === 'development') {
      (window as unknown as Record<string, unknown>).__test_toast = toast;
    }

    return () => mql.removeEventListener('change', handler);
  }, []);

  return (
    <Sonner
      className="toaster group"
      position={isMobile ? 'bottom-center' : 'top-center'}
      offset={isMobile ? 80 : 16}
      mobileOffset={80}
      // 접근성: 포커스 가능, 키보드 네비게이션
      closeButton
      // 여러 알림 스택 시 compact하게
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
          // 타입별(success/error/warning/info) 스타일은 여기서 지정하지 않는다.
          // sonner의 [data-sonner-toast][data-styled='true'] 규칙이 명시도(0,2,0)로
          // Tailwind 유틸리티 클래스(0,1,0)를 이기기 때문에 적용되지 않는다.
          // globals.css의 [data-sonner-toast][data-styled][data-type] 블록 참고.
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
