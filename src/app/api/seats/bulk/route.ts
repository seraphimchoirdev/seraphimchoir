import { z } from 'zod';

import { NextRequest, NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';

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
      return NextResponse.json({ error: '좌석 저장 중 오류가 발생했습니다.' }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation Error', details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
