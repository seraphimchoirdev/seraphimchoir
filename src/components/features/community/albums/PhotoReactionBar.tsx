'use client';

import {
  PHOTO_REACTION_EMOJIS,
  type PhotoReactionEmoji,
} from '@/lib/community/album-constants';
import { showError } from '@/lib/toast';

import { useTogglePhotoReaction } from '@/hooks/usePhotoInteractions';

import type { PhotoReactionCounts } from '@/types/community';

interface PhotoReactionBarProps {
  albumId: string;
  photoId: string;
  /** 현재 사용자가 남긴 반응 이모지 (없으면 null) */
  myReaction: string | null;
  /** 이모지별 반응 수 */
  reactionCounts: PhotoReactionCounts;
}

/**
 * 사진 라이트박스 하단의 이모지 반응 바.
 * 프리셋 5개를 가로로 나열하고, 내가 선택한 이모지는 강조한다.
 * 클릭 시 토글: 같은 이모지 = 취소, 다른 이모지 = 교체.
 */
export default function PhotoReactionBar({
  albumId,
  photoId,
  myReaction,
  reactionCounts,
}: PhotoReactionBarProps) {
  const toggleReaction = useTogglePhotoReaction(albumId);

  const handleClick = async (emoji: PhotoReactionEmoji) => {
    try {
      await toggleReaction.mutateAsync({ photoId, emoji });
    } catch (e) {
      showError(e instanceof Error ? e.message : '반응 처리에 실패했습니다.');
    }
  };

  return (
    <div className="flex items-center gap-1.5">
      {PHOTO_REACTION_EMOJIS.map((emoji) => {
        const count = reactionCounts[emoji] ?? 0;
        const isActive = myReaction === emoji;
        return (
          <button
            key={emoji}
            type="button"
            onClick={() => handleClick(emoji)}
            disabled={toggleReaction.isPending}
            aria-pressed={isActive}
            aria-label={`${emoji} 반응${count > 0 ? ` ${count}개` : ''}`}
            className={`flex items-center gap-1 rounded-full px-2.5 py-1.5 text-sm backdrop-blur-sm transition-colors disabled:opacity-50 ${
              isActive
                ? 'bg-white/30 ring-1 ring-white/60'
                : 'bg-white/10 hover:bg-white/20'
            }`}
          >
            <span className="text-base leading-none">{emoji}</span>
            {count > 0 && (
              <span className="text-xs font-medium tabular-nums">{count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
