/**
 * src/lib/utils.ts 순수 유틸 함수 테스트
 */
import { Part } from '@/types';

import {
  cn,
  formatDate,
  formatDateShort,
  getPartAbbreviation,
  getPartColor,
  getPartLabel,
  getTestAccountPart,
  isTestAccount,
} from '../utils';

// ─── cn (Tailwind class merge) ──────────────────────────────────────

describe('cn', () => {
  it('여러 클래스를 병합한다', () => {
    expect(cn('px-2', 'py-1')).toBe('px-2 py-1');
  });

  it('충돌하는 Tailwind 클래스를 올바르게 머지한다', () => {
    // twMerge는 마지막 값을 우선
    expect(cn('px-2', 'px-4')).toBe('px-4');
  });

  it('falsy 값을 무시한다', () => {
    expect(cn('px-2', false && 'hidden', undefined, null, 'py-1')).toBe('px-2 py-1');
  });
});

// ─── getPartLabel ───────────────────────────────────────────────────

describe('getPartLabel', () => {
  const cases: Array<[Part, string]> = [
    ['SOPRANO', '소프라노'],
    ['ALTO', '알토'],
    ['TENOR', '테너'],
    ['BASS', '베이스'],
    ['SPECIAL', '특별'],
  ];

  it.each(cases)('%s → %s', (part, expected) => {
    expect(getPartLabel(part)).toBe(expected);
  });
});

// ─── getPartColor ───────────────────────────────────────────────────

describe('getPartColor', () => {
  const allParts: Part[] = ['SOPRANO', 'ALTO', 'TENOR', 'BASS', 'SPECIAL'];

  it.each(allParts)('%s에 대해 bg/border/text 클래스를 반환한다', (part) => {
    const result = getPartColor(part);
    expect(result).toContain('bg-');
    expect(result).toContain('border-');
    expect(result).toContain('text-');
  });
});

// ─── getPartAbbreviation ────────────────────────────────────────────

describe('getPartAbbreviation', () => {
  it.each([
    ['SOPRANO', 'S'],
    ['ALTO', 'A'],
    ['TENOR', 'T'],
    ['BASS', 'B'],
    ['SPECIAL', 'SP'],
  ] as const)('%s → %s', (part, expected) => {
    expect(getPartAbbreviation(part)).toBe(expected);
  });

  it('알 수 없는 파트는 첫 글자를 반환한다', () => {
    expect(getPartAbbreviation('UNKNOWN')).toBe('U');
  });
});

// ─── formatDate ─────────────────────────────────────────────────────

describe('formatDate', () => {
  it('Date 객체를 한국어 날짜 문자열로 포맷한다', () => {
    const result = formatDate(new Date('2024-03-03'));
    // Intl.DateTimeFormat('ko-KR') → "2024년 3월 3일 (일)"과 유사
    expect(result).toContain('2024');
    expect(result).toContain('3');
  });

  it('문자열 날짜를 파싱하여 포맷한다', () => {
    const result = formatDate('2024-12-25');
    expect(result).toContain('2024');
    expect(result).toContain('12');
    expect(result).toContain('25');
  });
});

// ─── formatDateShort ────────────────────────────────────────────────

describe('formatDateShort', () => {
  it('Date 객체를 간단한 날짜 문자열로 포맷한다', () => {
    const result = formatDateShort(new Date('2024-03-03'));
    expect(result).toContain('2024');
  });

  it('문자열 날짜를 파싱하여 간단한 포맷으로 변환한다', () => {
    const result = formatDateShort('2024-12-25');
    expect(result).toContain('2024');
  });
});

// ─── isTestAccount ──────────────────────────────────────────────────

describe('isTestAccount', () => {
  it('@test.com 이메일은 true', () => {
    expect(isTestAccount('admin@test.com')).toBe(true);
  });

  it('일반 이메일은 false', () => {
    expect(isTestAccount('user@gmail.com')).toBe(false);
  });

  it('null → false', () => {
    expect(isTestAccount(null)).toBe(false);
  });

  it('undefined → false', () => {
    expect(isTestAccount(undefined)).toBe(false);
  });
});

// ─── getTestAccountPart ─────────────────────────────────────────────

describe('getTestAccountPart', () => {
  it.each([
    ['soprano@test.com', 'SOPRANO'],
    ['alto@test.com', 'ALTO'],
    ['tenor@test.com', 'TENOR'],
    ['bass@test.com', 'BASS'],
  ] as const)('%s → %s', (email, expected) => {
    expect(getTestAccountPart(email)).toBe(expected);
  });

  it('매핑되지 않는 이메일은 null', () => {
    expect(getTestAccountPart('admin@test.com')).toBeNull();
  });

  it('대소문자 혼합 프리픽스도 올바르게 처리한다', () => {
    expect(getTestAccountPart('SOPRANO@test.com')).toBe('SOPRANO');
  });
});
