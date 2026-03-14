/**
 * POST /api/arrangements/[id]/seats 통합 테스트
 *
 * 좌석 일괄 저장 (기존 삭제 → 새 insert) API 테스트
 */
import {
  createRouteContext,
  createTestRequest,
  setupAuthenticatedSupabase,
} from '@/__tests__/helpers/api-route-helpers';

import { POST } from '../../seats/route';

// rate-limiter 모킹
jest.mock('@/lib/security/rate-limiter', () => ({
  apiRateLimiter: {
    limit: jest.fn().mockResolvedValue({ success: true, reset: Date.now() + 60000 }),
  },
  getClientIp: jest.fn().mockReturnValue('127.0.0.1'),
  createRateLimitErrorResponse: jest.fn(),
}));

describe('POST /api/arrangements/[id]/seats', () => {
  const validSeats = [
    { member_id: 'm1', seat_row: 1, seat_column: 1, part: 'SOPRANO', is_row_leader: false },
    { member_id: 'm2', seat_row: 1, seat_column: 2, part: 'ALTO', is_row_leader: true },
  ];

  it('seats가 배열이 아닌 경우 400', async () => {
    setupAuthenticatedSupabase({
      tables: {
        seats: { deleteData: null },
      },
    });

    const request = createTestRequest('/api/arrangements/arr-1/seats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ seats: 'not-an-array' }),
    });

    const response = await POST(request, createRouteContext({ id: 'arr-1' }));
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('array');
  });

  it('빈 배열 → 기존 좌석만 삭제, 성공', async () => {
    const mockClient = setupAuthenticatedSupabase({
      tables: {
        seats: { deleteData: null },
      },
    });

    const request = createTestRequest('/api/arrangements/arr-1/seats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ seats: [] }),
    });

    const response = await POST(request, createRouteContext({ id: 'arr-1' }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.message).toContain('success');

    // delete가 호출되었지만 insert는 호출되지 않음 (빈 배열)
    expect(mockClient.from).toHaveBeenCalledWith('seats');
  });

  it('정상 좌석 배치 저장 성공', async () => {
    setupAuthenticatedSupabase({
      tables: {
        seats: { deleteData: null, insertData: validSeats },
      },
    });

    const request = createTestRequest('/api/arrangements/arr-1/seats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ seats: validSeats }),
    });

    const response = await POST(request, createRouteContext({ id: 'arr-1' }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.message).toContain('success');
  });

  it('delete 에러 시 500', async () => {
    setupAuthenticatedSupabase({
      tables: {
        seats: { error: { message: 'Delete failed', code: 'DELETE_ERR' } },
      },
    });

    const request = createTestRequest('/api/arrangements/arr-1/seats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ seats: validSeats }),
    });

    const response = await POST(request, createRouteContext({ id: 'arr-1' }));
    expect(response.status).toBe(500);
  });
});
