import { z } from 'zod';

import { NextRequest, NextResponse } from 'next/server';

import { createLogger } from '@/lib/logger';
import { notifySeatChanges } from '@/lib/notifications/arrangement-notify';
import {
  diffSeatChanges,
  type SeatPosition,
} from '@/lib/notifications/seat-notification-utils';
import { createClient } from '@/lib/supabase/server';

const logger = createLogger({ prefix: 'SeatsBulkAPI' });

const seatSchema = z.object({
  memberId: z.string().uuid(),
  row: z.number().int().min(1), // 1-based index
  column: z.number().int().min(1), // 1-based index
  part: z.enum(['SOPRANO', 'ALTO', 'TENOR', 'BASS', 'SPECIAL']),
  isRowLeader: z.boolean().optional(),
});

const bulkSeatsSchema = z.object({
  arrangementId: z.string().uuid(),
  seats: z.array(seatSchema),
});

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  // 인증 검사
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
  }

  try {
    const json = await request.json();
    const { arrangementId, seats } = bulkSeatsSchema.parse(json);

    // 공유/확정된 배치표의 좌석 변동은 해당 대원에게 알림이 필요하므로
    // 저장 전 스냅샷을 떠서 diff를 계산한다 (DRAFT 편집 중에는 스킵)
    const { data: arrangement } = await supabase
      .from('arrangements')
      .select('status, date')
      .eq('id', arrangementId)
      .maybeSingle();

    const shouldNotify =
      arrangement?.status === 'SHARED' || arrangement?.status === 'CONFIRMED';

    let beforeSnapshot: Map<string, SeatPosition> | null = null;
    if (shouldNotify) {
      const { data: prevSeats } = await supabase
        .from('seats')
        .select('member_id, seat_row, seat_column')
        .eq('arrangement_id', arrangementId);
      beforeSnapshot = new Map(
        (prevSeats ?? [])
          .filter((s: { member_id: string | null }) => !!s.member_id)
          .map((s: { member_id: string; seat_row: number; seat_column: number }) => [
            s.member_id,
            { row: s.seat_row, column: s.seat_column },
          ])
      );
    }

    // RPC를 사용하여 DELETE + INSERT를 단일 트랜잭션으로 처리
    // 중간 실패 시 자동 롤백되어 데이터 손실 방지
    const seatsForRpc = seats.map((seat) => ({
      member_id: seat.memberId,
      seat_row: seat.row,
      seat_column: seat.column,
      part: seat.part,
      is_row_leader: seat.isRowLeader || false,
    }));

    const { data, error } = await supabase.rpc('replace_arrangement_seats', {
      p_arrangement_id: arrangementId,
      p_seats: seatsForRpc,
    });

    if (error) {
      console.error('[seats/bulk] RPC 에러:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      return NextResponse.json(
        { error: '좌석 저장 중 오류가 발생했습니다.', details: error.message },
        { status: 500 }
      );
    }

    // 변동된 대원에게만 알림 (실패해도 좌석 저장은 정상 응답)
    if (shouldNotify && beforeSnapshot && arrangement?.date) {
      try {
        const afterSnapshot = new Map<string, SeatPosition>(
          seats.map((s) => [s.memberId, { row: s.row, column: s.column }])
        );
        const changed = diffSeatChanges(beforeSnapshot, afterSnapshot);
        await notifySeatChanges(arrangementId, arrangement.date, changed);
      } catch (notifyErr) {
        logger.warn('좌석 변동 알림 발송 실패 (좌석 저장은 정상):', notifyErr);
      }
    }

    return NextResponse.json(data || []);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation Error', details: error.issues },
        { status: 400 }
      );
    }
    console.error('[seats/bulk] 예외:', error);
    return NextResponse.json(
      { error: '좌석 저장 중 오류가 발생했습니다.', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
