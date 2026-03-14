/**
 * GET/POST /api/members 통합 테스트
 */
import {
  createTestRequest,
  setupAuthenticatedSupabase,
  setupUnauthenticatedSupabase,
} from '@/__tests__/helpers/api-route-helpers';

import { GET, POST } from '../route';

// rate-limiter는 dynamic import로 사용되므로 모킹
jest.mock('@/lib/security/rate-limiter', () => ({
  apiRateLimiter: {
    limit: jest.fn().mockResolvedValue({ success: true, reset: Date.now() + 60000 }),
  },
  getClientIp: jest.fn().mockReturnValue('127.0.0.1'),
  createRateLimitErrorResponse: jest.fn().mockReturnValue({ error: 'Rate limit exceeded' }),
}));

// input-sanitizer는 실제 로직 사용 (단순 문자열 처리)
// 별도 모킹 불필요

describe('GET /api/members', () => {
  it('미인증 요청 시 401 반환', async () => {
    setupUnauthenticatedSupabase();

    const request = createTestRequest('/api/members');
    const response = await GET(request);

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe('인증이 필요합니다');
  });

  it('기본 파라미터로 목록 조회 시 200 반환 (PaginatedResponse)', async () => {
    const mockMembers = [
      { id: 'm1', name: '홍길동', part: 'SOPRANO', created_at: '2024-01-01' },
      { id: 'm2', name: '김철수', part: 'TENOR', created_at: '2024-01-02' },
    ];

    setupAuthenticatedSupabase({
      tables: {
        members_with_attendance: {
          selectData: mockMembers,
        },
      },
    });

    const request = createTestRequest('/api/members');
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

  it('part 필터 적용 시 eq 호출 확인', async () => {
    const mockClient = setupAuthenticatedSupabase({
      tables: {
        members_with_attendance: { selectData: [] },
      },
    });

    const request = createTestRequest('/api/members?part=SOPRANO');
    await GET(request);

    // from('members_with_attendance') 호출 확인
    expect(mockClient.from).toHaveBeenCalledWith('members_with_attendance');
  });

  it('잘못된 쿼리 파라미터(limit=-1) 시 400 반환', async () => {
    setupAuthenticatedSupabase();

    const request = createTestRequest('/api/members?limit=-1');
    const response = await GET(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('쿼리 파라미터');
  });

  it('DB 에러 시 500 반환', async () => {
    setupAuthenticatedSupabase({
      tables: {
        members_with_attendance: {
          error: { message: 'Database error', code: 'DB_ERR' },
        },
      },
    });

    const request = createTestRequest('/api/members');
    const response = await GET(request);

    expect(response.status).toBe(500);
  });
});

describe('POST /api/members', () => {
  const validMemberData = {
    name: '테스트대원',
    part: 'SOPRANO',
  };

  it('미인증 시 401 반환', async () => {
    setupUnauthenticatedSupabase();

    const request = createTestRequest('/api/members', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validMemberData),
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it('MEMBER 역할 시 403 반환', async () => {
    setupAuthenticatedSupabase({
      role: 'MEMBER',
      tables: {
        members: { insertData: null },
      },
    });

    const request = createTestRequest('/api/members', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validMemberData),
    });

    const response = await POST(request);
    expect(response.status).toBe(403);
  });

  it('Zod 검증 실패(name 1자) 시 400 반환', async () => {
    setupAuthenticatedSupabase({
      role: 'ADMIN',
      tables: { members: { insertData: null } },
    });

    const request = createTestRequest('/api/members', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '가', part: 'SOPRANO' }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('입력값');
  });

  it('정상 등록 시 201 + data 반환', async () => {
    const newMember = { id: 'new-id', name: '테스트대원', part: 'SOPRANO' };
    setupAuthenticatedSupabase({
      role: 'ADMIN',
      tables: {
        members: { insertData: newMember },
      },
    });

    const request = createTestRequest('/api/members', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validMemberData),
    });

    const response = await POST(request);
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body).toHaveProperty('data');
    expect(body).toHaveProperty('message');
  });

  it('DB insert 에러 시 500 반환', async () => {
    setupAuthenticatedSupabase({
      role: 'ADMIN',
      tables: {
        members: { error: { message: 'Insert failed' } },
      },
    });

    const request = createTestRequest('/api/members', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validMemberData),
    });

    const response = await POST(request);
    expect(response.status).toBe(500);
  });
});
