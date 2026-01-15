import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createLogger } from '@/lib/logger';

const logger = createLogger({ prefix: 'AuthLogin' });

/**
 * POST /api/auth/login
 * 이메일과 비밀번호로 로그인합니다.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // 입력 검증
    if (!email || !password) {
      return NextResponse.json(
        { error: '이메일과 비밀번호를 입력해주세요.' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Supabase Auth 로그인
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      logger.error('Login error:', error);

      // 인증 실패 (이메일 또는 비밀번호 불일치)
      if (error.message.includes('Invalid login credentials')) {
        return NextResponse.json(
          { error: '이메일 또는 비밀번호가 올바르지 않습니다.' },
          { status: 401 }
        );
      }

      return NextResponse.json(
        { error: error.message || '로그인 중 오류가 발생했습니다.' },
        { status: 400 }
      );
    }

    // 사용자 프로필 조회
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (profileError) {
      logger.error('Profile fetch error:', profileError);
      // 프로필 조회 실패는 로그인 자체를 막지 않음
    }

    return NextResponse.json(
      {
        user: data.user,
        session: data.session,
        profile: profile || null,
        message: '로그인에 성공했습니다.',
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error('Login exception:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
