import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createLogger } from '@/lib/logger';
import { authRateLimiter, getClientIp, createRateLimitErrorResponse } from '@/lib/security/rate-limiter';
import { z } from 'zod';
import { sanitizeRequestBody } from '@/lib/api/sanitization-middleware';
import { sanitizers } from '@/lib/security/input-sanitizer';
import { logLoginEvent, logRateLimitExceeded } from '@/lib/security/audit-logger';

const logger = createLogger({ prefix: 'AuthLogin' });

// 로그인 요청 스키마 (sanitization 포함)
const loginSchema = z.object({
  email: z.string()
    .email('올바른 이메일 형식이 아닙니다')
    .transform(v => {
      const sanitized = sanitizers.sanitizeEmail(v);
      if (!sanitized) {
        throw new Error('올바른 이메일 형식이 아닙니다');
      }
      return sanitized;
    }),
  password: z.string()
    .min(6, '비밀번호는 최소 6자 이상이어야 합니다'),
  // 비밀번호는 sanitize하지 않음 (특수문자 허용)
});

/**
 * POST /api/auth/login
 * 이메일과 비밀번호로 로그인합니다.
 */
export async function POST(request: NextRequest) {
  try {
    // Rate Limiting: 무차별 대입 공격 방어 (5회/분)
    const ip = getClientIp(request);
    const { success, reset } = await authRateLimiter.limit(ip);

    if (!success) {
      logger.warn(`Rate limit exceeded for login attempt from IP: ${ip}`);
      // 감사 로그: Rate limit 위반
      await logRateLimitExceeded(request, '/api/auth/login');
      return NextResponse.json(
        createRateLimitErrorResponse(reset),
        { status: 429 }
      );
    }

    // 요청 body sanitization 및 검증
    let validatedData;
    try {
      validatedData = await sanitizeRequestBody(request, loginSchema);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: error.issues[0].message },
          { status: 400 }
        );
      }
      throw error;
    }

    const { email, password } = validatedData;

    const supabase = await createClient();

    // Supabase Auth 로그인
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      logger.error('Login error:', error);

      // 감사 로그: 로그인 실패
      await logLoginEvent(
        request,
        false,
        email,
        undefined,
        error.message
      );

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

    // 감사 로그: 로그인 성공
    await logLoginEvent(
      request,
      true,
      data.user.email,
      data.user.id
    );

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
