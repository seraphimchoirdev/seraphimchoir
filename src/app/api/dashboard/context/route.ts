import { NextResponse } from 'next/server';

import {
  type DashboardContext,
  determineTimeContext,
  formatDate,
  formatDisplayDate,
  getDayOfWeek,
  getNextSunday,
  isToday,
} from '@/lib/dashboard-context';
import { createClient, createAdminClient } from '@/lib/supabase/server';

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

    const today = formatDate(new Date());
    const nextSunday = getNextSunday();

    // 1. 다음 예배 정보 조회 (service_schedules)
    const { data: serviceSchedule } = await adminSupabase
      .from('service_schedules')
      .select('*')
      .eq('date', nextSunday)
      .maybeSingle();

    // 2. 투표 마감 정보 조회
    const { data: voteDeadline } = await adminSupabase
      .from('attendance_vote_deadlines')
      .select('deadline_at')
      .eq('service_date', nextSunday)
      .maybeSingle();

    const deadlineAt = voteDeadline?.deadline_at || null;
    const isVotePassed = deadlineAt ? new Date(deadlineAt) < new Date() : true;

    // 3. 내 투표 여부 확인 (연결된 대원이 있을 경우)
    let hasVoted = false;
    if (isLinked && linkedMemberId) {
      const { data: myAttendance } = await adminSupabase
        .from('attendances')
        .select('id')
        .eq('member_id', linkedMemberId)
        .eq('date', nextSunday)
        .maybeSingle();

      hasVoted = !!myAttendance;
    }

    // 4. 배치표 상태 확인
    const { data: arrangement } = await adminSupabase
      .from('arrangements')
      .select('id, status')
      .eq('date', nextSunday)
      .maybeSingle();

    const hasArrangement = !!arrangement;
    const arrangementStatus = (arrangement?.status as 'DRAFT' | 'SHARED' | 'CONFIRMED') || null;

    // 5. 시간 컨텍스트 결정
    const timeContext = determineTimeContext({
      hasVoted,
      isVotePassed,
      hasArrangement,
      arrangementStatus,
      isServiceDay: isToday(nextSunday),
      hasUpcomingService: true, // 항상 다음 주일이 있다고 가정
    });

    // 마감 시간 표시용 포맷
    let voteDeadlineDisplay: string | null = null;
    if (deadlineAt) {
      const deadline = new Date(deadlineAt);
      const dayOfWeek = getDayOfWeek(formatDate(deadline)).slice(0, 1); // "금"
      const hours = deadline.getHours();
      const minutes = deadline.getMinutes().toString().padStart(2, '0');
      voteDeadlineDisplay = `${dayOfWeek}요일 ${hours}:${minutes}`;
    }

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
