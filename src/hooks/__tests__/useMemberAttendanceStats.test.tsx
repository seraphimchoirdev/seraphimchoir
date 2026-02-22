/**
 * useMemberAttendanceStats 테스트
 */
import { createTestQueryWrapper } from '@/__tests__/helpers/query-wrapper';
import { renderHook, waitFor } from '@testing-library/react';

import { useMemberAttendanceStats } from '../useMemberAttendanceStats';

global.fetch = jest.fn();

const START_DATE = '2025-01-01';
const END_DATE = '2025-03-31';

describe('useMemberAttendanceStats', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('정상 조회 → 데이터 반환', async () => {
    const mockData = {
      members: [
        { memberId: 'm-1', memberName: '홍길동', attendanceRate: 90 },
        { memberId: 'm-2', memberName: '김철수', attendanceRate: 80 },
      ],
      total: 2,
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockData,
    });

    const { result } = renderHook(
      () => useMemberAttendanceStats({ startDate: START_DATE, endDate: END_DATE }),
      { wrapper: createTestQueryWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockData);
    const calledUrl = (global.fetch as jest.Mock).mock.calls[0][0] as string;
    expect(calledUrl).toContain('start_date=2025-01-01');
    expect(calledUrl).toContain('end_date=2025-03-31');
    expect(calledUrl).toContain('sort_by=attendance_rate');
    expect(calledUrl).toContain('order=desc');
  });

  it('part 필터 적용', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ members: [], total: 0 }),
    });

    const { result } = renderHook(
      () =>
        useMemberAttendanceStats({
          startDate: START_DATE,
          endDate: END_DATE,
          part: 'SOPRANO',
        }),
      { wrapper: createTestQueryWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const calledUrl = (global.fetch as jest.Mock).mock.calls[0][0] as string;
    expect(calledUrl).toContain('part=SOPRANO');
  });

  it('API 에러 처리', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: '통계 조회 실패' }),
    });

    const { result } = renderHook(
      () => useMemberAttendanceStats({ startDate: START_DATE, endDate: END_DATE }),
      { wrapper: createTestQueryWrapper() }
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toContain('통계');
  });

  it('startDate 빈값 → 비활성화', () => {
    const { result } = renderHook(
      () => useMemberAttendanceStats({ startDate: '', endDate: END_DATE }),
      { wrapper: createTestQueryWrapper() }
    );

    expect(result.current.fetchStatus).toBe('idle');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('endDate 빈값 → 비활성화', () => {
    const { result } = renderHook(
      () => useMemberAttendanceStats({ startDate: START_DATE, endDate: '' }),
      { wrapper: createTestQueryWrapper() }
    );

    expect(result.current.fetchStatus).toBe('idle');
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
