/**
 * useVoteDeadlines 테스트
 *
 * - 하단 순수 유틸 함수 5개: 모킹 불필요
 * - Hook 함수 7개: @/lib/supabase/client의 createClient 모킹 필요
 */
import { renderHook, waitFor } from '@testing-library/react';

import { createMockQueryBuilder } from '@/__mocks__/supabase-helpers';
import { createTestQueryWrapper } from '@/__tests__/helpers/query-wrapper';

import {
  getDefaultDeadline,
  getPracticeDeadline,
  getServiceDeadline,
  getTimeUntilDeadline,
  isDeadlinePassed,
  useDeleteVoteDeadline,
  useIsVoteDeadlinePassed,
  useSetVoteDeadline,
  useUpcomingVoteDeadlines,
  useVoteDeadline,
  useVoteDeadlines,
} from '../useVoteDeadlines';

// ─── Supabase Client 모킹 ─────────────────────────────────────
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(),
}));

import { createClient } from '@/lib/supabase/client';
const mockCreateClient = createClient as jest.Mock;

function setupMockClient(overrides: {
  fromBuilder?: ReturnType<typeof createMockQueryBuilder>;
  rpcData?: unknown;
  rpcError?: { message: string } | null;
  authUser?: { id: string } | null;
} = {}) {
  const fromBuilder = overrides.fromBuilder ?? createMockQueryBuilder({
    selectData: [],
  });

  const mockClient = {
    from: jest.fn().mockReturnValue(fromBuilder),
    rpc: jest.fn().mockResolvedValue({
      data: overrides.rpcData ?? null,
      error: overrides.rpcError ?? null,
    }),
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: overrides.authUser ?? { id: 'test-user-id' } },
        error: null,
      }),
    },
  };

  mockCreateClient.mockReturnValue(mockClient);
  return mockClient;
}

beforeEach(() => {
  jest.clearAllMocks();
});

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
    // 2024-03-03(일) 전날인 3월 2일(토) 15:00 KST = 06:00 UTC
    const result = getServiceDeadline('2024-03-03');

    expect(result.toISOString()).toBe('2024-03-02T06:00:00.000Z');
  });
});

describe('getPracticeDeadline', () => {
  // 실행 환경 타임존에 의존하지 않도록 UTC 순간(toISOString)으로 비교한다
  it('연습 시작 시각 명시 -> 시작 시각 그대로 반환 (버퍼 없음)', () => {
    // 2024-03-03은 일요일, 연습 시작 10:30 KST = 01:30 UTC
    const result = getPracticeDeadline('2024-03-03', '10:30:00');

    expect(result.toISOString()).toBe('2024-03-03T01:30:00.000Z');
  });

  it("'HH:MM' 단축 형식도 동일하게 처리한다", () => {
    const result = getPracticeDeadline('2024-03-03', '10:30');

    expect(result.toISOString()).toBe('2024-03-03T01:30:00.000Z');
  });

  it('시작 시각 미상 -> 당일 09:00 KST 폴백', () => {
    const result = getPracticeDeadline('2024-03-03');

    expect(result.toISOString()).toBe('2024-03-03T00:00:00.000Z');
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

// ═══════════════════════════════════════════════════════════════
// Hook 함수 테스트 (Supabase Client 모킹)
// ═══════════════════════════════════════════════════════════════

describe('useVoteDeadline', () => {
  it('serviceDate로 마감 정보 조회 성공', async () => {
    const mockDeadline = {
      id: 'dl-1',
      service_date: '2026-03-01',
      deadline_at: '2026-02-28T15:00:00Z',
      created_by: 'user-1',
      created_at: '2026-02-20T00:00:00Z',
    };

    setupMockClient({
      fromBuilder: createMockQueryBuilder({ selectData: mockDeadline }),
    });

    const { result } = renderHook(() => useVoteDeadline('2026-03-01'), {
      wrapper: createTestQueryWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockDeadline);
  });

  it('serviceDate 빈 문자열 → 비활성화', () => {
    setupMockClient();

    const { result } = renderHook(() => useVoteDeadline(''), {
      wrapper: createTestQueryWrapper(),
    });

    // enabled: !!serviceDate → false → fetchStatus가 idle
    expect(result.current.fetchStatus).toBe('idle');
  });
});

describe('useVoteDeadlines (목록)', () => {
  it('목록 조회 성공', async () => {
    const mockList = [
      { id: 'dl-1', service_date: '2026-03-01', deadline_at: '2026-02-28T15:00:00Z', created_by: null, created_at: '2026-02-20' },
      { id: 'dl-2', service_date: '2026-03-08', deadline_at: '2026-03-07T15:00:00Z', created_by: null, created_at: '2026-02-20' },
    ];

    setupMockClient({
      fromBuilder: createMockQueryBuilder({ selectData: mockList }),
    });

    const { result } = renderHook(() => useVoteDeadlines(), {
      wrapper: createTestQueryWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockList);
  });
});

describe('useUpcomingVoteDeadlines', () => {
  it('RPC 호출 성공', async () => {
    const mockUpcoming = [
      { service_date: '2026-03-01', deadline_at: '2026-02-28T15:00:00Z', is_passed: false },
    ];

    setupMockClient({ rpcData: mockUpcoming });

    const { result } = renderHook(() => useUpcomingVoteDeadlines(5), {
      wrapper: createTestQueryWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockUpcoming);
  });
});

describe('useIsVoteDeadlinePassed', () => {
  it('RPC 결과 반환', async () => {
    setupMockClient({ rpcData: true });

    const { result } = renderHook(() => useIsVoteDeadlinePassed('2026-03-01'), {
      wrapper: createTestQueryWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBe(true);
  });

  it('serviceDate 빈 → 비활성화', () => {
    setupMockClient();

    const { result } = renderHook(() => useIsVoteDeadlinePassed(''), {
      wrapper: createTestQueryWrapper(),
    });

    expect(result.current.fetchStatus).toBe('idle');
  });
});

describe('useSetVoteDeadline', () => {
  it('upsert 성공', async () => {
    const mockResult = {
      id: 'dl-new',
      service_date: '2026-03-01',
      deadline_at: '2026-02-28T18:00:00Z',
    };

    setupMockClient({
      fromBuilder: createMockQueryBuilder({ upsertData: mockResult }),
    });

    const { result } = renderHook(() => useSetVoteDeadline(), {
      wrapper: createTestQueryWrapper(),
    });

    result.current.mutate({
      serviceDate: '2026-03-01',
      deadlineAt: '2026-02-28T18:00:00Z',
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe('useDeleteVoteDeadline', () => {
  it('삭제 성공', async () => {
    setupMockClient({
      fromBuilder: createMockQueryBuilder({ deleteData: null }),
    });

    const { result } = renderHook(() => useDeleteVoteDeadline(), {
      wrapper: createTestQueryWrapper(),
    });

    result.current.mutate('2026-03-01');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});
