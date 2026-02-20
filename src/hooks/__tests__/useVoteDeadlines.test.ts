/**
 * useVoteDeadlines 순수 유틸 함수 테스트
 *
 * Hook 자체는 Supabase client를 직접 사용하므로 모킹이 복잡합니다.
 * 대신, 하단에 export된 순수 유틸 함수 4개를 테스트합니다.
 * 이들은 모킹 불필요하고 ROI가 높습니다.
 */
import {
  getDefaultDeadline,
  getPracticeDeadline,
  getServiceDeadline,
  getTimeUntilDeadline,
  isDeadlinePassed,
} from '../useVoteDeadlines';

describe('getDefaultDeadline', () => {
  it('일요일 예배 -> 해당 주 금요일 18:00 반환', () => {
    // 2024-03-03은 일요일
    const result = getDefaultDeadline('2024-03-03');

    expect(result.getDay()).toBe(5); // 금요일
    expect(result.getHours()).toBe(18);
    expect(result.getMinutes()).toBe(0);
    // 3월 3일(일) - 2일 = 3월 1일(금)
    expect(result.getDate()).toBe(1);
  });

  it('토요일 예배 -> 올바른 금요일 계산', () => {
    // 2024-03-02는 토요일
    const result = getDefaultDeadline('2024-03-02');

    expect(result.getDay()).toBe(5); // 금요일
    expect(result.getHours()).toBe(18);
    // 토요일(day=6): date - (6-5) = date - 1 = 3월 1일(금)
    expect(result.getDate()).toBe(1);
  });

  it('수요일 예배 -> 올바른 금요일 계산', () => {
    // 2024-03-06은 수요일
    const result = getDefaultDeadline('2024-03-06');

    expect(result.getDay()).toBe(5); // 금요일
    expect(result.getHours()).toBe(18);
    // 수요일(day=3): date - (3-5) = date + 2 = 3월 8일(금)
    expect(result.getDate()).toBe(8);
  });
});

describe('getServiceDeadline', () => {
  it('주일 예배 -> 토요일 15:00 반환', () => {
    // 2024-03-03은 일요일
    const result = getServiceDeadline('2024-03-03');

    expect(result.getDay()).toBe(6); // 토요일
    expect(result.getHours()).toBe(15);
    expect(result.getMinutes()).toBe(0);
    // 3월 3일 - 1일 = 3월 2일(토)
    expect(result.getDate()).toBe(2);
  });
});

describe('getPracticeDeadline', () => {
  it('주일 예배 -> 당일 09:00 반환', () => {
    // 2024-03-03은 일요일
    const result = getPracticeDeadline('2024-03-03');

    expect(result.getDate()).toBe(3);
    expect(result.getHours()).toBe(9);
    expect(result.getMinutes()).toBe(0);
  });
});

describe('isDeadlinePassed', () => {
  it('과거 시간 -> true', () => {
    const pastDate = new Date('2020-01-01T00:00:00');
    expect(isDeadlinePassed(pastDate)).toBe(true);
  });

  it('미래 시간 -> false', () => {
    const futureDate = new Date('2099-12-31T23:59:59');
    expect(isDeadlinePassed(futureDate)).toBe(false);
  });
});

describe('getTimeUntilDeadline', () => {
  it('마감 지남 -> isPassed=true, 0/0/0', () => {
    const pastDeadline = '2020-01-01T00:00:00Z';
    const result = getTimeUntilDeadline(pastDeadline);

    expect(result.isPassed).toBe(true);
    expect(result.days).toBe(0);
    expect(result.hours).toBe(0);
    expect(result.minutes).toBe(0);
  });

  it('남은 시간 계산 정확성', () => {
    // 현재 시간에서 1일 2시간 30분 후를 마감으로 설정
    const now = new Date();
    const deadline = new Date(
      now.getTime() + 1 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000 + 30 * 60 * 1000
    );

    const result = getTimeUntilDeadline(deadline.toISOString());

    expect(result.isPassed).toBe(false);
    expect(result.days).toBe(1);
    expect(result.hours).toBe(2);
    // 분은 반올림/절사 차이로 29 또는 30 가능
    expect(result.minutes).toBeGreaterThanOrEqual(29);
    expect(result.minutes).toBeLessThanOrEqual(30);
  });
});
