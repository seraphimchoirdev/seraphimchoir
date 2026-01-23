'use client';

import { useArrangementStore } from '@/store/arrangement-store';
import { Button } from '@/components/ui/button';
import { Wand2, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * 워크플로우 모드 토글 버튼
 *
 * - 위자드 모드: 단계별 가이드를 따라 진행
 * - 자유 편집 모드: 모든 섹션에 자유롭게 접근
 */
export default function WorkflowModeToggle() {
  const { workflow, toggleWizardMode } = useArrangementStore();
  const { isWizardMode } = workflow;

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggleWizardMode}
      className={cn(
        'gap-2 transition-all',
        isWizardMode
          ? 'bg-[var(--color-primary-50)] border-[var(--color-primary-300)] text-[var(--color-primary-700)]'
          : 'bg-[var(--color-background-secondary)] border-[var(--color-border-default)]'
      )}
      title={isWizardMode ? '자유 편집 모드로 전환' : '가이드 모드로 전환'}
    >
      {isWizardMode ? (
        <>
          <Wand2 className="h-4 w-4" />
          <span className="hidden sm:inline">가이드 모드</span>
        </>
      ) : (
        <>
          <Layers className="h-4 w-4" />
          <span className="hidden sm:inline">자유 편집</span>
        </>
      )}
    </Button>
  );
}
