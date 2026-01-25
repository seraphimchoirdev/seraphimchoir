import { toast } from 'sonner';

/**
 * Toast 알림 유틸리티 함수
 * Sonner 라이브러리의 편의성 래퍼
 *
 * 접근성 고려사항:
 * - 성공/정보: aria-live="polite" (자연스러운 알림)
 * - 에러/경고: aria-live="assertive" (즉시 알림)
 * - 스크린리더가 메시지를 읽어줌
 *
 * Duration 가이드:
 * - 성공/정보: 4초 (짧은 확인 메시지)
 * - 경고: 5초 (주의 필요)
 * - 에러: 6초 (문제 인지 필요)
 * - 액션 포함: 8초 (버튼 클릭 시간 확보)
 */

// 성공 메시지 (aria-live="polite")
export const showSuccess = (message: string) => {
  toast.success(message, {
    duration: 4000,
  });
};

// 에러 메시지 (aria-live="assertive", 재시도 액션 선택적)
export const showError = (message: string, onRetry?: () => void) => {
  if (onRetry) {
    toast.error(message, {
      action: {
        label: '재시도',
        onClick: onRetry,
      },
      duration: 8000,
    });
  } else {
    toast.error(message, {
      duration: 6000,
    });
  }
};

// 경고 메시지 (aria-live="assertive")
export const showWarning = (message: string) => {
  toast.warning(message, {
    duration: 5000,
  });
};

// 정보 메시지 (aria-live="polite")
export const showInfo = (message: string) => {
  toast.info(message, {
    duration: 4000,
  });
};

// Promise 기반 (비동기 작업용)
// 로딩 → 성공/에러 자동 전환
export const showPromise = <T>(
  promise: Promise<T>,
  messages: {
    loading: string;
    success: string;
    error: string;
  }
) => {
  return toast.promise(promise, {
    ...messages,
    duration: 4000,
  });
};

// 커스텀 Toast (액션 버튼 포함)
export const showWithAction = (
  message: string,
  actionLabel: string,
  onAction: () => void,
  variant: 'success' | 'error' | 'warning' | 'info' = 'info'
) => {
  const toastFn = {
    success: toast.success,
    error: toast.error,
    warning: toast.warning,
    info: toast.info,
  }[variant];

  toastFn(message, {
    action: {
      label: actionLabel,
      onClick: onAction,
    },
    duration: 8000,
  });
};

// 실행취소 패턴 (삭제 후 복구 등)
export const showWithUndo = (message: string, onUndo: () => void, duration = 8000) => {
  toast.success(message, {
    action: {
      label: '실행취소',
      onClick: onUndo,
    },
    duration,
  });
};

// Toast 전체 해제
export const dismissAllToasts = () => {
  toast.dismiss();
};

// 특정 Toast 해제
export const dismissToast = (toastId: string | number) => {
  toast.dismiss(toastId);
};
