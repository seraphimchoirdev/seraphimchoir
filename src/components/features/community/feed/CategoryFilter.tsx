'use client';

import type { FeedCategory } from '@/types/community';

const CATEGORIES: Array<{ value: FeedCategory | 'all'; label: string }> = [
  { value: 'all', label: '전체' },
  { value: 'daily', label: '일상' },
  { value: 'prayer', label: '기도요청' },
  { value: 'performance', label: '공연소식' },
  { value: 'celebration', label: '경조사' },
  { value: 'sharing', label: '나눔' },
];

interface CategoryFilterProps {
  selected: FeedCategory | 'all';
  onChange: (category: FeedCategory | 'all') => void;
}

export default function CategoryFilter({
  selected,
  onChange,
}: CategoryFilterProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
      {CATEGORIES.map((cat) => (
        <button
          key={cat.value}
          onClick={() => onChange(cat.value)}
          className={`shrink-0 rounded-full px-4 py-2 text-base font-medium transition-colors ${
            selected === cat.value
              ? 'bg-[var(--color-primary-600)] text-white'
              : 'bg-[var(--color-background-secondary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-background-tertiary)]'
          }`}
        >
          {cat.label}
        </button>
      ))}
    </div>
  );
}

export { CATEGORIES };
