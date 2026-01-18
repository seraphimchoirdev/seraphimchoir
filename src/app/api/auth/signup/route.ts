import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createLogger } from '@/lib/logger';
import { signupRateLimiter, getClientIp, createRateLimitErrorResponse } from '@/lib/security/rate-limiter';

const logger = createLogger({ prefix: 'AuthSignup' });

/**
 * POST /api/auth/signup
 * 새로운 사용자를 등록합니다.
 */
export async function POST(request: NextRequest) {
  try {
    // Rate Limiting: 스팸 계정 생성 방지 (3회/분)
    const ip = getClientIp(request);
    const { success, reset } = await signupRateLimiter.limit(ip);

    if (!success) {
      logger.warn(`Rate limit exceeded for signup attempt from IP: ${ip}`);
      return NextResponse.json(
        createRateLimitErrorResponse(reset),
        { status: 429 }
      );
    }

    const body = await request.json();
    const { email, password, name } = body;

    // 입력 검증
    if (!email || !password || !name) {
      return NextResponse.json(
        { error: '이메일, 비밀번호, 이름을 모두 입력해주세요.' },
        { status: 400 }
      );
    }

    // 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: '올바른 이메일 형식이 아닙니다.' },
        { status: 400 }
      );
    }

    // 비밀번호 길이 검증 (최소 6자)
    if (password.length < 6) {
      return NextResponse.json(
        { error: '비밀번호는 최소 6자 이상이어야 합니다.' },
        { status: 400 }
      );
    }

    // 이름 길이 검증
    if (name.trim().length < 2) {
      return NextResponse.json(
        { error: '이름은 최소 2자 이상이어야 합니다.' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Supabase Auth 회원가입
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: name.trim(),
        },
      },
    });

    if (error) {
      logger.error('Signup error:', error);

      // 이미 존재하는 이메일인 경우
      if (error.message.includes('already registered')) {
        return NextResponse.json(
          { error: '이미 가입된 이메일입니다.' },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: error.message || '회원가입 중 오류가 발생했습니다.' },
        { status: 400 }
      );
    }

    // user_profiles 테이블은 데이터베이스 트리거에 의해 자동 생성됨

    return NextResponse.json(
      {
        user: data.user,
        session: data.session,
        message: '회원가입이 완료되었습니다.',
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error('Signup exception:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
