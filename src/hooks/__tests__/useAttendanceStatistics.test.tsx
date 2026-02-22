/**
 * useAttendanceStatistics / usePartAttendanceStatistics /
 * useMemberAttendanceHistory / useAttendanceSummaryByDate 테스트
 */
import { createTestQueryWrapper } from '@/__tests__/helpers/query-wrapper';
import { renderHook, waitFor } from '@testing-library/react';

import {
  useAttendanceStatistics,
  useAttendanceSummaryByDate,
  useMemberAttendanceHistory,
  usePartAttendanceStatistics,
} from '../useAttendanceStatistics';

// fetch 모킹
global.fetch = jest.fn();

const START_DATE = '2024-01-01';
const END_DATE = '2024-03-31';

describe('useAttendanceStatistics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('전체 통계 조회 성공', async () => {
    const mockStats = {
      total_records: 100,
      available_count: 85,
      attendance_rate: 85.0,
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockStats,
    });

    const { result } = renderHook(() => useAttendanceStatistics(START_DATE, END_DATE), {
      wrapper: createTestQueryWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockStats);
    const calledUrl = (global.fetch as jest.Mock).mock.calls[0][0] as string;
    expect(calledUrl).toContain('start_date=2024-01-01');
    expect(calledUrl).toContain('end_date=2024-03-31');
    expect(calledUrl).toContain('type=overall');
  });

  it('에러 응답 시 isError === true', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: '출석 통계 조회 실패' }),
    });

    const { result } = renderHook(() => useAttendanceStatistics(START_DATE, END_DATE), {
      wrapper: createTestQueryWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toContain('출석 통계 조회 실패');
  });

  it('startDate 빈 문자열 → 비활성화', () => {
    const { result } = renderHook(() => useAttendanceStatistics('', END_DATE), {
      wrapper: createTestQueryWrapper(),
    });

    expect(result.current.fetchStatus).toBe('idle');
    expect(global.fetch).not.toHaveBeenCalled();
  });
});

describe('usePartAttendanceStatistics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('파트별 통계 조회 성공', async () => {
    const mockPartStats = [
      { part: 'SOPRANO', total: 30, available: 25, attendance_rate: 83.3 },
      { part: 'ALTO', total: 25, available: 22, attendance_rate: 88.0 },
    ];

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockPartStats,
    });

    const { result } = renderHook(() => usePartAttendanceStatistics(START_DATE, END_DATE), {
      wrapper: createTestQueryWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(2);
    const calledUrl = (global.fetch as jest.Mock).mock.calls[0][0] as string;
    expect(calledUrl).toContain('type=part');
  });
});

describe('useMemberAttendanceHistory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('회원 출석 이력 조회 성공', async () => {
    const mockHistory = [
      { date: '2024-03-03', is_available: true, notes: null },
      { date: '2024-02-25', is_available: false, notes: '출장' },
    ];

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockHistory,
    });

    const { result } = renderHook(
      () => useMemberAttendanceHistory('member-1', START_DATE, END_DATE),
      { wrapper: createTestQueryWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(2);
    const calledUrl = (global.fetch as jest.Mock).mock.calls[0][0] as string;
    expect(calledUrl).toContain('member_id=member-1');
    expect(calledUrl).toContain('start_date=2024-01-01');
    expect(calledUrl).toContain('end_date=2024-03-31');
  });

  it('날짜 범위 없이 전체 조회', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    const { result } = renderHook(() => useMemberAttendanceHistory('member-1'), {
      wrapper: createTestQueryWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const calledUrl = (global.fetch as jest.Mock).mock.calls[0][0] as string;
    expect(calledUrl).toContain('member_id=member-1');
    expect(calledUrl).not.toContain('start_date');
  });

  it('memberId 빈 문자열 → 비활성화', () => {
    const { result } = renderHook(() => useMemberAttendanceHistory(''), {
      wrapper: createTestQueryWrapper(),
    });

    expect(result.current.fetchStatus).toBe('idle');
    expect(global.fetch).not.toHaveBeenCalled();
  });
});

describe('useAttendanceSummaryByDate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('날짜별 요약 통계 조회 성공', async () => {
    const mockSummary = [
      { date: '2024-03-03', total_count: 50, available_count: 42, attendance_rate: 84.0 },
      { date: '2024-02-25', total_count: 48, available_count: 40, attendance_rate: 83.3 },
    ];

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockSummary,
    });

    const { result } = renderHook(() => useAttendanceSummaryByDate(START_DATE, END_DATE), {
      wrapper: createTestQueryWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(2);
    const calledUrl = (global.fetch as jest.Mock).mock.calls[0][0] as string;
    expect(calledUrl).toContain('type=date');
  });
});
