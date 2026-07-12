'use client';

import { Button } from '@/components/ui/button';

import { useArrangementStore } from '@/store/arrangement-store';

import { OFFSET_PRESETS } from '@/types/grid';

import { getActivePresetId } from '@/lib/utils/offsetPresets';

interface OffsetPresetButtonsProps {
  disabled?: boolean;
}

/**
 * 줄 정렬 프리셋 버튼 그룹 (Step 2 공통)
 *
 * 워크플로우 패널(Expanded)과 플로팅 액션 바(Compact) 양쪽에서 동일하게 사용된다.
 * gridLayout·applyOffsetPreset은 스토어에서 직접 구독한다.
 */
export default function OffsetPresetButtons({ disabled = false }: OffsetPresetButtonsProps) {
  const gridLayout = useArrangementStore((state) => state.gridLayout);
  const applyOffsetPreset = useArrangementStore((state) => state.applyOffsetPreset);

  const activePresetId = getActivePresetId(gridLayout);

  return (
    <div className="flex flex-wrap gap-2">
      {OFFSET_PRESETS.map((preset) => (
        <Button
          key={preset.id}
          size="sm"
          variant={activePresetId === preset.id ? 'default' : 'outline'}
          disabled={disabled}
          onClick={() => applyOffsetPreset(preset.id)}
          title={preset.description}
          aria-pressed={activePresetId === preset.id}
        >
          {preset.name}
          {preset.id === 'arc' && (
            <span className={`ml-1 inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-medium ${activePresetId === preset.id ? 'bg-white/20 text-white' : 'bg-[var(--color-warning-100)] text-[var(--color-warning-700)]'}`}>
              추천
            </span>
          )}
        </Button>
      ))}
    </div>
  );
}
