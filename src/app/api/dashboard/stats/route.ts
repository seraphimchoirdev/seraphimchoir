import { addDays, endOfMonth, format, startOfMonth, startOfWeek } from 'date-fns';

import { NextResponse } from 'next/server';

import { createAdminClient } from '@/lib/supabase/server';

/**
 * 대시보드 통계 API
 * Admin 클라이언트를 사용하여 RLS를 우회합니다.
 * 대시보드 통계는 인증된 사용자에게 공개되는 집계 정보이므로 Admin 클라이언트 사용이 적절합니다.
 */
export async function GET() {
  try {
    const supabase = await createAdminClient();
    const now = new Date();

    // 1. 총 찬양대원 (REGULAR 또는 NEW 상태인 대원 - 활동 중인 대원)
    const { count: totalMembers, error: membersError } = await supabase
      .from('members')
      .select('*', { count: 'exact', head: true })
      .in('member_status', ['REGULAR', 'NEW']);

    if (membersError) throw membersError;

    // 2. 이번 주 출석률 (가장 최근 주일 기준)
    const thisSunday = startOfWeek(now, { weekStartsOn: 0 });
    const nextSunday = addDays(thisSunday, 7);
    const thisSundayStr = format(thisSunday, 'yyyy-MM-dd');
    const nextSundayStr = format(nextSunday, 'yyyy-MM-dd');

    const { data: attendanceData, error: attendanceError } = await supabase
      .from('attendances')
      .select('is_service_available, member_id')
      .gte('date', thisSundayStr)
      .lt('date', nextSundayStr);

    if (attendanceError) throw attendanceError;

    // 3. 확정된 배치표 (이번 달 기준)
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const monthStartStr = format(monthStart, 'yyyy-MM-dd');
    const monthEndStr = format(monthEnd, 'yyyy-MM-dd');

    const { count: arrangementsCount, error: arrangementsError } = await supabase
      .from('arrangements')
      .select('*', { count: 'exact', head: true })
      .gte('date', monthStartStr)
      .lte('date', monthEndStr);

    if (arrangementsError) throw arrangementsError;

    // 4. 이번 주 예배/연습 곡
    const { data: weeklySchedules, error: schedulesError } = await supabase
      .from('service_schedules')
      .select('hymn_name')
      .gte('date', thisSundayStr)
      .lt('date', nextSundayStr)
      .not('hymn_name', 'is', null);

    if (schedulesError) throw schedulesError;

    // 출석률 계산
    let attendanceRate = 0;
    if (attendanceData && attendanceData.length > 0 && totalMembers && totalMembers > 0) {
      const availableCount = attendanceData.filter((a) => a.is_service_available === true).length;
      attendanceRate = Math.round((availableCount / totalMembers) * 100);
    }

    return NextResponse.json({
      totalMembers: totalMembers || 0,
      attendanceRate: attendanceRate,
      arrangementsCount: arrangementsCount || 0,
      practiceSongsCount: weeklySchedules?.length || 0,
    });
  } catch (error) {
    console.error('Dashboard Stats Error:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
