/**
 * 신입대원 연습 세트 집계 API.
 *
 * 신입대원이 정대원으로 승격하려면 "예배 전 연습 + 예배 후 연습"(=1세트)을 정해진
 * 횟수만큼 채워야 한다. 지금까지 파트장이 수첩에 손으로 세던 숫자를 대신 센다.
 *
 * 세트 판정 규칙은 여기에 두지 않는다. src/lib/practice-set-rule.ts가 단일 출처다.
 * 이 프로젝트는 같은 도메인 규칙을 여러 곳에 하드코딩했다가 데이터가 오염된 사고를
 * 두 번 겪었다(후연습 플래그, 전연습 시각). 이 라우트는 데이터를 모아 규칙 모듈에
 * 넘기는 일만 한다.
 */
import { NextResponse } from 'next/server';

import { createLogger } from '@/lib/logger';
import {
  type PracticeSetInput,
  type PracticeSetProgress,
  calculatePracticeSetProgress,
} from '@/lib/practice-set-rule';
import { createClient } from '@/lib/supabase/server';

const logger = createLogger({ prefix: 'MemberPracticeSetsAPI' });

export interface MemberPracticeSetProgress extends PracticeSetProgress {
  memberId: string;
}

export interface MemberPracticeSetsResponse {
  /** 신입대원 id → 진행 상황. 배열이 아니라 맵인 이유는 아래 주석 참고 */
  data: Record<string, MemberPracticeSetProgress>;
}

/** Supabase 한 번에 가져올 수 있는 행 수 상한 */
const PAGE_SIZE = 1000;

/**
 * GET /api/members/practice-sets
 *
 * 신입대원(member_status='NEW') 전원의 세트 진행 상황을 반환한다.
 *
 * 파라미터를 받지 않는다. 대원 목록 화면이 통째로 필요로 하고, 신입은 많아야 수십
 * 명이라 페이지네이션과 맞물릴 이유가 없다. 대원 목록은 페이지를 넘겨도 신입 배지가
 * 그대로 보여야 하는데, 목록의 페이지네이션에 집계를 맞추면 2페이지의 신입은
 * 세트 수가 안 나온다.
 *
 * 응답이 배열이 아니라 id를 키로 한 객체인 것도 같은 이유다. 화면은 대원 행을 그리다가
 * "이 사람이 신입이면 세트 수"를 찾으므로, 매 행마다 배열을 훑지 않고 바로 꺼내 쓴다.
 */
export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
    }

    // 1) 신입대원 목록
    //
    // members_public 뷰를 쓴다. required_practice_sets가 이 뷰에 포함되어 있고
    // (20260818000000 마이그레이션), 다른 조회 경로도 모두 뷰를 거친다.
    const { data: newMembers, error: membersError } = await supabase
      .from('members_public')
      .select('id, required_practice_sets')
      .eq('member_status', 'NEW');

    if (membersError) {
      logger.error('신입대원 조회 실패:', membersError);
      return NextResponse.json({ error: '신입대원 목록을 불러오는데 실패했습니다' }, { status: 500 });
    }

    // 신입이 없으면 출석·스케줄을 조회할 이유가 없다. 빈 in() 필터는 Supabase에서
    // "조건 없음"으로 해석될 여지가 있어 전체 스캔이 되므로 명시적으로 끊는다.
    if (!newMembers || newMembers.length === 0) {
      return NextResponse.json({ data: {} } satisfies MemberPracticeSetsResponse, { status: 200 });
    }

    const memberIds = newMembers.map((m) => m.id);

    // 2) 신입대원들의 출석 기록 전량
    //
    // 기간을 자르지 않는다. 세트는 입단 후 누적이고 목표가 2~6세트라 행 수가 적다.
    // 기간을 자르면 "언제부터"를 정하는 규칙이 또 하나 생기고, 그 규칙이 화면과
    // 어긋나는 순간 승격 근거 숫자가 틀린다.
    const attendances: {
      member_id: string;
      date: string;
      service_schedule_id: string | null;
      pre_practice_attended: boolean | null;
      practice_status: PracticeSetInput['practice_status'];
      is_practice_attended: boolean | null;
    }[] = [];

    for (let page = 0; ; page++) {
      const from = page * PAGE_SIZE;

      const { data: pageData, error: pageError } = await supabase
        .from('attendances')
        .select('member_id, date, service_schedule_id, pre_practice_attended, practice_status, is_practice_attended')
        .in('member_id', memberIds)
        .range(from, from + PAGE_SIZE - 1);

      if (pageError) {
        logger.error('출석 기록 조회 실패:', pageError);
        return NextResponse.json(
          { error: '출석 기록을 불러오는데 실패했습니다' },
          { status: 500 }
        );
      }

      if (!pageData || pageData.length === 0) break;
      attendances.push(...pageData);
      if (pageData.length < PAGE_SIZE) break;
    }

    // 3) 예배별 후연습 유무
    //
    // 세트 판정에 has_post_practice가 필요한데 이 값은 service_schedules에 있다.
    // attendances.service_schedule_id는 FK지만 **nullable**이다 — 이 컬럼이 생기기
    // 전에 쌓인 행은 비어 있어서, FK만 믿으면 레거시 기록이 통째로 "후연습 없음"이
    // 되어 세트에서 빠진다. 그래서 id와 date 두 가지로 찾을 수 있게 맵을 둘 만든다.
    const scheduleById = new Map<string, boolean | null>();
    const scheduleByDate = new Map<string, boolean | null>();

    for (let page = 0; ; page++) {
      const from = page * PAGE_SIZE;

      const { data: pageData, error: pageError } = await supabase
        .from('service_schedules')
        .select('id, date, has_post_practice')
        .range(from, from + PAGE_SIZE - 1);

      if (pageError) {
        logger.error('예배 일정 조회 실패:', pageError);
        return NextResponse.json(
          { error: '예배 일정을 불러오는데 실패했습니다' },
          { status: 500 }
        );
      }

      if (!pageData || pageData.length === 0) break;

      for (const schedule of pageData) {
        scheduleById.set(schedule.id, schedule.has_post_practice);
        // 같은 날짜에 예배가 둘 이상일 수 있다(주일 2부 + 오후찬양예배). 후연습이
        // 있는 쪽을 남긴다 — date 폴백은 FK가 없는 레거시 행을 구제하려는 것이므로,
        // 그날 후연습이 있었다면 그 예배의 기록으로 보는 편이 실제에 가깝다.
        const existing = scheduleByDate.get(schedule.date);
        if (existing !== true) {
          scheduleByDate.set(schedule.date, schedule.has_post_practice);
        }
      }

      if (pageData.length < PAGE_SIZE) break;
    }

    // 4) 대원별로 묶어 규칙 모듈에 넘긴다
    const recordsByMember = new Map<string, PracticeSetInput[]>();

    for (const attendance of attendances) {
      const hasPostPractice = attendance.service_schedule_id
        ? (scheduleById.get(attendance.service_schedule_id) ?? null)
        : (scheduleByDate.get(attendance.date) ?? null);

      const list = recordsByMember.get(attendance.member_id);
      const record: PracticeSetInput = {
        pre_practice_attended: attendance.pre_practice_attended,
        practice_status: attendance.practice_status,
        is_practice_attended: attendance.is_practice_attended,
        has_post_practice: hasPostPractice,
      };

      if (list) {
        list.push(record);
      } else {
        recordsByMember.set(attendance.member_id, [record]);
      }
    }

    const data: Record<string, MemberPracticeSetProgress> = {};

    for (const member of newMembers) {
      // 출석 기록이 없는 신입도 응답에 넣는다. 빠뜨리면 화면이 "아직 안 불러왔다"와
      // "0세트다"를 구분할 수 없어 배지가 사라진다.
      const progress = calculatePracticeSetProgress(
        recordsByMember.get(member.id) ?? [],
        member.required_practice_sets
      );

      data[member.id] = { memberId: member.id, ...progress };
    }

    return NextResponse.json({ data } satisfies MemberPracticeSetsResponse, { status: 200 });
  } catch (error) {
    logger.error('GET /api/members/practice-sets 실패:', error);
    return NextResponse.json({ error: '연습 세트 집계에 실패했습니다' }, { status: 500 });
  }
}
