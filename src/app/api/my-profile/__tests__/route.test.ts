/**
 * GET/PATCH /api/my-profile 통합 테스트
 */
import {
  createTestRequest,
  setupAuthenticatedSupabase,
  setupUnauthenticatedSupabase,
} from '@/__tests__/helpers/api-route-helpers';

import { GET, PATCH } from '../route';

describe('GET /api/my-profile', () => {
  it('미인증 → 401', async () => {
    setupUnauthenticatedSupabase();

    const response = await GET();

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe('인증이 필요합니다.');
  });

  it('정상 조회 200 (profile + member JOIN)', async () => {
    const mockProfile = {
      id: 'test-user-id',
      email: 'test@test.com',
      name: '테스트',
      role: 'ADMIN',
      linked_member_id: 'member-1',
      link_status: 'approved',
      member: {
        id: 'member-1',
        name: '김소프',
        part: 'SOPRANO',
        height_cm: 165,
        regular_member_since: '2024-01-01',
      },
    };

    setupAuthenticatedSupabase({
      tables: {
        user_profiles: { selectData: mockProfile },
        member_last_attendance: {
          selectData: {
            last_service_date: '2026-02-16',
            last_practice_date: '2026-02-15',
          },
        },
      },
    });

    const response = await GET();

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.email).toBe('test@test.com');
    expect(body.member).toBeTruthy();
    expect(body.member.name).toBe('김소프');
    expect(body.member.last_service_date).toBe('2026-02-16');
  });

  it('프로필 없음 → 404', async () => {
    setupAuthenticatedSupabase({
      tables: {
        user_profiles: {
          error: { message: 'not found' },
        },
      },
    });

    const response = await GET();

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toBe('프로필을 찾을 수 없습니다.');
  });
});

describe('PATCH /api/my-profile', () => {
  it('미인증 → 401', async () => {
    setupUnauthenticatedSupabase();

    const request = createTestRequest('/api/my-profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ height_cm: 170 }),
    });
    const response = await PATCH(request);

    expect(response.status).toBe(401);
  });

  it('정상 수정 200', async () => {
    setupAuthenticatedSupabase({
      tables: {
        user_profiles: {
          selectData: { linked_member_id: 'member-1', link_status: 'approved' },
        },
        members: { updateData: null },
      },
    });

    const request = createTestRequest('/api/my-profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ height_cm: 170 }),
    });
    const response = await PATCH(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
  });

  it('유효하지 않은 키(height_cm) → 400', async () => {
    setupAuthenticatedSupabase({
      tables: {
        user_profiles: {
          selectData: { linked_member_id: 'member-1', link_status: 'approved' },
        },
      },
    });

    const request = createTestRequest('/api/my-profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ height_cm: 50 }), // 100 미만
    });
    const response = await PATCH(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('100cm ~ 250cm');
  });

  it('연결된 대원 없음 → 400', async () => {
    setupAuthenticatedSupabase({
      tables: {
        user_profiles: {
          selectData: { linked_member_id: null, link_status: 'pending' },
        },
      },
    });

    const request = createTestRequest('/api/my-profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ height_cm: 170 }),
    });
    const response = await PATCH(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('연결된 대원이 없습니다.');
  });

  it('수정할 내용 없음 → 400', async () => {
    setupAuthenticatedSupabase({
      tables: {
        user_profiles: {
          selectData: { linked_member_id: 'member-1', link_status: 'approved' },
        },
      },
    });

    const request = createTestRequest('/api/my-profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const response = await PATCH(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('수정할 내용이 없습니다.');
  });

  it('잘못된 정대원 임명일 형식 → 400', async () => {
    setupAuthenticatedSupabase({
      tables: {
        user_profiles: {
          selectData: { linked_member_id: 'member-1', link_status: 'approved' },
        },
      },
    });

    const request = createTestRequest('/api/my-profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ regular_member_since: '2026/01/01' }),
    });
    const response = await PATCH(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('YYYY-MM-DD');
  });
});
