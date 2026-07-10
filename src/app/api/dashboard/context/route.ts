import { NextResponse } from 'next/server';

import {
  type DashboardContext,
  determineTimeContext,
  formatVoteDeadlineDisplay,
  getDayOfWeek,
  getNextSunday,
  isToday,
} from '@/lib/dashboard-context';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { getServiceDeadline } from '@/lib/vote-deadlines';

/**
 * 대시보드 컨텍스트 API
 *
 * 현재 사용자의 시간 컨텍스트, 다음 예배 정보, 투표 마감 정보 등을 반환합니다.
 */
export async function GET() {
  try {
    const supabase = await createClient();

    // 현재 사용자 확인
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    // 프로필 정보 조회 (linked_member_id 확인용)
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('linked_member_id, link_status')
      .eq('id', user.id)
      .single();

    const linkedMemberId = profile?.linked_member_id;
    const isLinked = !!linkedMemberId && profile?.link_status === 'approved';

    // Admin 클라이언트로 데이터 조회 (RLS 우회)
    const adminSupabase = await createAdminClient();

    const nextSunday = getNextSunday();

    // 독립적인 4개 쿼리를 병렬 실행
    const [serviceSchedulesResult, voteDeadlineResult, attendanceResult, arrangementResult] =
      await Promise.all([
        // 1. 다음 예배 정보 조회
        adminSupabase
          .from('service_schedules')
          .select('*')
          .eq('date', nextSunday)
          .order('service_start_time', { ascending: true, nullsFirst: false }),

        // 2. 투표 마감 정보 조회
        adminSupabase
          .from('attendance_vote_deadlines')
          .select('deadline_at')
          .eq('service_date', nextSunday)
          .maybeSingle(),

        // 3. 내 투표 여부 확인 (연결된 대원이 있을 경우)
        isLinked && linkedMemberId
          ? adminSupabase
              .from('attendances')
              .select('id')
              .eq('member_id', linkedMemberId)
              .eq('date', nextSunday)
              .maybeSingle()
          : Promise.resolve({ data: null }),

        // 4. 배치표 상태 확인
        adminSupabase
          .from('arrangements')
          .select('id, status')
          .eq('date', nextSunday)
          .maybeSingle(),
      ]);

    // 결과 처리
    const serviceSchedules = serviceSchedulesResult.data;
    const serviceSchedule =
      serviceSchedules?.find((s) => s.service_type === '주일 2부 예배') ??
      serviceSchedules?.[0] ??
      null;

    // 관리자가 명시 설정한 마감이 없으면 기본 규칙(예배 전날 토요일 15:00 KST)으로 폴백
    // — my-attendance 페이지 및 attendance-vote-guard와 동일한 판정 규칙
    const deadlineAt =
      voteDeadlineResult.data?.deadline_at || getServiceDeadline(nextSunday).toISOString();
    const isVotePassed = new Date(deadlineAt) < new Date();

    const hasVoted = !!attendanceResult.data;

    const arrangement = arrangementResult.data;
    const hasArrangement = !!arrangement;
    const arrangementStatus = (arrangement?.status as 'DRAFT' | 'SHARED' | 'CONFIRMED') || null;

    // 시간 컨텍스트 결정
    const timeContext = determineTimeContext({
      hasVoted,
      isVotePassed,
      hasArrangement,
      arrangementStatus,
      isServiceDay: isToday(nextSunday),
      hasUpcomingService: true,
    });

    // 마감 시간 표시용 포맷
    const voteDeadlineDisplay = formatVoteDeadlineDisplay(deadlineAt);

    const response: DashboardContext = {
      timeContext,
      nextServiceDate: nextSunday,
      nextServiceInfo: {
        date: nextSunday,
        dayOfWeek: getDayOfWeek(nextSunday),
        serviceType: serviceSchedule?.service_type || null,
        hymnName: serviceSchedule?.hymn_name || null,
        hoodColor: serviceSchedule?.hood_color || null,
        serviceStartTime: serviceSchedule?.service_start_time || null,
        prePracticeStartTime: serviceSchedule?.pre_practice_start_time || null,
      },
      voteDeadline: deadlineAt,
      voteDeadlineDisplay,
      isVotePassed,
      hasArrangement,
      arrangementStatus,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Dashboard Context Error:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
