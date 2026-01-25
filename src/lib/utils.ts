import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { Part } from "@/types";

// Tailwind CSS class merger
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Part 한글 변환
export function getPartLabel(part: Part): string {
  const labels: Record<Part, string> = {
    SOPRANO: "소프라노",
    ALTO: "알토",
    TENOR: "테너",
    BASS: "베이스",
    SPECIAL: "특별",
  };
  return labels[part];
}

// Part 색상 (Tailwind classes)
export function getPartColor(part: Part): string {
  const colors: Record<Part, string> = {
    SOPRANO: "bg-purple-100 border-purple-300 text-purple-800",
    ALTO: "bg-yellow-100 border-yellow-300 text-yellow-800",
    TENOR: "bg-blue-100 border-blue-300 text-blue-800",
    BASS: "bg-green-100 border-green-300 text-green-800",
    SPECIAL: "bg-gray-100 border-gray-300 text-gray-800",
  };
  return colors[part];
}

// Part 약어 (S, A, T, B)
export function getPartAbbreviation(part: Part | string): string {
  const abbreviations: Record<string, string> = {
    SOPRANO: "S",
    ALTO: "A",
    TENOR: "T",
    BASS: "B",
    SPECIAL: "SP",
  };
  return abbreviations[part] || part.charAt(0);
}

// 날짜 포맷
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  }).format(d);
}

// 날짜 포맷 (간단)
export function formatDateShort(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

/**
 * 테스트 계정 여부 확인
 * @test.com 도메인을 사용하는 계정은 테스트 계정으로 간주
 */
export function isTestAccount(email: string | null | undefined): boolean {
  return email?.endsWith('@test.com') ?? false;
}

/**
 * 테스트 파트장 계정에서 파트 추출
 * soprano@test.com -> SOPRANO, alto@test.com -> ALTO 등
 */
export function getTestAccountPart(email: string): Part | null {
  const partMap: Record<string, Part> = {
    'soprano': 'SOPRANO',
    'alto': 'ALTO',
    'tenor': 'TENOR',
    'bass': 'BASS',
  };

  const prefix = email.split('@')[0].toLowerCase();
  return partMap[prefix] || null;
}
