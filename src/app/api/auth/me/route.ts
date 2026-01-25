import { NextRequest, NextResponse } from 'next/server';

import { createLogger } from '@/lib/logger';
import { createClient } from '@/lib/supabase/server';

const logger = createLogger({ prefix: 'AuthMe' });

/**
 * GET /api/auth/me
 * 현재 로그인한 사용자의 정보를 조회합니다.
 */
export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient();

    // 현재 사용자 조회
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: '인증되지 않은 사용자입니다.' }, { status: 401 });
    }

    // 사용자 프로필 조회
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError) {
      logger.error('Profile fetch error:', profileError);

      // 프로필이 없는 경우
      if (profileError.code === 'PGRST116') {
        return NextResponse.json({ error: '사용자 프로필을 찾을 수 없습니다.' }, { status: 404 });
      }

      return NextResponse.json({ error: '프로필 조회 중 오류가 발생했습니다.' }, { status: 500 });
    }

    return NextResponse.json(
      {
        user,
        profile,
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error('Get current user exception:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
