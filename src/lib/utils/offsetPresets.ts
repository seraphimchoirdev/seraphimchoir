import { GridLayout, OFFSET_PRESETS } from '@/types/grid';

/**
 * 현재 gridLayout의 rowOffsets가 어떤 줄 정렬 프리셋과 일치하는지 판별한다.
 * (arrangements/[id] 페이지에서 추출 — Step 2 워크플로우와 긴급 수정 패널 공용)
 */
export function getActivePresetId(gridLayout: GridLayout | null | undefined): string | null {
  const rows = gridLayout?.rows ?? 0;
  const currentOffsets = gridLayout?.rowOffsets;
  for (const preset of OFFSET_PRESETS) {
    const presetOffsets = preset.getOffsets(rows);
    const presetKeys = Object.keys(presetOffsets);
    const currentKeys = Object.keys(currentOffsets ?? {});

    if (presetKeys.length === 0 && currentKeys.length === 0) return preset.id;
    if (presetKeys.length !== currentKeys.length) continue;

    const matches = presetKeys.every(
      (k) => (currentOffsets ?? {})[Number(k)] === presetOffsets[Number(k)]
    );
    if (matches) return preset.id;
  }
  return null;
}
