'use client';

import { Loader2 } from 'lucide-react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import { cn } from '@/lib/utils';

/**
 * 확인 다이얼로그 컴포넌트
 *
 * 접근성 (a11y):
 * - Radix AlertDialog 기반: role="alertdialog", aria-modal="true" 자동 적용
 * - 키보드: Tab으로 버튼 이동, Enter로 확인, Escape로 취소
 * - 포커스 트랩: 다이얼로그 열릴 때 자동 포커스, 닫힐 때 트리거로 복귀
 * - 스크린리더: title과 description을 aria-labelledby, aria-describedby로 연결
 *
 * variant:
 * - default: 일반 확인 (파란색 버튼)
 * - warning: 주의 필요한 작업 (주황색 버튼)
 * - destructive: 삭제 등 위험한 작업 (빨간색 버튼)
 */

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  variant?: 'default' | 'destructive' | 'warning';
  isLoading?: boolean;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = '확인',
  cancelLabel = '취소',
  onConfirm,
  variant = 'default',
  isLoading = false,
}: ConfirmDialogProps) {
  const handleConfirm = () => {
    onConfirm();
    if (!isLoading) {
      onOpenChange(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent
        className={cn(
          // 모바일에서 최소 터치 영역 확보
          '[&_button]:min-h-[44px]'
        )}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription className="whitespace-pre-line">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:gap-0">
          <AlertDialogCancel disabled={isLoading} className="min-w-[80px]">
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isLoading}
            className={cn(
              'min-w-[80px]',
              variant === 'destructive' &&
                'bg-[var(--color-error-600)] hover:bg-[var(--color-error-700)] focus:ring-[var(--color-error-600)]',
              variant === 'warning' &&
                'bg-[var(--color-warning-500)] text-black hover:bg-[var(--color-warning-600)] focus:ring-[var(--color-warning-500)]'
            )}
            // 접근성: aria-busy 상태 표시
            aria-busy={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                <span>처리중...</span>
              </>
            ) : (
              confirmLabel
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
