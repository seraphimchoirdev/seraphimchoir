'use client';

import { ChevronDown } from 'lucide-react';

import { ReactNode } from 'react';

import { Button } from '@/components/ui/button';

interface MobileBottomSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

/**
 * 모바일 바텀시트 셸 (배치 편집 화면 전용) — B10 잔여 분리
 *
 * 오버레이 + 60% 높이 시트 + 드래그 핸들 + 헤더/닫기 버튼을 담당하고,
 * 콘텐츠(워크플로우/긴급 수정 패널)는 children으로 받는다.
 * 부모의 relative 컨테이너를 기준으로 absolute 배치되므로
 * position: relative인 요소 안에서 사용해야 한다.
 */
export default function MobileBottomSheet({
  open,
  onClose,
  title,
  children,
}: MobileBottomSheetProps) {
  if (!open) return null;

  return (
    <>
      {/* 배경 오버레이 */}
      <div
        className="absolute inset-0 z-30 bg-black/30"
        onClick={onClose}
        style={{
          animation: 'fadeIn 0.3s ease-out',
        }}
      />
      {/* Bottom Sheet - 60% 높이로 그리드 가시성 확보 */}
      <div
        className="absolute right-0 bottom-0 left-0 z-40 flex max-h-full flex-col rounded-t-2xl bg-[var(--color-background-primary)] shadow-2xl"
        style={{
          height: '60%',
          maxHeight: '500px',
          animation: 'slideUp 0.3s ease-out',
        }}
      >
        {/* 드래그 핸들 */}
        <div className="flex flex-shrink-0 justify-center pt-2 pb-1">
          <div className="h-1 w-10 rounded-full bg-[var(--color-text-tertiary)] opacity-30" />
        </div>
        {/* 헤더 - flex-shrink-0로 항상 표시 보장 */}
        <div className="flex flex-shrink-0 items-center justify-between border-b border-[var(--color-border-default)] bg-[var(--color-surface)] px-4 py-3">
          <h2 className="text-lg font-bold text-[var(--color-text-primary)]">
            {title}
          </h2>
          <Button
            onClick={onClose}
            variant="ghost"
            size="sm"
            className="gap-1"
          >
            <ChevronDown className="h-4 w-4" />
            닫기
          </Button>
        </div>
        {/* 패널 콘텐츠 - min-h-0으로 flex overflow 동작 보장 */}
        <div className="min-h-0 flex-1 overflow-auto p-4">
          {children}
        </div>
      </div>

      {/* CSS 애니메이션 */}
      <style jsx>{`
        @keyframes slideUp {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
      `}</style>
    </>
  );
}
