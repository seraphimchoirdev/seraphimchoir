import { NextRequest, NextResponse } from 'next/server';

import { createLogger } from '@/lib/logger';
import { createClient } from '@/lib/supabase/server';

const logger = createLogger({ prefix: 'AuthLogout' });

/**
 * POST /api/auth/logout
 * 현재 세션을 종료하고 로그아웃합니다.
 */
export async function POST(_request: NextRequest) {
  try {
    const supabase = await createClient();

    // 현재 사용자 확인 (getUser()는 서버에서 JWT를 재검증)
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: '로그인 상태가 아닙니다.' }, { status: 401 });
    }

    // Supabase Auth 로그아웃
    const { error } = await supabase.auth.signOut();

    if (error) {
      logger.error('Logout error:', error);
      return NextResponse.json(
        { error: error.message || '로그아웃 중 오류가 발생했습니다.' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        message: '로그아웃되었습니다.',
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error('Logout exception:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
