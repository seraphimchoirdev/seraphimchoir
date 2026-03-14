/**
 * GET /api/auth/me 통합 테스트
 */
import {
  createTestRequest,
  setupAuthenticatedSupabase,
  setupUnauthenticatedSupabase,
} from '@/__tests__/helpers/api-route-helpers';

import { GET } from '../route';

describe('GET /api/auth/me', () => {
  it('미인증 시 401 반환', async () => {
    setupUnauthenticatedSupabase();

    const request = createTestRequest('/api/auth/me');
    const response = await GET(request);

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toContain('인증되지 않은 사용자');
  });

  it('정상 조회 시 200 (user + profile)', async () => {
    const mockProfile = {
      id: 'test-user-id',
      email: 'test@test.com',
      name: '테스트 사용자',
      role: 'ADMIN',
      linked_member_id: null,
    };

    setupAuthenticatedSupabase({
      tables: {
        user_profiles: { selectData: mockProfile },
      },
    });

    const request = createTestRequest('/api/auth/me');
    const response = await GET(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty('user');
    expect(body).toHaveProperty('profile');
    expect(body.user.id).toBe('test-user-id');
    expect(body.profile.name).toBe('테스트 사용자');
  });

  it('프로필 없음 시 404', async () => {
    setupAuthenticatedSupabase({
      tables: {
        user_profiles: { error: { message: 'not found', code: 'PGRST116' } },
      },
    });

    const request = createTestRequest('/api/auth/me');
    const response = await GET(request);

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toContain('프로필을 찾을 수 없습니다');
  });

  it('DB 에러 시 500', async () => {
    setupAuthenticatedSupabase({
      tables: {
        user_profiles: { error: { message: 'DB error', code: 'INTERNAL' } },
      },
    });

    const request = createTestRequest('/api/auth/me');
    const response = await GET(request);

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toContain('오류가 발생했습니다');
  });
});
