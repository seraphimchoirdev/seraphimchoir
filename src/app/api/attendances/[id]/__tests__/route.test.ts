/**
 * GET/PATCH/DELETE /api/attendances/[id] 통합 테스트
 */
import {
  createRouteContext,
  createTestRequest,
  setupAuthenticatedSupabase,
  setupUnauthenticatedSupabase,
} from '@/__tests__/helpers/api-route-helpers';

import { DELETE, GET, PATCH } from '../route';

const ATTENDANCE_ID = '660e8400-e29b-41d4-a716-446655440001';

const mockAttendance = {
  id: ATTENDANCE_ID,
  member_id: 'member-1',
  date: '2024-03-03',
  service_schedule_id: null,
  is_service_available: true,
  is_practice_attended: false,
  practice_status: null,
  notes: null,
  created_at: '2024-03-01T00:00:00Z',
  updated_at: '2024-03-01T00:00:00Z',
  members: { id: 'member-1', name: '홍길동', part: 'TENOR' },
};

// ─── GET ─────────────────────────────────────────────────────────────

describe('GET /api/attendances/[id]', () => {
  it('미인증 시 401 반환', async () => {
    setupUnauthenticatedSupabase();

    const request = createTestRequest(`/api/attendances/${ATTENDANCE_ID}`);
    const response = await GET(request, createRouteContext({ id: ATTENDANCE_ID }));

    expect(response.status).toBe(401);
  });

  it('정상 조회 시 200 (members JOIN 포함)', async () => {
    setupAuthenticatedSupabase({
      tables: {
        attendances: { selectData: mockAttendance },
      },
    });

    const request = createTestRequest(`/api/attendances/${ATTENDANCE_ID}`);
    const response = await GET(request, createRouteContext({ id: ATTENDANCE_ID }));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty('id', ATTENDANCE_ID);
    expect(body).toHaveProperty('members');
    expect(body.members.name).toBe('홍길동');
  });

  it('존재하지 않는 ID → 404', async () => {
    setupAuthenticatedSupabase({
      tables: {
        attendances: { error: { message: 'not found', code: 'PGRST116' } },
      },
    });

    const request = createTestRequest(`/api/attendances/${ATTENDANCE_ID}`);
    const response = await GET(request, createRouteContext({ id: ATTENDANCE_ID }));

    expect(response.status).toBe(404);
  });
});

// ─── PATCH ───────────────────────────────────────────────────────────

describe('PATCH /api/attendances/[id]', () => {
  it('미인증 시 401 반환', async () => {
    setupUnauthenticatedSupabase();

    const request = createTestRequest(`/api/attendances/${ATTENDANCE_ID}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_service_available: false }),
    });

    const response = await PATCH(request, createRouteContext({ id: ATTENDANCE_ID }));
    expect(response.status).toBe(401);
  });

  it('권한 없는 역할 → 403', async () => {
    setupAuthenticatedSupabase({
      role: 'MEMBER', // 허용되지 않는 역할
      tables: {
        attendances: { updateData: mockAttendance },
      },
    });

    const request = createTestRequest(`/api/attendances/${ATTENDANCE_ID}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_service_available: false }),
    });

    const response = await PATCH(request, createRouteContext({ id: ATTENDANCE_ID }));
    expect(response.status).toBe(403);
    const body = await response.json();
    // 권한 없는 역할은 MEMBER 본인 검증 가드에 걸린다 (attendance-vote-guard)
    expect(body.error).toContain('본인 출석만');
  });

  it('PART_LEADER 이상 역할 → 정상 업데이트 200', async () => {
    const updated = { ...mockAttendance, is_service_available: false, notes: '결석' };
    setupAuthenticatedSupabase({
      role: 'PART_LEADER',
      tables: {
        attendances: { updateData: updated },
      },
    });

    const request = createTestRequest(`/api/attendances/${ATTENDANCE_ID}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_service_available: false, notes: '결석' }),
    });

    const response = await PATCH(request, createRouteContext({ id: ATTENDANCE_ID }));
    expect(response.status).toBe(200);
  });

  it('유효하지 않은 날짜 형식 → 400', async () => {
    setupAuthenticatedSupabase({
      tables: {
        attendances: { updateData: mockAttendance },
      },
    });

    const request = createTestRequest(`/api/attendances/${ATTENDANCE_ID}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: '2024/03/03' }), // 잘못된 형식
    });

    const response = await PATCH(request, createRouteContext({ id: ATTENDANCE_ID }));
    expect(response.status).toBe(400);
  });
});

// ─── DELETE ──────────────────────────────────────────────────────────

describe('DELETE /api/attendances/[id]', () => {
  it('미인증 시 401 반환', async () => {
    setupUnauthenticatedSupabase();

    const request = createTestRequest(`/api/attendances/${ATTENDANCE_ID}`, {
      method: 'DELETE',
    });

    const response = await DELETE(request, createRouteContext({ id: ATTENDANCE_ID }));
    expect(response.status).toBe(401);
  });

  it('PART_LEADER 역할은 삭제 불가 → 403', async () => {
    setupAuthenticatedSupabase({
      role: 'PART_LEADER', // MANAGER 이상만 삭제 가능
      tables: {
        attendances: { deleteData: null },
      },
    });

    const request = createTestRequest(`/api/attendances/${ATTENDANCE_ID}`, {
      method: 'DELETE',
    });

    const response = await DELETE(request, createRouteContext({ id: ATTENDANCE_ID }));
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error).toContain('삭제 권한');
  });

  it('MANAGER 이상 역할 → 정상 삭제 200', async () => {
    setupAuthenticatedSupabase({
      role: 'MANAGER',
      tables: {
        attendances: { deleteData: null },
      },
    });

    const request = createTestRequest(`/api/attendances/${ATTENDANCE_ID}`, {
      method: 'DELETE',
    });

    const response = await DELETE(request, createRouteContext({ id: ATTENDANCE_ID }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.message).toContain('삭제');
  });
});
