'use client';

import { Badge } from '@/components/ui/badge';

import type { PostAuthor } from '@/types/community';

const PART_LABELS: Record<string, string> = {
  SOPRANO: '소프라노',
  ALTO: '알토',
  TENOR: '테너',
  BASS: '베이스',
  SPECIAL: '특별',
};

const PART_COLORS: Record<string, string> = {
  SOPRANO: 'bg-pink-100 text-pink-700 border-pink-200',
  ALTO: 'bg-purple-100 text-purple-700 border-purple-200',
  TENOR: 'bg-blue-100 text-blue-700 border-blue-200',
  BASS: 'bg-green-100 text-green-700 border-green-200',
};

interface AuthorBadgeProps {
  author: PostAuthor | null;
  size?: 'sm' | 'md';
  showPart?: boolean;
}

export default function AuthorBadge({
  author,
  size = 'md',
  showPart = true,
}: AuthorBadgeProps) {
  if (!author) {
    return (
      <span className="text-[var(--color-text-tertiary)]">알 수 없음</span>
    );
  }

  const textSize = size === 'sm' ? 'text-sm' : 'text-base';

  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`font-medium text-[var(--color-text-primary)] ${textSize}`}>
        {author.name}
      </span>
      {showPart && author.part && (
        <Badge
          className={`text-[11px] px-1.5 py-0 leading-5 ${PART_COLORS[author.part] || ''}`}
        >
          {PART_LABELS[author.part] || author.part}
        </Badge>
      )}
    </span>
  );
}
