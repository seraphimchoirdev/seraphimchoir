/**
 * GET /api/members/practice-sets 통합 테스트
 *
 * 이 API가 내놓는 숫자는 "정대원으로 승격시켜도 되는가"의 근거로 화면에 뜬다.
 * 틀려도 화면에서는 그럴듯해 보이는 종류의 오류라(3/4인지 4/4인지 눈으로 검증 불가)
 * 데이터 결합 부분을 여기서 고정한다.
 *
 * 세트 판정 규칙 자체는 src/lib/__tests__/practice-set-rule.test.ts가 담당한다.
 * 여기서는 라우트가 규칙 모듈에 **올바른 재료를 넘기는지**만 본다 —
 * 특히 has_post_practice를 어느 예배에서 가져오는지.
 */
import {
  setupAuthenticatedSupabase,
  setupUnauthenticatedSupabase,
} from '@/__tests__/helpers/api-route-helpers';

import { GET } from '../route';

/** 세트가 성립하는 출석 기록 */
const 성립출석 = (덮어쓰기: Record<string, unknown> = {}) => ({
  member_id: 'new-1',
  date: '2026-08-02',
  service_schedule_id: 'sch-1',
  pre_practice_attended: true,
  practice_status: 'FULL',
  is_practice_attended: true,
  ...덮어쓰기,
});

describe('GET /api/members/practice-sets', () => {
  it('미인증 요청 시 401 반환', async () => {
    setupUnauthenticatedSupabase();

    const response = await GET();

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe('인증이 필요합니다');
  });

  it('신입대원이 없으면 빈 객체를 반환한다', async () => {
    setupAuthenticatedSupabase({
      tables: {
        members_public: { selectData: [] },
      },
    });

    const response = await GET();

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data).toEqual({});
  });

  it('완성된 세트를 세어 진행도를 반환한다', async () => {
    setupAuthenticatedSupabase({
      tables: {
        members_public: {
          selectData: [{ id: 'new-1', required_practice_sets: 4 }],
        },
        attendances: {
          selectData: [
            성립출석(),
            성립출석({ date: '2026-08-09' }),
            // 전연습 미기록 — 세트 불성립
            성립출석({ date: '2026-08-16', pre_practice_attended: null }),
          ],
        },
        service_schedules: {
          selectData: [
            { id: 'sch-1', date: '2026-08-02', has_post_practice: true },
          ],
        },
      },
    });

    const response = await GET();

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data['new-1']).toEqual({
      memberId: 'new-1',
      completed: 2,
      required: 4,
      isEligible: false,
    });
  });

  // 출석 기록이 하나도 없는 신입을 응답에서 빠뜨리면, 화면이 "아직 로딩 중"과
  // "0세트"를 구분하지 못해 배지가 통째로 사라진다.
  it('출석 기록이 없는 신입도 0세트로 포함한다', async () => {
    setupAuthenticatedSupabase({
      tables: {
        members_public: {
          selectData: [{ id: 'new-1', required_practice_sets: 4 }],
        },
        attendances: { selectData: [] },
        service_schedules: { selectData: [] },
      },
    });

    const response = await GET();

    const body = await response.json();
    expect(body.data['new-1']).toEqual({
      memberId: 'new-1',
      completed: 0,
      required: 4,
      isEligible: false,
    });
  });

  // service_schedule_id는 nullable이다. 이 컬럼이 생기기 전에 쌓인 출석 행은
  // 비어 있어서, FK만 믿으면 레거시 기록이 전부 "후연습 없음"으로 판정되어
  // 세트에서 조용히 빠진다. date로 폴백해야 한다.
  it('service_schedule_id가 없으면 날짜로 예배를 찾는다', async () => {
    setupAuthenticatedSupabase({
      tables: {
        members_public: {
          selectData: [{ id: 'new-1', required_practice_sets: 2 }],
        },
        attendances: {
          selectData: [
            성립출석({ service_schedule_id: null, date: '2026-08-02' }),
            성립출석({ service_schedule_id: null, date: '2026-08-09' }),
          ],
        },
        service_schedules: {
          selectData: [
            { id: 'sch-1', date: '2026-08-02', has_post_practice: true },
            { id: 'sch-2', date: '2026-08-09', has_post_practice: true },
          ],
        },
      },
    });

    const response = await GET();

    const body = await response.json();
    expect(body.data['new-1'].completed).toBe(2);
    expect(body.data['new-1'].isEligible).toBe(true);
  });

  // 후연습이 없는 예배(오후찬양예배·기도회 등)는 전연습을 나와도 세트가 아니다.
  it('후연습이 없는 예배의 기록은 세트로 세지 않는다', async () => {
    setupAuthenticatedSupabase({
      tables: {
        members_public: {
          selectData: [{ id: 'new-1', required_practice_sets: 4 }],
        },
        attendances: {
          selectData: [성립출석({ service_schedule_id: 'sch-no-post' })],
        },
        service_schedules: {
          selectData: [
            { id: 'sch-no-post', date: '2026-08-02', has_post_practice: false },
          ],
        },
      },
    });

    const response = await GET();

    const body = await response.json();
    expect(body.data['new-1'].completed).toBe(0);
  });

  it('목표를 채우면 승격 가능으로 표시한다', async () => {
    setupAuthenticatedSupabase({
      tables: {
        members_public: {
          selectData: [{ id: 'new-1', required_practice_sets: 2 }],
        },
        attendances: {
          selectData: [성립출석(), 성립출석({ date: '2026-08-09' })],
        },
        service_schedules: {
          selectData: [{ id: 'sch-1', date: '2026-08-02', has_post_practice: true }],
        },
      },
    });

    const response = await GET();

    const body = await response.json();
    expect(body.data['new-1'].isEligible).toBe(true);
  });

  it('신입대원 조회 실패 시 500 반환', async () => {
    setupAuthenticatedSupabase({
      tables: {
        members_public: {
          error: { message: 'DB 오류', code: '500' },
        },
      },
    });

    const response = await GET();

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe('신입대원 목록을 불러오는데 실패했습니다');
  });
});
