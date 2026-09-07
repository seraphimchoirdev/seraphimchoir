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

  // 출석 화면은 정대원과 신입대원을 함께 조회해야 한다(신입은 연습 참석을 기록해야
  // 세트가 쌓인다). 콤마 문자열을 .eq()에 그대로 넘기면 'REGULAR,NEW'라는 값을 가진
  // 대원이 없어 조용히 0명이 나온다 — 에러도 안 나고 화면에서 전 대원이 사라진다.
  describe('member_status 필터', () => {
    /**
     * 상태 필터에 실제로 넘어간 인자를 꺼낸다.
     *
     * mock 빌더의 최상위에는 select/insert/... 만 있고, .in()·.eq() 같은 필터는
     * select()가 반환하는 thenable 객체에 붙는다. 그래서 한 단계 들어가야 한다.
     */
    const 필터_호출 = (client: ReturnType<typeof setupAuthenticatedSupabase>, method: 'in' | 'eq') => {
      const builder = client.from('members_with_attendance');
      const chain = (builder.select as jest.Mock).mock.results[0].value as Record<string, jest.Mock>;
      return (chain[method].mock.calls as unknown[][]).filter((c) => c[0] === 'member_status');
    };

    it('콤마로 여러 상태를 넘기면 in()으로 조회한다', async () => {
      const client = setupAuthenticatedSupabase({
        tables: { members_with_attendance: { selectData: [] } },
      });

      await GET(createTestRequest('/api/members?member_status=REGULAR,NEW'));

      expect(필터_호출(client, 'in')).toContainEqual(['member_status', ['REGULAR', 'NEW']]);
    });

    it('단일 상태도 in()으로 조회한다', async () => {
      const client = setupAuthenticatedSupabase({
        tables: { members_with_attendance: { selectData: [] } },
      });

      await GET(createTestRequest('/api/members?member_status=REGULAR'));

      expect(필터_호출(client, 'in')).toContainEqual(['member_status', ['REGULAR']]);
    });

    it('잘못된 상태값은 400으로 거부한다', async () => {
      setupAuthenticatedSupabase({
        tables: { members_with_attendance: { selectData: [] } },
      });

      const response = await GET(createTestRequest('/api/members?member_status=REGULAR,INVALID'));

      expect(response.status).toBe(400);
    });
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

  // 신입대원 세트 수는 폼 → 훅 → zod → insert 네 층을 거친다. 어느 한 층에서
  // 필드가 누락되면 값이 조용히 사라지고 화면에는 늘 기본값 4가 보인다.
  // 여기서는 마지막 두 층(zod strip → insert 도달)을 고정한다.
  describe('required_practice_sets', () => {
    /** insert에 실제로 넘어간 행을 꺼낸다 */
    const 저장된_행 = (client: ReturnType<typeof setupAuthenticatedSupabase>) => {
      const calls = (client.from('members').insert as jest.Mock).mock.calls;
      expect(calls.length).toBeGreaterThan(0);
      return (calls[0][0] as Array<Record<string, unknown>>)[0];
    };

    it('지정한 세트 수가 버려지지 않고 저장된다', async () => {
      const client = setupAuthenticatedSupabase({
        role: 'ADMIN',
        tables: { members: { insertData: { id: 'm-1' } } },
      });

      const request = createTestRequest('/api/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...validMemberData, required_practice_sets: 2 }),
      });

      await POST(request);

      expect(저장된_행(client).required_practice_sets).toBe(2);
    });

    it('생략하면 기본 4세트가 채워진다', async () => {
      const client = setupAuthenticatedSupabase({
        role: 'ADMIN',
        tables: { members: { insertData: { id: 'm-1' } } },
      });

      const request = createTestRequest('/api/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validMemberData),
      });

      await POST(request);

      expect(저장된_행(client).required_practice_sets).toBe(4);
    });

    it('범위를 벗어난 값은 400으로 거부한다', async () => {
      setupAuthenticatedSupabase({
        role: 'ADMIN',
        tables: { members: { insertData: null } },
      });

      const request = createTestRequest('/api/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...validMemberData, required_practice_sets: 0 }),
      });

      expect((await POST(request)).status).toBe(400);
    });
  });
});
