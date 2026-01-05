/**
 * 대원별 출석 통계 API
 * 각 대원의 출석률을 계산하여 반환합니다.
 * - 출석 기록이 없는 날짜는 미등단으로 처리
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export interface MemberAttendanceStats {
  memberId: string;
  memberName: string;
  part: 'SOPRANO' | 'ALTO' | 'TENOR' | 'BASS' | 'SPECIAL';
  totalRecords: number;      // 실제 기록 수
  expectedRecords: number;   // 예상 기록 수 (총 예배 횟수)
  availableCount: number;    // 등단 횟수
  unavailableCount: number;  // 미등단 횟수 (기록된 미등단 + 누락된 기록)
  missingRecords: number;    // 누락된 기록 수
  attendanceRate: number;    // 출석률 (등단 / 총 예배 횟수)
}

export interface MemberAttendanceStatsResponse {
  members: MemberAttendanceStats[];
  period: {
    startDate: string;
    endDate: string;
    totalServiceDates: number;  // 해당 기간 총 예배 횟수
  };
  summary: {
    totalMembers: number;
    averageAttendanceRate: number;
  };
}

/**
 * GET /api/attendances/stats/members
 * 대원별 출석 통계 조회
 *
 * Query params:
 * - start_date: 시작 날짜 (YYYY-MM-DD)
 * - end_date: 종료 날짜 (YYYY-MM-DD)
 * - part: 특정 파트만 필터링 (optional)
 * - sort_by: 정렬 기준 (attendance_rate, name, total_records) default: attendance_rate
 * - order: 정렬 순서 (asc, desc) default: desc
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 인증 확인
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const part = searchParams.get('part');
    const sortBy = searchParams.get('sort_by') || 'attendance_rate';
    const order = searchParams.get('order') || 'desc';

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: '시작 날짜와 종료 날짜는 필수입니다' },
        { status: 400 }
      );
    }

    // 1. 해당 기간의 모든 예배 날짜 조회 (distinct)
    const { data: serviceDatesData, error: serviceDatesError } = await supabase
      .from('attendances')
      .select('date')
      .gte('date', startDate)
      .lte('date', endDate);

    if (serviceDatesError) {
      console.error('Service dates query error:', serviceDatesError);
      return NextResponse.json(
        { error: '예배 날짜 조회에 실패했습니다' },
        { status: 500 }
      );
    }

    // 중복 제거하여 예배 날짜 목록 생성
    const serviceDatesSet = new Set<string>();
    for (const row of serviceDatesData || []) {
      serviceDatesSet.add(row.date);
    }
    const serviceDates = Array.from(serviceDatesSet).sort();
    const totalServiceDates = serviceDates.length;

    // 2. 모든 정대원 목록 조회
    let membersQuery = supabase
      .from('members')
      .select('id, name, part')
      .eq('member_status', 'REGULAR');

    if (part) {
      membersQuery = membersQuery.eq('part', part);
    }

    const { data: members, error: membersError } = await membersQuery;

    if (membersError) {
      console.error('Members query error:', membersError);
      return NextResponse.json(
        { error: '대원 목록을 불러오는데 실패했습니다' },
        { status: 500 }
      );
    }

    // 3. 해당 기간의 출석 데이터 조회
    const { data: attendances, error: attendancesError } = await supabase
      .from('attendances')
      .select('member_id, date, is_service_available')
      .gte('date', startDate)
      .lte('date', endDate);

    if (attendancesError) {
      console.error('Attendances query error:', attendancesError);
      return NextResponse.json(
        { error: '출석 데이터를 불러오는데 실패했습니다' },
        { status: 500 }
      );
    }

    // 4. 대원별 출석 데이터 맵 생성
    const attendanceMap = new Map<string, Map<string, boolean>>();
    for (const attendance of attendances || []) {
      if (!attendanceMap.has(attendance.member_id)) {
        attendanceMap.set(attendance.member_id, new Map());
      }
      attendanceMap.get(attendance.member_id)!.set(attendance.date, attendance.is_service_available);
    }

    // 5. 대원별 통계 계산
    const memberStats: MemberAttendanceStats[] = [];

    for (const member of members || []) {
      // 대원의 출석 기록
      const memberAttendances = attendanceMap.get(member.id) || new Map<string, boolean>();

      let availableCount = 0;
      let recordedUnavailableCount = 0;

      // 실제 기록된 데이터 집계
      for (const [, isAvailable] of memberAttendances) {
        if (isAvailable) {
          availableCount++;
        } else {
          recordedUnavailableCount++;
        }
      }

      const totalRecords = memberAttendances.size;

      // 누락된 기록 수 (총 예배 횟수 - 실제 기록 수)
      const missingRecords = totalServiceDates - totalRecords;

      // 미등단 = 기록된 미등단 + 누락된 기록 (누락은 미등단으로 처리)
      const unavailableCount = recordedUnavailableCount + missingRecords;

      // 출석률 계산 (총 예배 횟수 기준)
      const attendanceRate = totalServiceDates > 0
        ? Math.round((availableCount / totalServiceDates) * 100 * 100) / 100
        : 0;

      memberStats.push({
        memberId: member.id,
        memberName: member.name,
        part: member.part as MemberAttendanceStats['part'],
        totalRecords,
        expectedRecords: totalServiceDates,
        availableCount,
        unavailableCount,
        missingRecords,
        attendanceRate,
      });
    }

    // 6. 정렬
    memberStats.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'name':
          comparison = a.memberName.localeCompare(b.memberName, 'ko');
          break;
        case 'total_records':
          comparison = a.totalRecords - b.totalRecords;
          break;
        case 'attendance_rate':
        default:
          comparison = a.attendanceRate - b.attendanceRate;
          break;
      }

      return order === 'asc' ? comparison : -comparison;
    });

    // 7. 요약 통계 계산
    const totalMembers = memberStats.length;
    const averageAttendanceRate = totalMembers > 0
      ? Math.round(
          (memberStats.reduce((sum, m) => sum + m.attendanceRate, 0) / totalMembers) * 100
        ) / 100
      : 0;

    const response: MemberAttendanceStatsResponse = {
      members: memberStats,
      period: {
        startDate,
        endDate,
        totalServiceDates,
      },
      summary: {
        totalMembers,
        averageAttendanceRate,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Member attendance stats error:', error);
    return NextResponse.json(
      { error: '대원별 출석 통계 조회에 실패했습니다' },
      { status: 500 }
    );
  }
}
