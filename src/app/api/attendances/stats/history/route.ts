/**
 * 회원 출석 이력 API
 * RPC 함수를 서버에서 호출하여 클라이언트에 반환합니다.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createLogger } from '@/lib/logger';

const logger = createLogger({ prefix: 'AttendanceStatsHistory' });

export interface MemberAttendanceHistoryResponse {
  date: string;
  is_available: boolean;
  notes: string | null;
}

/**
 * GET /api/attendances/stats/history
 * 회원 출석 이력 조회
 *
 * Query params:
 * - member_id: 회원 UUID (필수)
 * - start_date: 시작 날짜 (YYYY-MM-DD, 선택)
 * - end_date: 종료 날짜 (YYYY-MM-DD, 선택)
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
    const memberId = searchParams.get('member_id');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    if (!memberId) {
      return NextResponse.json(
        { error: '회원 ID는 필수입니다' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase.rpc('get_member_attendance_history', {
      p_member_id: memberId,
      p_start_date: startDate || null,
      p_end_date: endDate || null,
    });

    if (error) {
      logger.error('Member attendance history error:', error);
      return NextResponse.json(
        { error: `회원 출석 이력 조회 실패: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json(data as MemberAttendanceHistoryResponse[]);
  } catch (error) {
    logger.error('Member attendance history error:', error);
    return NextResponse.json(
      { error: '회원 출석 이력 조회에 실패했습니다' },
      { status: 500 }
    );
  }
}
