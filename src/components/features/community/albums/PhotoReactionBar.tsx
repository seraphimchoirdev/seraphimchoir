'use client';

import { SmilePlus } from 'lucide-react';

import { useState } from 'react';

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

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
 * 사진 라이트박스 하단의 이모지 반응 트리거.
 * 평소엔 버튼 1개(내 반응 이모지 + 총개수)만 보이고,
 * 누르면 프리셋 5개가 버튼 위에 가로 바로 플로팅된다.
 * 이모지 클릭 시 토글: 같은 이모지 = 취소, 다른 이모지 = 교체.
 */
export default function PhotoReactionBar({
  albumId,
  photoId,
  myReaction,
  reactionCounts,
}: PhotoReactionBarProps) {
  const [open, setOpen] = useState(false);
  const toggleReaction = useTogglePhotoReaction(albumId);

  const totalCount = Object.values(reactionCounts).reduce((a, b) => a + b, 0);

  const handlePick = async (emoji: PhotoReactionEmoji) => {
    setOpen(false);
    try {
      await toggleReaction.mutateAsync({ photoId, emoji });
    } catch (e) {
      showError(e instanceof Error ? e.message : '반응 처리에 실패했습니다.');
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          disabled={toggleReaction.isPending}
          aria-label="반응 남기기"
          className={`flex shrink-0 items-center gap-1 rounded-full px-3 py-2 text-sm backdrop-blur-sm transition-colors disabled:opacity-50 ${
            myReaction
              ? 'bg-white/30 ring-1 ring-white/60'
              : 'bg-white/10 hover:bg-white/20'
          }`}
        >
          {myReaction ? (
            <span className="text-base leading-none">{myReaction}</span>
          ) : (
            <SmilePlus className="h-4 w-4" />
          )}
          {totalCount > 0 && (
            <span className="text-xs font-medium tabular-nums">
              {totalCount}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        className="min-w-0 !border-none !bg-transparent !shadow-none"
      >
        <div className="flex items-center gap-1 rounded-full border border-[var(--color-border-default)] bg-[var(--color-background-primary)] px-2 py-1.5 shadow-[var(--shadow-md)]">
          {PHOTO_REACTION_EMOJIS.map((emoji) => {
            const count = reactionCounts[emoji] ?? 0;
            const isActive = myReaction === emoji;
            return (
              <button
                key={emoji}
                type="button"
                onClick={() => handlePick(emoji)}
                disabled={toggleReaction.isPending}
                aria-pressed={isActive}
                aria-label={`${emoji} 반응${count > 0 ? ` ${count}개` : ''}`}
                className={`flex flex-col items-center rounded-full px-2 py-1 transition-transform hover:scale-125 disabled:opacity-50 ${
                  isActive ? 'bg-[var(--color-primary-100)]' : ''
                }`}
              >
                <span className="text-xl leading-none">{emoji}</span>
                {count > 0 && (
                  <span className="mt-0.5 text-[10px] font-medium text-[var(--color-text-secondary)] tabular-nums">
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
