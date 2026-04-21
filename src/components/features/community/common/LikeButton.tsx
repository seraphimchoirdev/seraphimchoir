'use client';

import { Heart } from 'lucide-react';

import { useToggleLike } from '@/hooks/usePosts';
import { showError } from '@/lib/toast';

interface LikeButtonProps {
  postId: string;
  isLiked: boolean;
  likeCount: number;
}

export default function LikeButton({
  postId,
  isLiked,
  likeCount,
}: LikeButtonProps) {
  const toggleLike = useToggleLike();

  const handleLike = async () => {
    try {
      await toggleLike.mutateAsync(postId);
    } catch {
      showError('좋아요 처리에 실패했습니다.');
    }
  };

  return (
    <button
      onClick={handleLike}
      disabled={toggleLike.isPending}
      className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-base transition-colors ${
        isLiked
          ? 'bg-[var(--color-error-100)] text-[var(--color-error-600)]'
          : 'bg-[var(--color-background-secondary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-background-tertiary)]'
      }`}
    >
      <Heart className={`h-5 w-5 ${isLiked ? 'fill-current' : ''}`} />
      {likeCount > 0 && likeCount}
    </button>
  );
}
