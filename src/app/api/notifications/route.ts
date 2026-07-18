import { NextRequest, NextResponse } from 'next/server';

import { createLogger } from '@/lib/logger';
import { createClient } from '@/lib/supabase/server';

const logger = createLogger({ prefix: 'NotificationsAPI' });

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

/**
 * GET /api/notifications
 * 내 알림 목록 조회 (커서 페이지네이션) + 미읽음 수
 * 쿼리: cursor(ISO created_at), limit
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const cursor = searchParams.get('cursor');
    const limit = Math.min(
      parseInt(searchParams.get('limit') || `${DEFAULT_LIMIT}`, 10) || DEFAULT_LIMIT,
      MAX_LIMIT
    );

    // RLS로 본인 알림만 조회됨
    let query = supabase
      .from('notifications')
      .select('id, type, title, body, link, read_at, created_at')
      .order('created_at', { ascending: false })
      .limit(limit + 1); // 다음 페이지 존재 판별용 +1

    if (cursor) {
      query = query.lt('created_at', cursor);
    }

    const [{ data: rows, error }, { count: unreadCount, error: countError }] =
      await Promise.all([
        query,
        supabase
          .from('notifications')
          .select('id', { count: 'exact', head: true })
          .is('read_at', null),
      ]);

    if (error || countError) {
      logger.error('알림 조회 실패:', error?.message || countError?.message);
      return NextResponse.json({ error: '알림 조회에 실패했습니다' }, { status: 500 });
    }

    const hasMore = (rows?.length ?? 0) > limit;
    const data = hasMore ? rows!.slice(0, limit) : (rows ?? []);
    const nextCursor = hasMore ? data[data.length - 1].created_at : null;

    return NextResponse.json({
      data,
      unreadCount: unreadCount ?? 0,
      nextCursor,
    });
  } catch (error) {
    logger.error('알림 조회 오류:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 });
  }
}

/**
 * PATCH /api/notifications
 * 읽음 처리. body.ids 지정 시 해당 건만, 미지정 시 전체 읽음.
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const ids: string[] | undefined = Array.isArray(body?.ids) ? body.ids : undefined;

    // RLS로 본인 알림만 갱신됨
    let query = supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .is('read_at', null);

    if (ids && ids.length > 0) {
      query = query.in('id', ids);
    }

    const { error } = await query;

    if (error) {
      logger.error('읽음 처리 실패:', error.message);
      return NextResponse.json({ error: '읽음 처리에 실패했습니다' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('읽음 처리 오류:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 });
  }
}

/**
 * DELETE /api/notifications
 * 본인의 읽은 알림 전체 삭제 (알림함 '읽은 알림 지우기').
 * RLS(DELETE 정책)로 본인 알림만 삭제됨. 미읽음 알림은 보존.
 */
export async function DELETE() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
    }

    const { error, count } = await supabase
      .from('notifications')
      .delete({ count: 'exact' })
      .not('read_at', 'is', null);

    if (error) {
      logger.error('읽은 알림 삭제 실패:', error.message);
      return NextResponse.json({ error: '알림 삭제에 실패했습니다' }, { status: 500 });
    }

    return NextResponse.json({ success: true, deleted: count ?? 0 });
  } catch (error) {
    logger.error('읽은 알림 삭제 오류:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 });
  }
}
