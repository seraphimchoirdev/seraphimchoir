/**
 * 출석 통계 API
 * RPC 함수를 서버에서 호출하여 클라이언트에 반환합니다.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export interface AttendanceStatisticsResponse {
  total_records: number;
  available_count: number;
  unavailable_count: number;
  attendance_rate: number;
}

export interface PartAttendanceStatisticsResponse {
  part: string;
  total_count: number;
  available_count: number;
  unavailable_count: number;
  attendance_rate: number;
}

export interface AttendanceSummaryByDateResponse {
  date: string;
  total_count: number;
  available_count: number;
  unavailable_count: number;
  attendance_rate: number;
}

/**
 * GET /api/attendances/stats
 * 출석 통계 조회
 *
 * Query params:
 * - start_date: 시작 날짜 (YYYY-MM-DD, 필수)
 * - end_date: 종료 날짜 (YYYY-MM-DD, 필수)
 * - type: 통계 유형 (overall, part, date) default: overall
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
    const type = searchParams.get('type') || 'overall';

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: '시작 날짜와 종료 날짜는 필수입니다' },
        { status: 400 }
      );
    }

    switch (type) {
      case 'overall': {
        const { data, error } = await supabase.rpc('get_attendance_statistics', {
          p_start_date: startDate,
          p_end_date: endDate,
        });

        if (error) {
          console.error('Overall stats error:', error);
          return NextResponse.json(
            { error: `전체 출석 통계 조회 실패: ${error.message}` },
            { status: 500 }
          );
        }

        return NextResponse.json(data as AttendanceStatisticsResponse);
      }

      case 'part': {
        const { data, error } = await supabase.rpc('get_part_attendance_statistics', {
          p_start_date: startDate,
          p_end_date: endDate,
        });

        if (error) {
          console.error('Part stats error:', error);
          return NextResponse.json(
            { error: `파트별 출석 통계 조회 실패: ${error.message}` },
            { status: 500 }
          );
        }

        return NextResponse.json(data as PartAttendanceStatisticsResponse[]);
      }

      case 'date': {
        const { data, error } = await supabase.rpc('get_attendance_summary_by_date', {
          p_start_date: startDate,
          p_end_date: endDate,
        });

        if (error) {
          console.error('Date summary error:', error);
          return NextResponse.json(
            { error: `날짜별 출석 요약 조회 실패: ${error.message}` },
            { status: 500 }
          );
        }

        return NextResponse.json(data as AttendanceSummaryByDateResponse[]);
      }

      default:
        return NextResponse.json(
          { error: `지원하지 않는 통계 유형: ${type}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Attendance stats error:', error);
    return NextResponse.json(
      { error: '출석 통계 조회에 실패했습니다' },
      { status: 500 }
    );
  }
}
