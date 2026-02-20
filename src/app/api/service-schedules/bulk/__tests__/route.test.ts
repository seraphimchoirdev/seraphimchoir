/**
 * POST /api/service-schedules/bulk 통합 테스트
 */
import {
  createTestRequest,
  setupAuthenticatedSupabase,
  setupUnauthenticatedSupabase,
} from '@/__tests__/helpers/api-route-helpers';

import { POST } from '../route';

describe('POST /api/service-schedules/bulk', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('미인증 시 401', async () => {
    setupUnauthenticatedSupabase();

    const request = createTestRequest('/api/service-schedules/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ schedules: [] }),
    });
    const response = await POST(request);

    expect(response.status).toBe(401);
  });

  it('Zod 검증 실패 (잘못된 형식) -> 400', async () => {
    setupAuthenticatedSupabase({
      tables: {
        service_schedules: { upsertData: [] },
      },
    });

    const request = createTestRequest('/api/service-schedules/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        schedules: [{ date: 'not-a-date', service_type: '주일예배' }],
      }),
    });
    const response = await POST(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('Validation');
  });

  it('정상 upsert 201', async () => {
    const upserted = [
      { id: 's1', date: '2024-03-03', service_type: '주일예배' },
      { id: 's2', date: '2024-03-10', service_type: '주일예배' },
    ];

    setupAuthenticatedSupabase({
      tables: {
        service_schedules: { upsertData: upserted },
      },
    });

    const request = createTestRequest('/api/service-schedules/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        schedules: [
          { date: '2024-03-03', service_type: '주일예배' },
          { date: '2024-03-10', service_type: '주일예배' },
        ],
      }),
    });
    const response = await POST(request);

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.data).toHaveLength(2);
    expect(body.count).toBe(2);
  });

  it('DB 에러 시 500', async () => {
    setupAuthenticatedSupabase({
      tables: {
        service_schedules: {
          error: { message: 'Upsert failed', code: 'DB_ERR' },
        },
      },
    });

    const request = createTestRequest('/api/service-schedules/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        schedules: [{ date: '2024-03-03', service_type: '주일예배' }],
      }),
    });
    const response = await POST(request);

    expect(response.status).toBe(500);
  });
});
