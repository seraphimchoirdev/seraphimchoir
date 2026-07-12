'use client';

import { Loader2 } from 'lucide-react';

import { useState } from 'react';

import NotesEditor from '@/components/features/arrangements/NotesEditor';
import { Button } from '@/components/ui/button';

import { useUpdateArrangement } from '@/hooks/useArrangements';

import { showError, showSuccess } from '@/lib/toast';

interface ArrangementNotesPanelProps {
  arrangementId: string;
  value: string;
  onChange: (value: string) => void;
}

/**
 * 안내 메모 에디터 패널 (워크플로우 6단계, 배치표 하단 인라인) — B10 잔여 분리
 *
 * 메모 값(value)은 ArrangementHeader의 저장 시에도 함께 전송되므로
 * 페이지 레벨 state를 props로 받고, 저장 mutation만 내부에서 처리한다.
 */
export default function ArrangementNotesPanel({
  arrangementId,
  value,
  onChange,
}: ArrangementNotesPanelProps) {
  const [isSaving, setIsSaving] = useState(false);
  const updateArrangement = useUpdateArrangement();

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateArrangement.mutateAsync({
        id: arrangementId,
        data: { notes: value || null },
      });
      showSuccess('안내 메모가 저장되었습니다.');
    } catch {
      showError('안내 메모 저장에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div data-print-hide className="border-t-2 border-[var(--color-primary-200)] bg-[var(--color-background-secondary)] p-4">
      <div className="mx-auto max-w-3xl rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface)] p-4 shadow-sm">
        <h3 className="mb-2 text-sm font-bold text-[var(--color-text-primary)]">
          📋 안내 메모
        </h3>
        <p className="mb-3 text-xs text-[var(--color-text-secondary)]">
          대원 이동 동선, 대형 변경 등 안내사항을 기록하세요. 이미지 내보내기에 포함됩니다.
        </p>
        <NotesEditor
          value={value}
          onChange={onChange}
        />
        <div className="mt-3 flex justify-end">
          <Button
            size="sm"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <><Loader2 className="mr-1 h-4 w-4 animate-spin" />저장 중...</>
            ) : (
              '메모 저장'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
