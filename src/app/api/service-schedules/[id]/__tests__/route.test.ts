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

  it('작곡가·악보출처·후드색상·연습설정이 update에 전달된다 (zod strip 회귀 방지)', async () => {
    // 과거 스키마에 이 필드들이 없어서 조용히 제거(strip)되어
    // "성공 토스트는 뜨지만 저장 안 됨" 버그가 있었음 (2026-07-13)
    const client = setupAuthenticatedSupabase({
      tables: {
        service_schedules: { updateData: { ...mockSchedule, composer: '오병희' } },
      },
    });

    const payload = {
      hymn_name: '시온성',
      composer: '오병희',
      music_source: '예수 나의 기쁨 21권',
      hood_color: '녹색',
      has_pre_practice: true,
      pre_practice_minutes_before: 60,
      has_post_practice: true,
      post_practice_start_time: '10:30',
      post_practice_duration: 60,
      pre_practice_location: null,
      post_practice_location: '본당',
    };
    const request = createTestRequest('/api/service-schedules/sched-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const ctx = createRouteContext({ id: 'sched-1' });
    const response = await PATCH(request, ctx);

    expect(response.status).toBe(200);
    const updateMock = client.from('service_schedules').update as jest.Mock;
    expect(updateMock).toHaveBeenCalledWith(expect.objectContaining(payload));
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
