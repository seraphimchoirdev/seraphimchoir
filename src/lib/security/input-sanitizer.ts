/**
 * Input Sanitization 유틸리티
 *
 * XSS(Cross-Site Scripting) 공격 방어를 위한 입력 데이터 검증 및 정제
 */

/**
 * HTML 태그 제거 (HTML 허용하지 않는 필드용)
 *
 * @example
 * stripHtml('<script>alert("XSS")</script>Hello') // "Hello"
 * stripHtml('Normal text') // "Normal text"
 */
export function stripHtml(input: string): string {
  if (!input) return '';
  // HTML 태그 및 엔티티 제거
  return input
    .replace(/<[^>]*>/g, '') // HTML 태그 제거
    .replace(/&[a-zA-Z]+;/g, '') // HTML 엔티티 제거 (&lt;, &gt; 등)
    .trim();
}

/**
 * HTML 특수문자 이스케이프 (XSS 방어)
 *
 * @example
 * escapeHtml('<script>alert("XSS")</script>')
 * // "&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;"
 */
export function escapeHtml(input: string): string {
  if (!input) return '';
  const htmlEscapeMap: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };
  return input.replace(/[&<>"'/]/g, (char) => htmlEscapeMap[char] || char);
}

/**
 * SQL Injection 위험 문자 제거
 * (Supabase 사용으로 대부분 안전하지만 추가 방어층)
 *
 * @example
 * sanitizeSqlInput("'; DROP TABLE users--") // " DROP TABLE users"
 */
export function sanitizeSqlInput(input: string): string {
  if (!input) return '';
  // SQL 주입 위험 문자 제거
  return input
    .replace(/['";\\]/g, '') // 따옴표, 세미콜론, 백슬래시 제거
    .replace(/--/g, '') // SQL 주석 제거
    .replace(/\/\*/g, '') // 블록 주석 시작 제거
    .replace(/\*\//g, '') // 블록 주석 끝 제거
    .trim();
}

/**
 * 이메일 검증 및 정규화
 *
 * @example
 * sanitizeEmail('  User@Example.COM  ') // "user@example.com"
 * sanitizeEmail('invalid@') // null (잘못된 형식)
 */
export function sanitizeEmail(input: string): string | null {
  if (!input) return null;

  const trimmed = input.trim().toLowerCase();

  // 간단한 이메일 형식 검증
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmed)) {
    return null;
  }

  return trimmed;
}

/**
 * URL 검증 및 프로토콜 확인 (javascript:, data: 등 위험한 프로토콜 차단)
 *
 * @example
 * sanitizeUrl('https://example.com') // "https://example.com"
 * sanitizeUrl('javascript:alert("XSS")') // null (위험한 프로토콜)
 */
export function sanitizeUrl(input: string): string | null {
  if (!input) return null;

  const trimmed = input.trim();

  // 위험한 프로토콜 차단
  const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:'];
  const lowerUrl = trimmed.toLowerCase();

  for (const protocol of dangerousProtocols) {
    if (lowerUrl.startsWith(protocol)) {
      return null;
    }
  }

  // 안전한 프로토콜만 허용 (http, https, mailto)
  const safeProtocolRegex = /^(https?:\/\/|mailto:)/i;
  if (!safeProtocolRegex.test(trimmed) && !trimmed.startsWith('/')) {
    // 상대 경로가 아니고 안전한 프로토콜도 아니면 차단
    return null;
  }

  return trimmed;
}

/**
 * 전화번호 정규화 (숫자와 하이픈만 허용)
 *
 * @example
 * sanitizePhoneNumber('010-1234-5678') // "010-1234-5678"
 * sanitizePhoneNumber('010)1234(5678') // "01012345678"
 */
export function sanitizePhoneNumber(input: string): string {
  if (!input) return '';
  // 숫자와 하이픈만 남기기
  return input.replace(/[^0-9-]/g, '').trim();
}

/**
 * 텍스트 길이 제한 (DDoS 방어: 너무 긴 입력 차단)
 *
 * @example
 * limitTextLength('Very long text...', 10) // "Very long "
 */
export function limitTextLength(input: string, maxLength: number): string {
  if (!input) return '';
  return input.slice(0, maxLength);
}

/**
 * 찬양대원 이름 sanitization (한글, 영문, 공백만 허용)
 *
 * @example
 * sanitizeMemberName('홍길동') // "홍길동"
 * sanitizeMemberName('John Doe') // "John Doe"
 * sanitizeMemberName('<script>alert</script>홍길동') // "홍길동"
 */
export function sanitizeMemberName(input: string): string {
  if (!input) return '';
  // 한글, 영문, 공백만 허용
  return input
    .replace(/[^가-힣a-zA-Z\s]/g, '')
    .trim()
    .slice(0, 50); // 최대 50자
}

/**
 * 안전한 텍스트 필드 sanitization (일반 텍스트 notes 등)
 * HTML 태그는 제거하지만 기본 텍스트는 보존
 *
 * @example
 * sanitizeTextNote('안녕하세요 <script>alert("XSS")</script>')
 * // "안녕하세요 "
 */
export function sanitizeTextNote(input: string, maxLength: number = 1000): string {
  if (!input) return '';
  return stripHtml(input).slice(0, maxLength).trim();
}

/**
 * Zod 스키마와 함께 사용할 수 있는 sanitizer 체인
 *
 * @example
 * const schema = z.object({
 *   name: z.string().transform(sanitizeMemberName),
 *   email: z.string().transform(v => sanitizeEmail(v) || ''),
 *   notes: z.string().transform(sanitizeTextNote),
 * });
 */
export const sanitizers = {
  stripHtml,
  escapeHtml,
  sanitizeSqlInput,
  sanitizeEmail,
  sanitizeUrl,
  sanitizePhoneNumber,
  limitTextLength,
  sanitizeMemberName,
  sanitizeTextNote,
} as const;
