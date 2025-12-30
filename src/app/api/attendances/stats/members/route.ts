/**
 * 대원별 출석 통계 API
 * 각 대원의 출석률을 계산하여 반환합니다.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export interface MemberAttendanceStats {
  memberId: string;
  memberName: string;
  part: 'SOPRANO' | 'ALTO' | 'TENOR' | 'BASS' | 'SPECIAL';
  totalRecords: number;
  availableCount: number;
  unavailableCount: number;
  attendanceRate: number;
}

export interface MemberAttendanceStatsResponse {
  members: MemberAttendanceStats[];
  period: {
    startDate: string;
    endDate: string;
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

    // 모든 정대원 목록 조회
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

    // 해당 기간의 출석 데이터 조회
    const { data: attendances, error: attendancesError } = await supabase
      .from('attendances')
      .select('member_id, is_service_available')
      .gte('date', startDate)
      .lte('date', endDate);

    if (attendancesError) {
      console.error('Attendances query error:', attendancesError);
      return NextResponse.json(
        { error: '출석 데이터를 불러오는데 실패했습니다' },
        { status: 500 }
      );
    }

    // 대원별 출석 통계 계산
    const memberStatsMap = new Map<string, MemberAttendanceStats>();

    // 초기화: 모든 대원에 대해 기본값 설정
    for (const member of members || []) {
      memberStatsMap.set(member.id, {
        memberId: member.id,
        memberName: member.name,
        part: member.part as MemberAttendanceStats['part'],
        totalRecords: 0,
        availableCount: 0,
        unavailableCount: 0,
        attendanceRate: 0,
      });
    }

    // 출석 데이터 집계
    for (const attendance of attendances || []) {
      const stats = memberStatsMap.get(attendance.member_id);
      if (stats) {
        stats.totalRecords += 1;
        if (attendance.is_service_available) {
          stats.availableCount += 1;
        } else {
          stats.unavailableCount += 1;
        }
      }
    }

    // 출석률 계산
    for (const stats of memberStatsMap.values()) {
      if (stats.totalRecords > 0) {
        stats.attendanceRate = Math.round(
          (stats.availableCount / stats.totalRecords) * 100 * 100
        ) / 100; // 소수점 2자리
      }
    }

    // 배열로 변환 및 정렬
    const memberStats = Array.from(memberStatsMap.values());

    // 정렬
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

    // 요약 통계 계산
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
