import { z } from 'zod';

import { NextRequest, NextResponse } from 'next/server';

import { createLogger } from '@/lib/logger';
import { createClient } from '@/lib/supabase/server';

const logger = createLogger({ prefix: 'ArrangementGuestsAPI' });

const addGuestsSchema = z.object({
  arrangement_id: z.string().uuid(),
  member_ids: z.array(z.string().uuid()).min(1),
});

const removeGuestSchema = z.object({
  arrangement_id: z.string().uuid(),
  member_id: z.string().uuid(),
});

/**
 * GET /api/arrangement-guests?arrangement_id=xxx
 * 특정 배치표에 연결된 게스트 멤버 목록 조회
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const arrangementId = request.nextUrl.searchParams.get('arrangement_id');

    if (!arrangementId) {
      return NextResponse.json(
        { error: 'arrangement_id 파라미터가 필요합니다' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('arrangement_guests')
      .select(`
        id,
        arrangement_id,
        member_id,
        created_at,
        members (
          id,
          name,
          part,
          member_status
        )
      `)
      .eq('arrangement_id', arrangementId);

    if (error) {
      logger.error('게스트 목록 조회 실패:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (error) {
    logger.error('게스트 목록 조회 오류:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 });
  }
}

/**
 * POST /api/arrangement-guests
 * 게스트 멤버를 배치표에 연결
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const { arrangement_id, member_ids } = addGuestsSchema.parse(body);

    const rows = member_ids.map((member_id) => ({
      arrangement_id,
      member_id,
    }));

    const { data, error } = await supabase
      .from('arrangement_guests')
      .upsert(rows, { onConflict: 'arrangement_id,member_id' })
      .select();

    if (error) {
      logger.error('게스트 연결 실패:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    logger.error('게스트 연결 오류:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 });
  }
}

/**
 * DELETE /api/arrangement-guests
 * 게스트 멤버를 배치표에서 연결 해제
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const { arrangement_id, member_id } = removeGuestSchema.parse(body);

    const { error } = await supabase
      .from('arrangement_guests')
      .delete()
      .eq('arrangement_id', arrangement_id)
      .eq('member_id', member_id);

    if (error) {
      logger.error('게스트 연결 해제 실패:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: '게스트가 연결 해제되었습니다' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    logger.error('게스트 연결 해제 오류:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 });
  }
}
