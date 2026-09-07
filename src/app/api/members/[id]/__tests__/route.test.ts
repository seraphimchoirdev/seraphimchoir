/**
 * GET/PATCH/DELETE /api/members/[id] 통합 테스트
 */
import {
  createRouteContext,
  createTestRequest,
  setupAuthenticatedSupabase,
  setupUnauthenticatedSupabase,
} from '@/__tests__/helpers/api-route-helpers';

import { DELETE, GET, PATCH } from '../route';

const MEMBER_ID = '550e8400-e29b-41d4-a716-446655440001';

const mockMember = {
  id: MEMBER_ID,
  name: '홍길동',
  part: 'SOPRANO',
  is_leader: false,
  is_singer: true,
  member_status: 'REGULAR',
  version: 1,
  created_at: '2024-01-01T00:00:00Z',
};

describe('GET /api/members/[id]', () => {
  it('미인증 시 401 반환', async () => {
    setupUnauthenticatedSupabase();

    const request = createTestRequest(`/api/members/${MEMBER_ID}`);
    const context = createRouteContext({ id: MEMBER_ID });
    const response = await GET(request, context);

    expect(response.status).toBe(401);
  });

  it('정상 조회 시 200 반환', async () => {
    setupAuthenticatedSupabase({
      tables: {
        members_public: { selectData: mockMember },
      },
    });

    const request = createTestRequest(`/api/members/${MEMBER_ID}`);
    const context = createRouteContext({ id: MEMBER_ID });
    const response = await GET(request, context);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data).toHaveProperty('id', MEMBER_ID);
    expect(body.data).toHaveProperty('name', '홍길동');
  });

  it('존재하지 않는 ID → 404 (PGRST116)', async () => {
    setupAuthenticatedSupabase({
      tables: {
        members_public: { error: { message: 'not found', code: 'PGRST116' } },
      },
    });

    const request = createTestRequest(`/api/members/${MEMBER_ID}`);
    const context = createRouteContext({ id: MEMBER_ID });
    const response = await GET(request, context);

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.code).toBe('NOT_FOUND');
  });
});

describe('PATCH /api/members/[id]', () => {
  it('미인증 시 401 반환', async () => {
    setupUnauthenticatedSupabase();

    const request = createTestRequest(`/api/members/${MEMBER_ID}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '수정이름' }),
    });

    const response = await PATCH(request, createRouteContext({ id: MEMBER_ID }));
    expect(response.status).toBe(401);
  });

  it('MEMBER 역할 시 403 반환', async () => {
    setupAuthenticatedSupabase({
      role: 'MEMBER',
      tables: { members: { updateData: null } },
    });

    const request = createTestRequest(`/api/members/${MEMBER_ID}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '수정이름' }),
    });

    const response = await PATCH(request, createRouteContext({ id: MEMBER_ID }));
    expect(response.status).toBe(403);
  });

  it('Zod 검증 실패(name 1자) → 400', async () => {
    setupAuthenticatedSupabase({
      role: 'ADMIN',
      tables: { members: { updateData: null } },
    });

    const request = createTestRequest(`/api/members/${MEMBER_ID}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '가' }),
    });

    const response = await PATCH(request, createRouteContext({ id: MEMBER_ID }));
    expect(response.status).toBe(400);
  });

  it('정상 수정 시 200 반환', async () => {
    const updatedMember = { ...mockMember, name: '수정이름' };
    setupAuthenticatedSupabase({
      role: 'ADMIN',
      tables: {
        members: { updateData: updatedMember },
      },
    });

    const request = createTestRequest(`/api/members/${MEMBER_ID}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '수정이름' }),
    });

    const response = await PATCH(request, createRouteContext({ id: MEMBER_ID }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data).toHaveProperty('name', '수정이름');
  });

  it('version 충돌 시 409 VERSION_CONFLICT', async () => {
    // 이 테스트는 같은 'members' 테이블에 대해 두 가지 동작이 필요합니다:
    // 1차 호출: update().eq().eq().select().single() → PGRST116 에러
    // 2차 호출: select().eq().single() → 멤버 존재 확인 (version: 5)
    // setupAuthenticatedSupabase 대신 직접 mock을 구성합니다.

    const { createMockQueryBuilder } = require('@/__mocks__/supabase-helpers');
    const { createClient } = require('@/lib/supabase/server');

    // 1차: update 에러 반환
    const errorBuilder = createMockQueryBuilder({
      error: { message: 'not found', code: 'PGRST116' },
    });
    // 2차: select로 멤버 존재 확인
    const selectBuilder = createMockQueryBuilder({
      selectData: { id: MEMBER_ID, version: 5 },
    });

    let membersCallCount = 0;
    const mockClient = {
      from: jest.fn().mockImplementation((table: string) => {
        if (table === 'user_profiles') {
          return createMockQueryBuilder({ selectData: { role: 'ADMIN' } });
        }
        if (table === 'members') {
          membersCallCount++;
          // 첫 번째 호출 = update, 두 번째 호출 = select(존재확인)
          return membersCallCount === 1 ? errorBuilder : selectBuilder;
        }
        return createMockQueryBuilder();
      }),
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'test-user-id', email: 'test@test.com' } },
          error: null,
        }),
      },
    };

    (createClient as jest.Mock).mockResolvedValue(mockClient);

    const request = createTestRequest(`/api/members/${MEMBER_ID}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '수정이름', version: 3 }),
    });

    const response = await PATCH(request, createRouteContext({ id: MEMBER_ID }));
    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.code).toBe('VERSION_CONFLICT');
  });

  /**
   * 최초 승격일 보존
   *
   * regular_member_since는 "신입이 몇 세트를 채우고 정대원이 되었는가"의 근거로 남는
   * 값이라, 두 번째 승격 payload에 덮이면 최초 기록이 복구 불가능하게 사라진다.
   * 화면에서는 티가 안 나는 종류의 손실이라(날짜가 그럴듯하게 들어가 있다) 여기서 고정한다.
   */
  describe('최초 승격일 보존', () => {
    /**
     * members 테이블에 대한 호출을 순서대로 나눠 준다.
     * 승격일이 body에 있으면 1차=선조회, 2차=update 순으로 호출된다.
     */
    const setupPromotionMocks = (existingRegularSince: string | null) => {
      const { createMockQueryBuilder } = require('@/__mocks__/supabase-helpers');
      const { createClient } = require('@/lib/supabase/server');

      const selectBuilder = createMockQueryBuilder({
        selectData: { regular_member_since: existingRegularSince },
      });
      const updateBuilder = createMockQueryBuilder({
        updateData: { ...mockMember, version: 3 },
      });

      let membersCallCount = 0;
      (createClient as jest.Mock).mockResolvedValue({
        from: jest.fn().mockImplementation((table: string) => {
          if (table === 'user_profiles') {
            return createMockQueryBuilder({ selectData: { role: 'ADMIN' } });
          }
          if (table === 'members') {
            membersCallCount++;
            return membersCallCount === 1 ? selectBuilder : updateBuilder;
          }
          return createMockQueryBuilder();
        }),
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: 'test-user-id', email: 'test@test.com' } },
            error: null,
          }),
        },
      });

      return { updateBuilder };
    };

    const 승격요청 = (regularSince: string) =>
      createTestRequest(`/api/members/${MEMBER_ID}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          member_status: 'REGULAR',
          regular_member_since: regularSince,
          version: 2,
        }),
      });

    it('이미 승격일이 있으면 덮어쓰지 않는다', async () => {
      const { updateBuilder } = setupPromotionMocks('2026-08-18');

      const response = await PATCH(승격요청('2026-09-03'), createRouteContext({ id: MEMBER_ID }));

      expect(response.status).toBe(200);
      // UPDATE payload에서 키가 통째로 빠져야 한다 — null이나 undefined가 아니라 부재.
      const payload = updateBuilder.update.mock.calls[0][0];
      expect(payload).not.toHaveProperty('regular_member_since');
      // 같이 보낸 다른 필드는 정상 반영된다
      expect(payload).toHaveProperty('member_status', 'REGULAR');
    });

    it('승격일이 비어 있으면 정상적으로 기록한다', async () => {
      const { updateBuilder } = setupPromotionMocks(null);

      const response = await PATCH(승격요청('2026-09-03'), createRouteContext({ id: MEMBER_ID }));

      expect(response.status).toBe(200);
      const payload = updateBuilder.update.mock.calls[0][0];
      expect(payload).toHaveProperty('regular_member_since', '2026-09-03');
    });

    it('승격일을 보내지 않는 수정은 선조회 없이 그대로 진행한다', async () => {
      const { createMockQueryBuilder } = require('@/__mocks__/supabase-helpers');
      const { createClient } = require('@/lib/supabase/server');

      const updateBuilder = createMockQueryBuilder({ updateData: mockMember });
      const fromMock = jest.fn().mockImplementation((table: string) => {
        if (table === 'user_profiles') {
          return createMockQueryBuilder({ selectData: { role: 'ADMIN' } });
        }
        return table === 'members' ? updateBuilder : createMockQueryBuilder();
      });

      (createClient as jest.Mock).mockResolvedValue({
        from: fromMock,
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: 'test-user-id', email: 'test@test.com' } },
            error: null,
          }),
        },
      });

      const request = createTestRequest(`/api/members/${MEMBER_ID}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: '수정이름', version: 2 }),
      });

      const response = await PATCH(request, createRouteContext({ id: MEMBER_ID }));

      expect(response.status).toBe(200);
      // 이름만 바꾸는 흔한 수정에 조회 쿼리가 하나 늘어나면 안 된다
      const membersCalls = fromMock.mock.calls.filter(([t]: [string]) => t === 'members');
      expect(membersCalls).toHaveLength(1);
    });
  });
});

describe('DELETE /api/members/[id]', () => {
  it('미인증 시 401 반환', async () => {
    setupUnauthenticatedSupabase();

    const request = createTestRequest(`/api/members/${MEMBER_ID}`, {
      method: 'DELETE',
    });

    const response = await DELETE(request, createRouteContext({ id: MEMBER_ID }));
    expect(response.status).toBe(401);
  });

  it('PART_LEADER 역할 시 403 (MANAGER 이상 필요)', async () => {
    setupAuthenticatedSupabase({
      role: 'PART_LEADER',
      tables: { members: {} },
    });

    const request = createTestRequest(`/api/members/${MEMBER_ID}`, {
      method: 'DELETE',
    });

    const response = await DELETE(request, createRouteContext({ id: MEMBER_ID }));
    expect(response.status).toBe(403);
  });

  it('정상 삭제 시 200 반환', async () => {
    setupAuthenticatedSupabase({
      role: 'ADMIN',
      tables: {
        members: { deleteData: null },
      },
    });

    const request = createTestRequest(`/api/members/${MEMBER_ID}`, {
      method: 'DELETE',
    });

    const response = await DELETE(request, createRouteContext({ id: MEMBER_ID }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.message).toContain('삭제');
  });
});
