/**
 * GET/POST /api/attendances 통합 테스트
 */
import {
  createTestRequest,
  setupAuthenticatedSupabase,
  setupUnauthenticatedSupabase,
} from '@/__tests__/helpers/api-route-helpers';

import { GET, POST } from '../route';

const mockAttendance = {
  id: 'att-1',
  member_id: '550e8400-e29b-41d4-a716-446655440001',
  date: '2024-03-01',
  is_service_available: true,
  is_practice_attended: true,
  practice_status: null,
  notes: null,
  created_at: '2024-03-01T00:00:00Z',
  updated_at: '2024-03-01T00:00:00Z',
  members: { id: '550e8400-e29b-41d4-a716-446655440001', name: '홍길동', part: 'TENOR' },
};

describe('GET /api/attendances', () => {
  it('미인증 시 401 반환', async () => {
    setupUnauthenticatedSupabase();

    const request = createTestRequest('/api/attendances?date=2024-03-01');
    const response = await GET(request);

    expect(response.status).toBe(401);
  });

  it('필터 없이 요청 시 빈 배열 반환', async () => {
    setupAuthenticatedSupabase();

    const request = createTestRequest('/api/attendances');
    const response = await GET(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual([]);
  });

  it('date 필터 조회 성공', async () => {
    setupAuthenticatedSupabase({
      tables: {
        attendances: { selectData: [mockAttendance] },
      },
    });

    const request = createTestRequest(
      '/api/attendances?date=2024-03-01'
    );
    const response = await GET(request);

    expect(response.status).toBe(200);
  });

  it('member_id 필터 조회 성공', async () => {
    const mockClient = setupAuthenticatedSupabase({
      tables: {
        attendances: { selectData: [mockAttendance] },
      },
    });

    const request = createTestRequest(
      `/api/attendances?member_id=${mockAttendance.member_id}`
    );
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(mockClient.from).toHaveBeenCalledWith('attendances');
  });

  it('DB 에러 시 500 반환', async () => {
    setupAuthenticatedSupabase({
      tables: {
        attendances: { error: { message: 'DB error', code: 'DB_ERR' } },
      },
    });

    const request = createTestRequest(
      '/api/attendances?date=2024-03-01'
    );
    const response = await GET(request);

    expect(response.status).toBe(500);
  });
});

describe('POST /api/attendances', () => {
  const validAttendanceData = {
    member_id: '550e8400-e29b-41d4-a716-446655440001',
    date: '2024-03-01',
    is_service_available: true,
    is_practice_attended: true,
  };

  it('미인증 시 401 반환', async () => {
    setupUnauthenticatedSupabase();

    const request = createTestRequest('/api/attendances', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validAttendanceData),
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it('MEMBER 역할 시 403 반환', async () => {
    setupAuthenticatedSupabase({
      role: 'MEMBER',
      tables: { attendances: { insertData: null } },
    });

    const request = createTestRequest('/api/attendances', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validAttendanceData),
    });

    const response = await POST(request);
    expect(response.status).toBe(403);
  });

  it('정상 생성 시 201 반환', async () => {
    setupAuthenticatedSupabase({
      role: 'ADMIN',
      tables: {
        attendances: { insertData: { ...mockAttendance } },
      },
    });

    const request = createTestRequest('/api/attendances', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validAttendanceData),
    });

    const response = await POST(request);
    expect(response.status).toBe(201);
  });

  it('중복(23505) 시 409 반환', async () => {
    setupAuthenticatedSupabase({
      role: 'ADMIN',
      tables: {
        attendances: {
          error: { message: 'duplicate key', code: '23505' },
        },
      },
    });

    const request = createTestRequest('/api/attendances', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validAttendanceData),
    });

    const response = await POST(request);
    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.error).toContain('이미 출석 기록이 존재');
  });
});
