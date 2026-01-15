/**
 * 자리배치 분석 API Route
 * 현재 배치의 품질을 분석하고 통계 정보를 반환합니다.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createLogger } from '@/lib/logger';
import {
  analyzeArrangement,
  type SeatWithMember,
} from '@/lib/quality-metrics';
import type { GridLayout } from '@/types/grid';
import type { ArrangementAnalysisResponse } from '@/types/analysis';

const logger = createLogger({ prefix: 'ArrangementsAnalyze' });

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: arrangementId } = await params;
    const supabase = await createClient();

    // 인증 확인
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    // 배치표 정보 조회
    const { data: arrangement, error: arrangementError } = await supabase
      .from('arrangements')
      .select('id, date, grid_layout')
      .eq('id', arrangementId)
      .single();

    if (arrangementError || !arrangement) {
      return NextResponse.json(
        { error: '배치표를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 좌석 정보 조회 (멤버 정보 포함)
    const { data: seats, error: seatsError } = await supabase
      .from('seats')
      .select(`
        member_id,
        seat_row,
        seat_column,
        part,
        is_row_leader,
        member:members!seats_member_id_fkey (
          id,
          name
        )
      `)
      .eq('arrangement_id', arrangementId);

    if (seatsError) {
      logger.error('Seats query error:', seatsError);
      return NextResponse.json(
        { error: '좌석 정보를 불러오는데 실패했습니다.' },
        { status: 500 }
      );
    }

    // 해당 날짜의 등단 가능 인원 수 조회
    // 1. 모든 정대원 수
    const { count: totalRegularMembers } = await supabase
      .from('members')
      .select('*', { count: 'exact', head: true })
      .eq('member_status', 'REGULAR');

    // 2. 해당 날짜에 등단 불가능으로 표시된 인원
    const { count: unavailableCount } = await supabase
      .from('attendances')
      .select('*', { count: 'exact', head: true })
      .eq('date', arrangement.date)
      .eq('is_service_available', false);

    // 등단 가능 인원 = 전체 정대원 - 등단 불가
    const availableMembers = (totalRegularMembers || 0) - (unavailableCount || 0);

    // SeatWithMember 형식으로 변환
    const seatData: SeatWithMember[] = (seats || []).map((seat) => {
      // member는 배열 또는 단일 객체일 수 있음
      const member = Array.isArray(seat.member) ? seat.member[0] : seat.member;
      return {
        memberId: seat.member_id,
        memberName: (member as { name: string } | null)?.name || 'Unknown',
        part: seat.part,
        row: seat.seat_row,
        col: seat.seat_column,
        isLeader: seat.is_row_leader || false,
      };
    });

    // GridLayout 파싱
    const gridLayout: GridLayout = arrangement.grid_layout || {
      rows: 4,
      rowCapacities: [8, 8, 8, 8],
      zigzagPattern: 'even',
    };

    // 분석 실행
    const analysis: ArrangementAnalysisResponse = analyzeArrangement(
      seatData,
      availableMembers,
      gridLayout
    );

    return NextResponse.json(analysis);
  } catch (error) {
    logger.error('Analysis API error:', error);
    return NextResponse.json(
      { error: '분석 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
