import type { Database } from '@/types/database.types';

type Part = Database['public']['Enums']['part'];

interface MemberAvatarProps {
  name: string;
  part: Part;
  size?: 'sm' | 'md' | 'lg';
}

// 파트별 아바타 배경색 (UXUI_DESIGN_SYSTEM.md 기준)
const PART_AVATAR_COLORS: Partial<Record<Part, string>> = {
  SOPRANO: 'bg-purple-400',
  ALTO: 'bg-yellow-400',
  TENOR: 'bg-blue-400',
  BASS: 'bg-green-500',
};

// 크기별 스타일
const SIZE_CLASSES = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
};

/**
 * MemberAvatar 컴포넌트
 * 찬양대원의 이니셜과 파트별 색상을 표시하는 아바타
 */
export default function MemberAvatar({ name, part, size = 'md' }: MemberAvatarProps) {
  // 이니셜 추출 (첫 글자)
  const initial = name.charAt(0).toUpperCase();

  return (
    <div
      className={`
        ${SIZE_CLASSES[size]}
        ${PART_AVATAR_COLORS[part]}
        rounded-full
        flex items-center justify-center
        text-white font-semibold
        shadow-sm
      `}
      aria-label={`${name}의 아바타`}
    >
      {initial}
    </div>
  );
}
