'use client';

import { Image } from 'lucide-react';

export default function AlbumsPage() {
  return (
    <div className="py-12 text-center">
      <Image className="mx-auto mb-4 h-12 w-12 text-[var(--color-text-tertiary)]" />
      <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">
        사진첩
      </h2>
      <p className="mt-2 text-base text-[var(--color-text-secondary)]">
        곧 제공될 예정입니다.
      </p>
    </div>
  );
}
