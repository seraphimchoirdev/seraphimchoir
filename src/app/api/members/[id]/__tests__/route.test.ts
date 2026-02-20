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
