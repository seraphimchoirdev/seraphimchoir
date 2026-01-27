/**
 * 대시보드 시간 컨텍스트 유틸리티
 *
 * 현재 시점에 따라 대시보드에서 보여줄 내용을 결정합니다.
 */

export type TimeContext =
  | 'VOTE_NEEDED' // 투표 마감 전 & 미투표
  | 'VOTE_COMPLETED' // 투표 마감 전 & 투표 완료
  | 'VOTE_CLOSED' // 투표 마감됨
  | 'ARRANGEMENT_SHARED' // 배치표 공유됨
  | 'SERVICE_DAY' // 주일 당일
  | 'NO_UPCOMING_SERVICE'; // 예정된 예배 없음

export interface DashboardContext {
  timeContext: TimeContext;
  nextServiceDate: string | null; // YYYY-MM-DD
  nextServiceInfo: {
    date: string;
    dayOfWeek: string;
    serviceType: string | null;
    hymnName: string | null;
    hoodColor: string | null;
    serviceStartTime: string | null;
    prePracticeStartTime: string | null;
  } | null;
  voteDeadline: string | null; // ISO 8601
  voteDeadlineDisplay: string | null; // 표시용 (예: "금요일 18:00")
  isVotePassed: boolean;
  hasArrangement: boolean;
  arrangementStatus: 'DRAFT' | 'SHARED' | 'CONFIRMED' | null;
}

/**
 * 다음 주일 날짜 계산
 * @param from 기준 날짜 (기본: 현재)
 * @returns YYYY-MM-DD 형식의 다음 주일
 */
export function getNextSunday(from: Date = new Date()): string {
  const date = new Date(from);
  const day = date.getDay(); // 0 = 일요일

  if (day === 0) {
    // 오늘이 일요일이면 오늘 반환
    return formatDate(date);
  }

  // 다음 일요일까지 남은 일수
  const daysUntilSunday = 7 - day;
  date.setDate(date.getDate() + daysUntilSunday);

  return formatDate(date);
}

/**
 * 이번 주일 날짜 계산 (지난 일요일 포함)
 * 일~토 사이에 호출하면 해당 주의 일요일을 반환
 */
export function getCurrentWeekSunday(from: Date = new Date()): string {
  const date = new Date(from);
  const day = date.getDay();

  // 일요일(0)이면 오늘, 아니면 지난 일요일
  if (day !== 0) {
    date.setDate(date.getDate() - day);
  }

  return formatDate(date);
}

/**
 * 날짜를 YYYY-MM-DD 형식으로 포맷
 */
export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * 날짜를 한국어 요일로 변환
 */
export function getDayOfWeek(dateStr: string): string {
  const days = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
  const date = new Date(dateStr);
  return days[date.getDay()];
}

/**
 * 날짜를 표시용 문자열로 변환 (예: "1월 26일 (일)")
 */
export function formatDisplayDate(dateStr: string): string {
  const date = new Date(dateStr);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const dayOfWeek = getDayOfWeek(dateStr);

  return `${month}월 ${day}일 (${dayOfWeek.charAt(0)})`;
}

/**
 * 오늘이 해당 날짜인지 확인
 */
export function isToday(dateStr: string): boolean {
  const today = formatDate(new Date());
  return today === dateStr;
}

/**
 * 마감 시간까지 남은 시간을 표시용 문자열로 변환
 */
export function formatTimeUntilDeadline(deadlineAt: string): string {
  const deadline = new Date(deadlineAt);
  const now = new Date();
  const diff = deadline.getTime() - now.getTime();

  if (diff <= 0) {
    return '마감됨';
  }

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    return `${days}일 남음`;
  }

  if (hours > 0) {
    return `${hours}시간 ${minutes}분 남음`;
  }

  return `${minutes}분 남음`;
}

/**
 * 시간 컨텍스트 결정
 */
export function determineTimeContext(params: {
  hasVoted: boolean;
  isVotePassed: boolean;
  hasArrangement: boolean;
  arrangementStatus: 'DRAFT' | 'SHARED' | 'CONFIRMED' | null;
  isServiceDay: boolean;
  hasUpcomingService: boolean;
}): TimeContext {
  const { hasVoted, isVotePassed, hasArrangement, arrangementStatus, isServiceDay, hasUpcomingService } =
    params;

  if (!hasUpcomingService) {
    return 'NO_UPCOMING_SERVICE';
  }

  if (isServiceDay) {
    return 'SERVICE_DAY';
  }

  // 배치표가 공유됨/확정됨 상태면 최우선
  if (hasArrangement && (arrangementStatus === 'SHARED' || arrangementStatus === 'CONFIRMED')) {
    return 'ARRANGEMENT_SHARED';
  }

  // 투표 마감 전
  if (!isVotePassed) {
    return hasVoted ? 'VOTE_COMPLETED' : 'VOTE_NEEDED';
  }

  // 투표 마감됨
  return 'VOTE_CLOSED';
}
