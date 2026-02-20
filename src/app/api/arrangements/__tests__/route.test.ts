/**
 * GET/POST /api/arrangements 통합 테스트
 */
import {
  createTestRequest,
  setupAuthenticatedSupabase,
  setupUnauthenticatedSupabase,
} from '@/__tests__/helpers/api-route-helpers';

import { GET, POST } from '../route';

// rate-limiter 모킹 (dynamic import 대응)
jest.mock('@/lib/security/rate-limiter', () => ({
  apiRateLimiter: {
    limit: jest.fn().mockResolvedValue({ success: true, reset: Date.now() + 60000 }),
  },
  getClientIp: jest.fn().mockReturnValue('127.0.0.1'),
  createRateLimitErrorResponse: jest.fn(),
}));

// sanitization-middleware: sanitizeQueryParams 가 ZodError → ValidationError throw
// 실제 모듈을 사용하되, input-sanitizer는 이미 설치됨
// ValidationError catch 가 route에 없으므로 Zod 에러 테스트 시 unhandled throw → 별도 처리

describe('GET /api/arrangements', () => {
  it('미인증 시 401', async () => {
    setupUnauthenticatedSupabase();

    const request = createTestRequest('/api/arrangements');
    const response = await GET(request);

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toContain('인증');
  });

  it('기본 목록 조회 200 (PaginatedResponse 구조)', async () => {
    const mockSchedules = [
      { date: '2024-01-07', service_type: '주일예배', hymn_name: '찬양1', offertory_performer: null },
    ];
    const mockArrangements = [
      { id: 'arr-1', title: '1주 배치', date: '2024-01-07', service_info: '주일예배', created_at: '2024-01-01' },
    ];

    setupAuthenticatedSupabase({
      tables: {
        service_schedules: { selectData: mockSchedules },
        arrangements: { selectData: mockArrangements },
        seats: { selectData: [] },
      },
    });

    const request = createTestRequest('/api/arrangements');
    const response = await GET(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty('data');
    expect(body).toHaveProperty('meta');
    expect(body.meta).toHaveProperty('total');
    expect(body.meta).toHaveProperty('page');
    expect(body.meta).toHaveProperty('limit');
    expect(body.meta).toHaveProperty('totalPages');
    expect(body.meta).toHaveProperty('hasNext');
    expect(body.meta).toHaveProperty('hasPrev');
  });

  it('서비스 스케줄과 매칭하여 enriched 데이터 반환', async () => {
    const mockSchedules = [
      { date: '2024-01-07', service_type: '주일예배', hymn_name: '은혜', offertory_performer: '김봉헌' },
    ];
    const mockArrangements = [
      { id: 'arr-1', title: '1월 배치', date: '2024-01-07', service_info: '주일예배' },
    ];

    setupAuthenticatedSupabase({
      tables: {
        service_schedules: { selectData: mockSchedules },
        arrangements: { selectData: mockArrangements },
        seats: { selectData: [] },
      },
    });

    const request = createTestRequest('/api/arrangements');
    const response = await GET(request);
    const body = await response.json();

    expect(body.data[0]).toHaveProperty('service_type', '주일예배');
    expect(body.data[0]).toHaveProperty('hymn_name', '은혜');
    expect(body.data[0]).toHaveProperty('offertory_performer', '김봉헌');
  });

  it('검색어 필터 적용 (title 검색)', async () => {
    const mockArrangements = [
      { id: 'arr-1', title: '새벽예배 배치', date: '2024-01-08', service_info: null },
      { id: 'arr-2', title: '주일예배 배치', date: '2024-01-07', service_info: null },
    ];

    setupAuthenticatedSupabase({
      tables: {
        service_schedules: { selectData: [] },
        arrangements: { selectData: mockArrangements },
        seats: { selectData: [] },
      },
    });

    const request = createTestRequest('/api/arrangements?search=새벽');
    const response = await GET(request);
    const body = await response.json();

    expect(body.data).toHaveLength(1);
    expect(body.data[0].title).toContain('새벽');
  });

  it('페이지네이션 (page=2, limit=1)', async () => {
    const mockArrangements = [
      { id: 'arr-1', title: '배치1', date: '2024-01-14', service_info: null },
      { id: 'arr-2', title: '배치2', date: '2024-01-07', service_info: null },
    ];

    setupAuthenticatedSupabase({
      tables: {
        service_schedules: { selectData: [] },
        arrangements: { selectData: mockArrangements },
        seats: { selectData: [] },
      },
    });

    const request = createTestRequest('/api/arrangements?page=2&limit=1');
    const response = await GET(request);
    const body = await response.json();

    expect(body.meta.page).toBe(2);
    expect(body.meta.limit).toBe(1);
    expect(body.meta.totalPages).toBe(2);
    expect(body.data).toHaveLength(1);
  });

  it('DB 에러 시 500', async () => {
    setupAuthenticatedSupabase({
      tables: {
        service_schedules: { selectData: [] },
        arrangements: { error: { message: 'DB connection error', code: 'DB_ERR' } },
        seats: { selectData: [] },
      },
    });

    const request = createTestRequest('/api/arrangements');
    const response = await GET(request);

    expect(response.status).toBe(500);
  });
});

describe('POST /api/arrangements', () => {
  const validData = {
    title: '새 배치표',
    date: '2024-02-04',
    service_schedule_id: '550e8400-e29b-41d4-a716-446655440000',
  };

  it('미인증 시 401', async () => {
    setupUnauthenticatedSupabase();

    const request = createTestRequest('/api/arrangements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validData),
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it('Zod 검증 실패 (날짜 형식 오류) → 400', async () => {
    setupAuthenticatedSupabase({
      tables: {
        service_schedules: { selectData: null },
        arrangements: { insertData: null },
      },
    });

    const request = createTestRequest('/api/arrangements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: '테스트', date: 'not-a-date' }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('Validation');
  });

  it('예배 일정 없는 날짜 (service_schedule_id 없이) → 400', async () => {
    setupAuthenticatedSupabase({
      tables: {
        service_schedules: { selectData: [] },
        arrangements: { insertData: null },
      },
    });

    const request = createTestRequest('/api/arrangements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: '테스트 배치', date: '2024-03-01' }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('예배 일정');
  });

  it('정상 생성 200', async () => {
    const created = { id: 'new-arr', title: '새 배치표', date: '2024-02-04' };

    setupAuthenticatedSupabase({
      tables: {
        service_schedules: {
          selectData: { id: '550e8400-e29b-41d4-a716-446655440000' },
        },
        arrangements: { insertData: created },
      },
    });

    const request = createTestRequest('/api/arrangements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validData),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.id).toBe('new-arr');
  });

  it('DB insert 에러 → 500', async () => {
    setupAuthenticatedSupabase({
      tables: {
        service_schedules: {
          selectData: { id: '550e8400-e29b-41d4-a716-446655440000' },
        },
        arrangements: { error: { message: 'Insert failed' } },
      },
    });

    const request = createTestRequest('/api/arrangements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validData),
    });

    const response = await POST(request);
    expect(response.status).toBe(500);
  });
});
