import { z } from 'zod';

import { NextRequest, NextResponse } from 'next/server';

import { sanitizeRequestBody } from '@/lib/api/sanitization-middleware';
import { createLogger } from '@/lib/logger';
import { sanitizers } from '@/lib/security/input-sanitizer';
import {
  createRateLimitErrorResponse,
  getClientIp,
  signupRateLimiter,
} from '@/lib/security/rate-limiter';
import { createClient } from '@/lib/supabase/server';

const logger = createLogger({ prefix: 'AuthSignup' });

// 회원가입 요청 스키마 (sanitization 포함)
const signupSchema = z.object({
  email: z
    .string()
    .email('올바른 이메일 형식이 아닙니다')
    .transform((v) => {
      const sanitized = sanitizers.sanitizeEmail(v);
      if (!sanitized) {
        throw new Error('올바른 이메일 형식이 아닙니다');
      }
      return sanitized;
    }),
  password: z
    .string()
    .min(12, '비밀번호는 최소 12자 이상이어야 합니다')
    .max(128, '비밀번호는 최대 128자까지 입력 가능합니다')
    .regex(/[A-Z]/, '비밀번호에 대문자를 최소 1개 포함해야 합니다')
    .regex(/[a-z]/, '비밀번호에 소문자를 최소 1개 포함해야 합니다')
    .regex(/[0-9]/, '비밀번호에 숫자를 최소 1개 포함해야 합니다')
    .regex(/[^A-Za-z0-9]/, '비밀번호에 특수문자를 최소 1개 포함해야 합니다'),
  name: z
    .string()
    .min(2, '이름은 최소 2자 이상이어야 합니다')
    .max(50, '이름은 최대 50자까지 입력 가능합니다')
    .transform(sanitizers.sanitizeMemberName),
});

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
      return NextResponse.json(createRateLimitErrorResponse(reset), { status: 429 });
    }

    // 요청 body sanitization 및 검증
    let validatedData;
    try {
      validatedData = await sanitizeRequestBody(request, signupSchema);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
      }
      throw error;
    }

    const { email, password, name } = validatedData;

    const supabase = await createClient();

    // Supabase Auth 회원가입
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: name, // 이미 sanitized
        },
      },
    });

    if (error) {
      logger.error('Signup error:', error);

      // 이미 존재하는 이메일인 경우
      if (error.message.includes('already registered')) {
        return NextResponse.json({ error: '이미 가입된 이메일입니다.' }, { status: 409 });
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
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
