/**
 * src/lib/dashboard-context.ts 순수 유틸 함수 테스트
 */
import {
  determineTimeContext,
  formatDate,
  formatDisplayDate,
  formatTimeUntilDeadline,
  formatVoteDeadlineDisplay,
  getCurrentWeekSunday,
  getDayOfWeek,
  getNextSunday,
  isToday,
} from '../dashboard-context';

// ─── formatVoteDeadlineDisplay ──────────────────────────────────────

describe('formatVoteDeadlineDisplay', () => {
  it('KST 오프셋 표기(+09:00) → 토요일 15:00', () => {
    expect(formatVoteDeadlineDisplay('2026-07-11T15:00:00+09:00')).toBe('토요일 15:00');
  });

  it('UTC 표기(Z) → KST로 변환해 표시한다 (서버 타임존 무관)', () => {
    // 2026-07-11T06:00:00Z = KST 토요일 15:00
    expect(formatVoteDeadlineDisplay('2026-07-11T06:00:00Z')).toBe('토요일 15:00');
  });

  it('UTC 기준 날짜가 넘어가는 경계 → KST 요일로 표시한다', () => {
    // 2026-07-11T20:00:00Z = KST 일요일 05:00
    expect(formatVoteDeadlineDisplay('2026-07-11T20:00:00Z')).toBe('일요일 5:00');
  });
});

// ─── formatDate (YYYY-MM-DD) ────────────────────────────────────────

describe('formatDate', () => {
  it('Date 객체를 YYYY-MM-DD 형식으로 변환한다', () => {
    const date = new Date('2024-03-03T12:00:00Z');
    expect(formatDate(date)).toBe('2024-03-03');
  });
});

// ─── getNextSunday ──────────────────────────────────────────────────

describe('getNextSunday', () => {
  it('일요일 입력 → 해당 일요일 반환 (당일)', () => {
    // 2024-03-03은 일요일
    const sunday = new Date('2024-03-03T12:00:00Z');
    expect(getNextSunday(sunday)).toBe('2024-03-03');
  });

  it('월요일 입력 → 다음 일요일 반환', () => {
    // 2024-03-04는 월요일
    const monday = new Date('2024-03-04T12:00:00Z');
    expect(getNextSunday(monday)).toBe('2024-03-10');
  });

  it('토요일 입력 → 다음날 일요일 반환', () => {
    // 2024-03-09는 토요일
    const saturday = new Date('2024-03-09T12:00:00Z');
    expect(getNextSunday(saturday)).toBe('2024-03-10');
  });

  it('수요일 입력 → 해당 주 일요일 반환', () => {
    // 2024-03-06은 수요일 → 다음 일요일은 3/10
    const wednesday = new Date('2024-03-06T12:00:00Z');
    expect(getNextSunday(wednesday)).toBe('2024-03-10');
  });
});

// ─── getCurrentWeekSunday ───────────────────────────────────────────

describe('getCurrentWeekSunday', () => {
  it('일요일 입력 → 당일 반환', () => {
    const sunday = new Date('2024-03-03T12:00:00Z');
    expect(getCurrentWeekSunday(sunday)).toBe('2024-03-03');
  });

  it('월요일 입력 → 지난 일요일 반환', () => {
    // 2024-03-04는 월요일 → 지난 일요일은 3/3
    const monday = new Date('2024-03-04T12:00:00Z');
    expect(getCurrentWeekSunday(monday)).toBe('2024-03-03');
  });

  it('토요일 입력 → 해당 주 일요일(지난) 반환', () => {
    // 2024-03-09는 토요일 → 지난 일요일은 3/3
    const saturday = new Date('2024-03-09T12:00:00Z');
    expect(getCurrentWeekSunday(saturday)).toBe('2024-03-03');
  });
});

// ─── getDayOfWeek ───────────────────────────────────────────────────

describe('getDayOfWeek', () => {
  it('일요일 → "일요일"', () => {
    expect(getDayOfWeek('2024-03-03')).toBe('일요일');
  });

  it('수요일 → "수요일"', () => {
    expect(getDayOfWeek('2024-03-06')).toBe('수요일');
  });

  it('토요일 → "토요일"', () => {
    expect(getDayOfWeek('2024-03-09')).toBe('토요일');
  });
});

// ─── formatDisplayDate ──────────────────────────────────────────────

describe('formatDisplayDate', () => {
  it('"YYYY-MM-DD" → "M월 D일 (요)" 형식으로 변환한다', () => {
    // 2024-03-03은 일요일
    const result = formatDisplayDate('2024-03-03');
    expect(result).toBe('3월 3일 (일)');
  });

  it('10월 이상 날짜도 올바르게 처리한다', () => {
    // 2024-12-25는 수요일
    const result = formatDisplayDate('2024-12-25');
    expect(result).toBe('12월 25일 (수)');
  });
});

// ─── isToday ────────────────────────────────────────────────────────

describe('isToday', () => {
  it('오늘 날짜 → true', () => {
    const today = formatDate(new Date());
    expect(isToday(today)).toBe(true);
  });

  it('어제 날짜 → false', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    expect(isToday(formatDate(yesterday))).toBe(false);
  });
});

// ─── formatTimeUntilDeadline ────────────────────────────────────────

describe('formatTimeUntilDeadline', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('마감 후 → "마감됨"', () => {
    jest.setSystemTime(new Date('2024-03-10T12:00:00Z'));
    expect(formatTimeUntilDeadline('2024-03-09T12:00:00Z')).toBe('마감됨');
  });

  it('2일 남음 → "2일 남음"', () => {
    jest.setSystemTime(new Date('2024-03-08T12:00:00Z'));
    expect(formatTimeUntilDeadline('2024-03-10T12:00:00Z')).toBe('2일 남음');
  });

  it('5시간 30분 남음 → "5시간 30분 남음"', () => {
    jest.setSystemTime(new Date('2024-03-10T06:30:00Z'));
    expect(formatTimeUntilDeadline('2024-03-10T12:00:00Z')).toBe('5시간 30분 남음');
  });

  it('30분 남음 → "30분 남음"', () => {
    jest.setSystemTime(new Date('2024-03-10T11:30:00Z'));
    expect(formatTimeUntilDeadline('2024-03-10T12:00:00Z')).toBe('30분 남음');
  });
});

// ─── determineTimeContext ───────────────────────────────────────────

describe('determineTimeContext', () => {
  const baseParams = {
    hasVoted: false,
    isVotePassed: false,
    hasArrangement: false,
    arrangementStatus: null as 'DRAFT' | 'SHARED' | 'CONFIRMED' | null,
    isServiceDay: false,
    hasUpcomingService: true,
  };

  it('예정된 예배 없음 → NO_UPCOMING_SERVICE', () => {
    expect(determineTimeContext({ ...baseParams, hasUpcomingService: false })).toBe(
      'NO_UPCOMING_SERVICE'
    );
  });

  it('주일 당일 → SERVICE_DAY', () => {
    expect(determineTimeContext({ ...baseParams, isServiceDay: true })).toBe('SERVICE_DAY');
  });

  it('배치표 SHARED → ARRANGEMENT_SHARED', () => {
    expect(
      determineTimeContext({
        ...baseParams,
        hasArrangement: true,
        arrangementStatus: 'SHARED',
      })
    ).toBe('ARRANGEMENT_SHARED');
  });

  it('배치표 CONFIRMED → ARRANGEMENT_SHARED', () => {
    expect(
      determineTimeContext({
        ...baseParams,
        hasArrangement: true,
        arrangementStatus: 'CONFIRMED',
      })
    ).toBe('ARRANGEMENT_SHARED');
  });

  it('투표 전 & 미투표 → VOTE_NEEDED', () => {
    expect(
      determineTimeContext({
        ...baseParams,
        hasVoted: false,
        isVotePassed: false,
      })
    ).toBe('VOTE_NEEDED');
  });

  it('투표 전 & 투표 완료 → VOTE_COMPLETED', () => {
    expect(
      determineTimeContext({
        ...baseParams,
        hasVoted: true,
        isVotePassed: false,
      })
    ).toBe('VOTE_COMPLETED');
  });

  it('투표 마감됨 → VOTE_CLOSED', () => {
    expect(
      determineTimeContext({
        ...baseParams,
        isVotePassed: true,
      })
    ).toBe('VOTE_CLOSED');
  });

  it('SERVICE_DAY는 ARRANGEMENT_SHARED보다 우선한다', () => {
    expect(
      determineTimeContext({
        ...baseParams,
        isServiceDay: true,
        hasArrangement: true,
        arrangementStatus: 'SHARED',
      })
    ).toBe('SERVICE_DAY');
  });
});
