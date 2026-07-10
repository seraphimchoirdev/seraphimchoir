/**
 * 출석 투표 마감 시각 계산 (클라이언트/서버 공용 순수 함수)
 *
 * 주의: 실행 환경의 로컬 타임존에 의존하지 않도록 모든 시각을
 * 명시적 KST(+09:00) 오프셋으로 계산한다.
 * (브라우저는 KST지만 Vercel 서버는 UTC — setHours() 방식은 서버에서 9시간 어긋남)
 */

/** 'YYYY-MM-DD'에서 n일 전 날짜 문자열 반환 (타임존 무관) */
function shiftDateString(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** 등단 투표 마감: 예배 전날(토요일) 15:00 KST */
export function getServiceDeadline(serviceDate: string): Date {
  const saturday = shiftDateString(serviceDate, -1);
  return new Date(`${saturday}T15:00:00+09:00`);
}

/** 연습 참석 투표 마감: 연습 시작 10분 전 KST (폴백: 당일 09:00 KST) */
export function getPracticeDeadline(
  serviceDate: string,
  postPracticeStartTime?: string | null
): Date {
  if (postPracticeStartTime) {
    // 'HH:MM' 또는 'HH:MM:SS' 형태 지원
    const [h, m] = postPracticeStartTime.split(':');
    const start = new Date(
      `${serviceDate}T${h.padStart(2, '0')}:${(m ?? '00').padStart(2, '0')}:00+09:00`
    );
    start.setMinutes(start.getMinutes() - 10);
    return start;
  }
  return new Date(`${serviceDate}T09:00:00+09:00`);
}

/** 마감 여부 확인 */
export function isDeadlinePassed(deadline: Date): boolean {
  return new Date() > deadline;
}
