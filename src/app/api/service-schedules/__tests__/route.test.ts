/**
 * GET/POST /api/service-schedules 통합 테스트
 */
import {
  createTestRequest,
  setupAuthenticatedSupabase,
  setupUnauthenticatedSupabase,
} from '@/__tests__/helpers/api-route-helpers';

import { GET, POST } from '../route';

describe('GET /api/service-schedules', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('미인증 시 401', async () => {
    setupUnauthenticatedSupabase();

    const request = createTestRequest('/api/service-schedules');
    const response = await GET(request);

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toContain('인증');
  });

  it('기본 전체 조회 200 (data + meta.total)', async () => {
    const mockSchedules = [
      { id: 's1', date: '2024-03-03', service_type: '주일예배', hymn_name: '은혜' },
      { id: 's2', date: '2024-03-10', service_type: '주일예배', hymn_name: '사랑' },
    ];

    setupAuthenticatedSupabase({
      tables: {
        service_schedules: { selectData: mockSchedules },
      },
    });

    const request = createTestRequest('/api/service-schedules');
    const response = await GET(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty('data');
    expect(body).toHaveProperty('meta');
    expect(body.meta).toHaveProperty('total');
  });

  it('date 단일 날짜 필터', async () => {
    const mockSchedules = [
      { id: 's1', date: '2024-03-03', service_type: '주일예배' },
    ];

    const mockClient = setupAuthenticatedSupabase({
      tables: {
        service_schedules: { selectData: mockSchedules },
      },
    });

    const request = createTestRequest('/api/service-schedules?date=2024-03-03');
    const response = await GET(request);

    expect(response.status).toBe(200);
    // eq('date', '2024-03-03')이 호출되었는지 확인
    const builder = mockClient.from('service_schedules');
    const selectResult = builder.select();
    expect(selectResult.eq).toHaveBeenCalled();
  });

  it('year+month 월별 필터', async () => {
    const mockSchedules = [
      { id: 's1', date: '2024-03-03', service_type: '주일예배' },
    ];

    const mockClient = setupAuthenticatedSupabase({
      tables: {
        service_schedules: { selectData: mockSchedules },
      },
    });

    const request = createTestRequest('/api/service-schedules?year=2024&month=3');
    const response = await GET(request);

    expect(response.status).toBe(200);
    const builder = mockClient.from('service_schedules');
    const selectResult = builder.select();
    expect(selectResult.gte).toHaveBeenCalled();
    expect(selectResult.lte).toHaveBeenCalled();
  });

  it('startDate+endDate 범위 필터', async () => {
    const mockSchedules = [
      { id: 's1', date: '2024-03-03', service_type: '주일예배' },
    ];

    const mockClient = setupAuthenticatedSupabase({
      tables: {
        service_schedules: { selectData: mockSchedules },
      },
    });

    const request = createTestRequest(
      '/api/service-schedules?startDate=2024-03-01&endDate=2024-03-31'
    );
    const response = await GET(request);

    expect(response.status).toBe(200);
    const builder = mockClient.from('service_schedules');
    const selectResult = builder.select();
    expect(selectResult.gte).toHaveBeenCalled();
    expect(selectResult.lte).toHaveBeenCalled();
  });

  it('DB 에러 시 500', async () => {
    setupAuthenticatedSupabase({
      tables: {
        service_schedules: {
          error: { message: 'DB connection failed', code: 'DB_ERR' },
        },
      },
    });

    const request = createTestRequest('/api/service-schedules');
    const response = await GET(request);

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toContain('DB connection failed');
  });
});

describe('POST /api/service-schedules', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('미인증 시 401', async () => {
    setupUnauthenticatedSupabase();

    const request = createTestRequest('/api/service-schedules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: '2024-03-03' }),
    });
    const response = await POST(request);

    expect(response.status).toBe(401);
  });

  it('Zod 검증 실패 (잘못된 날짜 형식) -> 400', async () => {
    setupAuthenticatedSupabase({
      tables: {
        service_schedules: { insertData: null },
      },
    });

    const request = createTestRequest('/api/service-schedules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: 'invalid-date' }),
    });
    const response = await POST(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('Validation');
    expect(body.details).toBeDefined();
  });

  it('중복 날짜 -> 409 (code 23505)', async () => {
    setupAuthenticatedSupabase({
      tables: {
        service_schedules: {
          error: { message: 'duplicate key', code: '23505' },
        },
      },
    });

    const request = createTestRequest('/api/service-schedules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: '2024-03-03' }),
    });
    const response = await POST(request);

    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.error).toContain('이미 존재');
  });

  it('정상 생성 201', async () => {
    const created = {
      id: 'new-schedule',
      date: '2024-03-17',
      service_type: '주일예배',
      hymn_name: '찬양',
    };

    setupAuthenticatedSupabase({
      tables: {
        service_schedules: { insertData: created },
      },
    });

    const request = createTestRequest('/api/service-schedules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date: '2024-03-17',
        service_type: '주일예배',
        hymn_name: '찬양',
      }),
    });
    const response = await POST(request);

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.id).toBe('new-schedule');
  });

  it('DB insert 에러 -> 500', async () => {
    setupAuthenticatedSupabase({
      tables: {
        service_schedules: {
          error: { message: 'Insert failed', code: 'DB_ERR' },
        },
      },
    });

    const request = createTestRequest('/api/service-schedules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: '2024-03-17' }),
    });
    const response = await POST(request);

    expect(response.status).toBe(500);
  });
});
