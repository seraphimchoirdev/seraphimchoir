/**
 * GET/PATCH/DELETE /api/arrangements/[id] 통합 테스트
 */
import {
  createRouteContext,
  createTestRequest,
  setupAuthenticatedSupabase,
  setupUnauthenticatedSupabase,
} from '@/__tests__/helpers/api-route-helpers';

import { DELETE, GET, PATCH } from '../route';

const ARRANGEMENT_ID = '660e8400-e29b-41d4-a716-446655440099';

const mockArrangement = {
  id: ARRANGEMENT_ID,
  title: '2024-03-03 주일예배',
  date: '2024-03-03',
  status: 'DRAFT',
  grid_rows: 5,
  grid_layout: null,
  is_published: false,
  seats: [],
  created_at: '2024-03-01T00:00:00Z',
};

describe('GET /api/arrangements/[id]', () => {
  it('미인증 시 401 반환', async () => {
    setupUnauthenticatedSupabase();

    const request = createTestRequest(
      `/api/arrangements/${ARRANGEMENT_ID}`
    );
    const response = await GET(request, createRouteContext({ id: ARRANGEMENT_ID }));

    expect(response.status).toBe(401);
  });

  it('정상 조회 시 200 (seats JOIN 포함)', async () => {
    setupAuthenticatedSupabase({
      tables: {
        arrangements: { selectData: mockArrangement },
      },
    });

    const request = createTestRequest(
      `/api/arrangements/${ARRANGEMENT_ID}`
    );
    const response = await GET(request, createRouteContext({ id: ARRANGEMENT_ID }));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty('id', ARRANGEMENT_ID);
    expect(body).toHaveProperty('seats');
  });

  it('존재하지 않는 ID → 404', async () => {
    setupAuthenticatedSupabase({
      tables: {
        arrangements: { error: { message: 'not found', code: 'PGRST116' } },
      },
    });

    const request = createTestRequest(
      `/api/arrangements/${ARRANGEMENT_ID}`
    );
    const response = await GET(request, createRouteContext({ id: ARRANGEMENT_ID }));

    expect(response.status).toBe(404);
  });
});

describe('PATCH /api/arrangements/[id]', () => {
  it('미인증 시 401 반환', async () => {
    setupUnauthenticatedSupabase();

    const request = createTestRequest(`/api/arrangements/${ARRANGEMENT_ID}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: '수정제목' }),
    });

    const response = await PATCH(request, createRouteContext({ id: ARRANGEMENT_ID }));
    expect(response.status).toBe(401);
  });

  it('Zod 검증 실패(grid_rows: 100) → 400', async () => {
    setupAuthenticatedSupabase({
      tables: { arrangements: { selectData: mockArrangement } },
    });

    const request = createTestRequest(`/api/arrangements/${ARRANGEMENT_ID}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ grid_rows: 100 }),
    });

    const response = await PATCH(request, createRouteContext({ id: ARRANGEMENT_ID }));
    expect(response.status).toBe(400);
  });

  it('DRAFT → SHARED 전환 성공', async () => {
    const updatedArrangement = { ...mockArrangement, status: 'SHARED' };
    setupAuthenticatedSupabase({
      tables: {
        arrangements: {
          selectData: { status: 'DRAFT' },
          updateData: updatedArrangement,
        },
      },
    });

    const request = createTestRequest(`/api/arrangements/${ARRANGEMENT_ID}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'SHARED' }),
    });

    const response = await PATCH(request, createRouteContext({ id: ARRANGEMENT_ID }));
    expect(response.status).toBe(200);
  });

  it('DRAFT → CONFIRMED 전환 성공', async () => {
    const updatedArrangement = { ...mockArrangement, status: 'CONFIRMED' };
    setupAuthenticatedSupabase({
      tables: {
        arrangements: {
          selectData: { status: 'DRAFT' },
          updateData: updatedArrangement,
        },
      },
    });

    const request = createTestRequest(`/api/arrangements/${ARRANGEMENT_ID}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'CONFIRMED' }),
    });

    const response = await PATCH(request, createRouteContext({ id: ARRANGEMENT_ID }));
    expect(response.status).toBe(200);
  });

  it('SHARED → DRAFT 롤백 허용', async () => {
    const updatedArrangement = { ...mockArrangement, status: 'DRAFT' };
    setupAuthenticatedSupabase({
      tables: {
        arrangements: {
          selectData: { status: 'SHARED' },
          updateData: updatedArrangement,
        },
      },
    });

    const request = createTestRequest(`/api/arrangements/${ARRANGEMENT_ID}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'DRAFT' }),
    });

    const response = await PATCH(request, createRouteContext({ id: ARRANGEMENT_ID }));
    expect(response.status).toBe(200);
  });

  it('CONFIRMED → SHARED 긴급 수정 허용', async () => {
    const updatedArrangement = { ...mockArrangement, status: 'SHARED' };
    setupAuthenticatedSupabase({
      tables: {
        arrangements: {
          selectData: { status: 'CONFIRMED' },
          updateData: updatedArrangement,
        },
      },
    });

    const request = createTestRequest(`/api/arrangements/${ARRANGEMENT_ID}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'SHARED' }),
    });

    const response = await PATCH(request, createRouteContext({ id: ARRANGEMENT_ID }));
    expect(response.status).toBe(200);
  });

  it('CONFIRMED 상태에서 일반 수정 차단 → 403', async () => {
    setupAuthenticatedSupabase({
      tables: {
        arrangements: {
          selectData: { status: 'CONFIRMED' },
          updateData: null,
        },
      },
    });

    const request = createTestRequest(`/api/arrangements/${ARRANGEMENT_ID}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: '수정 시도' }),
    });

    const response = await PATCH(request, createRouteContext({ id: ARRANGEMENT_ID }));
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error).toContain('확정된 배치표');
  });

  it('RLS 업데이트 차단(maybeSingle → null) → 403', async () => {
    setupAuthenticatedSupabase({
      tables: {
        arrangements: {
          selectData: { status: 'DRAFT' },
          // update().select().maybeSingle() → null (RLS 차단)
          updateData: null,
        },
      },
    });

    const request = createTestRequest(`/api/arrangements/${ARRANGEMENT_ID}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: '수정 시도' }),
    });

    const response = await PATCH(request, createRouteContext({ id: ARRANGEMENT_ID }));
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error).toContain('권한');
  });
});

describe('DELETE /api/arrangements/[id]', () => {
  it('정상 삭제 성공', async () => {
    setupAuthenticatedSupabase({
      tables: {
        arrangements: { deleteData: null },
      },
    });

    const request = createTestRequest(`/api/arrangements/${ARRANGEMENT_ID}`, {
      method: 'DELETE',
    });

    const response = await DELETE(request, createRouteContext({ id: ARRANGEMENT_ID }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty('success', true);
  });
});
