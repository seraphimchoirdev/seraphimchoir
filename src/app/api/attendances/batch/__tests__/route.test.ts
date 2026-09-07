/**
 * POST /api/attendances/batch 회귀 테스트
 *
 * 이 라우트는 출석 화면의 유일한 저장 경로인데 테스트가 없었다. 여기서 고정하는
 * 두 가지는 모두 "조용히 실패하는" 종류라 화면만 봐서는 알 수 없다:
 *
 *   1. zod strip — 스키마에 없는 키는 에러 없이 버려진다. 이 프로젝트는
 *      composer·service_start_time·pre_practice_start_time에서 이미 세 번 겪었다.
 *      필드를 보냈는데 DB에 안 들어가고, 아무도 에러를 못 본다.
 *
 *   2. is_service_available의 default(true) — 신입대원은 등단하지 않으므로
 *      false로 저장돼야 한다. 값이 뒤집히면 "신입일 때도 매주 등단했다"는
 *      잘못된 이력이 남고, 승격 후에야 드러난다.
 *
 * 검증 방식: 응답 코드가 아니라 upsert에 실제로 넘어간 인자를 본다. 응답이
 * 200이어도 필드가 버려졌으면 버그이기 때문이다.
 */
import {
  createTestRequest,
  setupAuthenticatedSupabase,
  setupUnauthenticatedSupabase,
} from '@/__tests__/helpers/api-route-helpers';

import { POST } from '../route';

const SCHEDULE_ID = '550e8400-e29b-41d4-a716-446655440099';
const 신입 = '550e8400-e29b-41d4-a716-446655440001';
const 정대원 = '550e8400-e29b-41d4-a716-446655440002';

/**
 * batch POST가 통과하는 데 필요한 최소 mock.
 * - service_schedules: 일정 존재 확인(checkServiceScheduleExists)
 * - arrangements: 배치표 없음 → is_service_available 덮어쓰기 로직 비활성
 * - members: 파트 조회 (ADMIN이므로 검증에는 안 쓰이지만 호출은 된다)
 */
function setup() {
  return setupAuthenticatedSupabase({
    role: 'ADMIN',
    tables: {
      service_schedules: { selectData: { id: SCHEDULE_ID } },
      arrangements: { selectData: [] },
      members: {
        selectData: [
          { id: 신입, part: 'TENOR' },
          { id: 정대원, part: 'TENOR' },
        ],
      },
      attendances: { upsertData: [] },
    },
  });
}

/**
 * batch POST 요청을 만든다.
 *
 * createTestRequest는 RequestInit을 그대로 NextRequest에 넘기므로 body는 웹 표준대로
 * 문자열이어야 한다. 객체를 그냥 넣으면 "[object Object]"가 되어 request.json()이
 * SyntaxError를 던지고, 라우트의 catch가 이를 500으로 삼켜 원인이 드러나지 않는다.
 */
function 요청(attendances: Array<Record<string, unknown>>) {
  return createTestRequest('/api/attendances/batch', {
    method: 'POST',
    body: JSON.stringify({ attendances }),
  });
}

/** upsert에 실제로 넘어간 행 배열을 꺼낸다 */
function 저장된_행들(mockClient: ReturnType<typeof setupAuthenticatedSupabase>) {
  const builder = mockClient.from('attendances');
  const calls = (builder.upsert as jest.Mock).mock.calls;
  expect(calls.length).toBeGreaterThan(0);
  return calls[0][0] as Array<Record<string, unknown>>;
}

describe('POST /api/attendances/batch — 권한', () => {
  it('미인증 시 401', async () => {
    setupUnauthenticatedSupabase();

    const request = 요청([
          { member_id: 신입, date: '2026-08-23', service_schedule_id: SCHEDULE_ID },
        ]);

    expect((await POST(request)).status).toBe(401);
  });

  it('권한 없는 역할은 403', async () => {
    setupAuthenticatedSupabase({ role: 'MEMBER' });

    const request = 요청([
          { member_id: 신입, date: '2026-08-23', service_schedule_id: SCHEDULE_ID },
        ]);

    expect((await POST(request)).status).toBe(403);
  });
});

describe('POST /api/attendances/batch — pre_practice_attended (zod strip 회귀)', () => {
  it('전연습 참석 값이 버려지지 않고 저장된다', async () => {
    const client = setup();

    const request = 요청([
          {
            member_id: 신입,
            date: '2026-08-23',
            service_schedule_id: SCHEDULE_ID,
            is_service_available: false,
            is_practice_attended: true,
            pre_practice_attended: true,
          },
        ]);

    await POST(request);

    expect(저장된_행들(client)[0]).toMatchObject({
      member_id: 신입,
      pre_practice_attended: true,
    });
  });

  it('불참(false)도 그대로 저장된다', async () => {
    const client = setup();

    const request = 요청([
          {
            member_id: 신입,
            date: '2026-08-23',
            service_schedule_id: SCHEDULE_ID,
            pre_practice_attended: false,
          },
        ]);

    await POST(request);

    expect(저장된_행들(client)[0].pre_practice_attended).toBe(false);
  });

  // 이 필드에 default(true)를 주면 안 되는 이유를 고정한다.
  // 파트장이 체크하지 않은 항목에 기본값이 들어가면, 화면을 열고 저장만 해도
  // 전연습에 참석한 것으로 기록돼 세트가 부풀려진다.
  it('전연습을 보내지 않으면 기본값이 채워지지 않는다', async () => {
    const client = setup();

    const request = 요청([
          { member_id: 정대원, date: '2026-08-23', service_schedule_id: SCHEDULE_ID },
        ]);

    await POST(request);

    expect(저장된_행들(client)[0].pre_practice_attended).toBeUndefined();
  });
});

describe('POST /api/attendances/batch — is_service_available (payload 오염 회귀)', () => {
  // 신입대원은 등단하지 않는다. 명시적으로 false를 보내면 그대로 저장돼야 하고,
  // zod의 default(true)가 이를 덮어쓰면 안 된다.
  it('명시적으로 보낸 false가 true로 뒤집히지 않는다', async () => {
    const client = setup();

    const request = 요청([
          {
            member_id: 신입,
            date: '2026-08-23',
            service_schedule_id: SCHEDULE_ID,
            is_service_available: false,
          },
        ]);

    await POST(request);

    expect(저장된_행들(client)[0].is_service_available).toBe(false);
  });

  // 기존 동작 고정 — 정대원은 생략 시 등단으로 본다("레코드 없음 = 참석" 규약).
  // 신입 지원을 추가하면서 이 동작이 바뀌면 기존 파트장 워크플로가 깨진다.
  it('생략하면 기존대로 true가 채워진다', async () => {
    const client = setup();

    const request = 요청([
          { member_id: 정대원, date: '2026-08-23', service_schedule_id: SCHEDULE_ID },
        ]);

    await POST(request);

    expect(저장된_행들(client)[0].is_service_available).toBe(true);
  });

  // 신입과 정대원이 한 payload에 섞여 들어오는 것이 실제 저장 형태다
  // (출석 화면은 보이는 전원을 스냅샷으로 upsert한다).
  it('신입과 정대원이 섞여도 각자의 값이 유지된다', async () => {
    const client = setup();

    const request = 요청([
          {
            member_id: 신입,
            date: '2026-08-23',
            service_schedule_id: SCHEDULE_ID,
            is_service_available: false,
            pre_practice_attended: true,
          },
          {
            member_id: 정대원,
            date: '2026-08-23',
            service_schedule_id: SCHEDULE_ID,
            is_service_available: true,
          },
        ]);

    await POST(request);

    const rows = 저장된_행들(client);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ is_service_available: false, pre_practice_attended: true });
    expect(rows[1]).toMatchObject({ is_service_available: true });
    expect(rows[1].pre_practice_attended).toBeUndefined();
  });
});
