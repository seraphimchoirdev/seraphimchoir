import { createClient } from '@/lib/supabase/server';
import {
  getPracticeDeadline,
  getServiceDeadline,
  isDeadlinePassed,
} from '@/lib/vote-deadlines';

type ServerClient = Awaited<ReturnType<typeof createClient>>;

export type VoteGuardResult =
  | { ok: true }
  | { ok: false; status: number; error: string };

/**
 * 일반 대원(MEMBER)의 본인 출석 투표 검증 (서버 전용).
 *
 * - 본인(linked_member) 레코드인지 확인
 * - 투표 마감 검증: 클라이언트가 실제로 변경하려는 항목만 검사
 *   (등단 마감 후에도 연습 투표는 가능해야 하므로 필드별로 분리)
 * - 마감 규칙은 프론트와 동일한 src/lib/vote-deadlines.ts를 공유하되,
 *   관리자가 attendance_vote_deadlines에 마감을 명시 설정했으면 그 값을 우선
 *
 * 운영진(ADMIN/CONDUCTOR/MANAGER/PART_LEADER)의 마감 후 정정은
 * 이 가드를 타지 않으므로 기존 워크플로가 유지된다.
 */
export async function validateMemberSelfVote(
  supabase: ServerClient,
  userId: string,
  opts: {
    memberId: string;
    date: string;
    serviceScheduleId?: string | null;
    /** is_service_available 변경 여부 */
    votesService: boolean;
    /** practice_status / is_practice_attended 변경 여부 */
    votesPractice: boolean;
  }
): Promise<VoteGuardResult> {
  // 1) 본인 레코드 확인
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('linked_member_id, link_status')
    .eq('id', userId)
    .single();

  if (
    !profile?.linked_member_id ||
    profile.link_status !== 'approved' ||
    profile.linked_member_id !== opts.memberId
  ) {
    return { ok: false, status: 403, error: '본인 출석만 수정할 수 있습니다' };
  }

  // 2) 등단 투표 마감 검증
  if (opts.votesService) {
    const { data: custom } = await supabase
      .from('attendance_vote_deadlines')
      .select('deadline_at')
      .eq('service_date', opts.date)
      .maybeSingle();

    const deadline = custom?.deadline_at
      ? new Date(custom.deadline_at)
      : getServiceDeadline(opts.date);

    if (isDeadlinePassed(deadline)) {
      return { ok: false, status: 403, error: '등단 투표가 마감되었습니다' };
    }
  }

  // 3) 연습 참석 투표 마감 검증
  if (opts.votesPractice) {
    let startTime: string | null = null;
    if (opts.serviceScheduleId) {
      const { data: schedule } = await supabase
        .from('service_schedules')
        .select('post_practice_start_time')
        .eq('id', opts.serviceScheduleId)
        .maybeSingle();
      startTime = schedule?.post_practice_start_time ?? null;
    }

    if (isDeadlinePassed(getPracticeDeadline(opts.date, startTime))) {
      return {
        ok: false,
        status: 403,
        error: '연습 참석 투표가 마감되었습니다',
      };
    }
  }

  return { ok: true };
}
