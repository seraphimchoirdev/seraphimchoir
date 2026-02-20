/**
 * GET/PATCH/DELETE /api/service-schedules/[id] 통합 테스트
 */
import {
  createRouteContext,
  createTestRequest,
  setupAuthenticatedSupabase,
  setupUnauthenticatedSupabase,
} from '@/__tests__/helpers/api-route-helpers';

import { DELETE, GET, PATCH } from '../route';

const mockSchedule = {
  id: 'sched-1',
  date: '2024-03-03',
  service_type: '주일예배',
  hymn_name: '은혜',
  offertory_performer: null,
  notes: null,
};

describe('GET /api/service-schedules/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('미인증 시 401', async () => {
    setupUnauthenticatedSupabase();

    const request = createTestRequest('/api/service-schedules/sched-1');
    const ctx = createRouteContext({ id: 'sched-1' });
    const response = await GET(request, ctx);

    expect(response.status).toBe(401);
  });

  it('정상 조회 200', async () => {
    setupAuthenticatedSupabase({
      tables: {
        service_schedules: { selectData: mockSchedule },
      },
    });

    const request = createTestRequest('/api/service-schedules/sched-1');
    const ctx = createRouteContext({ id: 'sched-1' });
    const response = await GET(request, ctx);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.id).toBe('sched-1');
    expect(body.date).toBe('2024-03-03');
  });

  it('존재하지 않는 ID -> 404 (PGRST116)', async () => {
    setupAuthenticatedSupabase({
      tables: {
        service_schedules: {
          error: { message: 'not found', code: 'PGRST116' },
        },
      },
    });

    const request = createTestRequest('/api/service-schedules/non-existent');
    const ctx = createRouteContext({ id: 'non-existent' });
    const response = await GET(request, ctx);

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toContain('찾을 수 없습니다');
  });
});

describe('PATCH /api/service-schedules/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('미인증 시 401', async () => {
    setupUnauthenticatedSupabase();

    const request = createTestRequest('/api/service-schedules/sched-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hymn_name: '새찬양' }),
    });
    const ctx = createRouteContext({ id: 'sched-1' });
    const response = await PATCH(request, ctx);

    expect(response.status).toBe(401);
  });

  it('정상 업데이트 200', async () => {
    const updated = { ...mockSchedule, hymn_name: '새찬양' };

    setupAuthenticatedSupabase({
      tables: {
        service_schedules: { updateData: updated },
      },
    });

    const request = createTestRequest('/api/service-schedules/sched-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hymn_name: '새찬양' }),
    });
    const ctx = createRouteContext({ id: 'sched-1' });
    const response = await PATCH(request, ctx);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.hymn_name).toBe('새찬양');
  });

  it('중복 날짜+유형 -> 409', async () => {
    setupAuthenticatedSupabase({
      tables: {
        service_schedules: {
          error: { message: 'duplicate key', code: '23505' },
        },
      },
    });

    const request = createTestRequest('/api/service-schedules/sched-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: '2024-03-10' }),
    });
    const ctx = createRouteContext({ id: 'sched-1' });
    const response = await PATCH(request, ctx);

    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.error).toContain('이미 존재');
  });
});

describe('DELETE /api/service-schedules/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('미인증 시 401', async () => {
    setupUnauthenticatedSupabase();

    const request = createTestRequest('/api/service-schedules/sched-1', {
      method: 'DELETE',
    });
    const ctx = createRouteContext({ id: 'sched-1' });
    const response = await DELETE(request, ctx);

    expect(response.status).toBe(401);
  });

  it('정상 삭제 200', async () => {
    setupAuthenticatedSupabase({
      tables: {
        service_schedules: { deleteData: null },
      },
    });

    const request = createTestRequest('/api/service-schedules/sched-1', {
      method: 'DELETE',
    });
    const ctx = createRouteContext({ id: 'sched-1' });
    const response = await DELETE(request, ctx);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
  });
});
