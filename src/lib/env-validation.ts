/**
 * 환경변수 검증 유틸리티
 *
 * 애플리케이션 시작 시 필수 환경변수가 올바르게 설정되었는지 확인합니다.
 * 런타임 오류를 방지하고 명확한 오류 메시지를 제공합니다.
 */
import { createLogger } from '@/lib/logger';

const logger = createLogger({ prefix: 'EnvValidation' });

export interface EnvValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * 필수 환경변수 목록
 */
const REQUIRED_ENV_VARS = {
  // Supabase 관련 (클라이언트)
  NEXT_PUBLIC_SUPABASE_URL: {
    description: 'Supabase 프로젝트 URL',
    example: 'https://xxxxx.supabase.co',
  },
  NEXT_PUBLIC_SUPABASE_ANON_KEY: {
    description: 'Supabase 공개 anon key',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  },
} as const;

/**
 * 서버 전용 환경변수 (선택적이지만 특정 기능에 필요)
 */
const SERVER_ENV_VARS = {
  SUPABASE_SERVICE_ROLE_KEY: {
    description: 'Supabase Service Role Key (Admin 작업용)',
    requiredFor: 'Admin API 작업',
  },
  CONDUCTOR_NOTES_ENCRYPTION_KEY: {
    description: '지휘자 메모 암호화 키 (64자리 16진수)',
    requiredFor: '지휘자 메모 암호화/복호화',
    validate: (value: string) => {
      if (value.length !== 64) {
        return `64자리 16진수여야 합니다 (현재: ${value.length}자리)`;
      }
      if (!/^[a-fA-F0-9]+$/.test(value)) {
        return '16진수 문자만 포함해야 합니다';
      }
      return null;
    },
  },
  UPSTASH_REDIS_REST_URL: {
    description: 'Upstash Redis REST URL (Rate Limiting용)',
    requiredFor: 'API Rate Limiting (프로덕션 환경 필수)',
    requiredInProduction: true,
  },
  UPSTASH_REDIS_REST_TOKEN: {
    description: 'Upstash Redis REST Token (Rate Limiting용)',
    requiredFor: 'API Rate Limiting (프로덕션 환경 필수)',
    requiredInProduction: true,
  },
  NEXT_PUBLIC_SENTRY_DSN: {
    description: 'Sentry DSN (에러 트래킹용)',
    requiredFor: '프로덕션 에러 모니터링 (권장)',
  },
  SENTRY_ORG: {
    description: 'Sentry Organization (소스맵 업로드용)',
    requiredFor: '프로덕션 디버깅 (선택적)',
  },
  SENTRY_PROJECT: {
    description: 'Sentry Project (소스맵 업로드용)',
    requiredFor: '프로덕션 디버깅 (선택적)',
  },
  SENTRY_AUTH_TOKEN: {
    description: 'Sentry Auth Token (소스맵 업로드용)',
    requiredFor: '프로덕션 디버깅 (선택적)',
  },
  VAPID_PRIVATE_KEY: {
    description: 'Web Push VAPID 개인 키',
    requiredFor: '웹푸시 알림 발송',
  },
  VAPID_SUBJECT: {
    description: 'Web Push VAPID subject (mailto: 또는 https: URL)',
    requiredFor: '웹푸시 알림 발송',
  },
  CRON_SECRET: {
    description: 'Vercel Cron 인증 시크릿',
    requiredFor: '투표 독려 등 예약 알림 발송',
  },
} as const;

/**
 * 환경변수 검증 수행
 */
export function validateEnvironment(): EnvValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 필수 환경변수 검증
  for (const [key, config] of Object.entries(REQUIRED_ENV_VARS)) {
    const value = process.env[key];
    if (!value) {
      errors.push(
        `❌ ${key}가 설정되지 않았습니다.\n` +
          `   설명: ${config.description}\n` +
          `   예시: ${config.example}`
      );
    }
  }

  // 서버 환경변수 검증 (서버에서만 실행될 때)
  if (typeof window === 'undefined') {
    const isProduction = process.env.NODE_ENV === 'production';

    for (const [key, config] of Object.entries(SERVER_ENV_VARS)) {
      const value = process.env[key];

      // 프로덕션에서 필수인 환경변수 체크
      if (
        !value &&
        'requiredInProduction' in config &&
        config.requiredInProduction &&
        isProduction
      ) {
        errors.push(
          `❌ ${key}가 설정되지 않았습니다 (프로덕션 필수).\n` +
            `   설명: ${config.description}\n` +
            `   필요한 기능: ${config.requiredFor}`
        );
      } else if (!value) {
        warnings.push(
          `⚠️ ${key}가 설정되지 않았습니다.\n` +
            `   설명: ${config.description}\n` +
            `   필요한 기능: ${config.requiredFor}`
        );
      } else if ('validate' in config && config.validate) {
        const validationError = config.validate(value);
        if (validationError) {
          errors.push(`❌ ${key} 값이 유효하지 않습니다: ${validationError}`);
        }
      }
    }
  }

  // 개발 환경에서 프로덕션 Supabase URL 사용 경고
  if (process.env.NODE_ENV === 'development' && typeof window === 'undefined') {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    if (url.includes('supabase.co')) {
      warnings.push(
        '⚠️ 개발 환경에서 프로덕션 Supabase를 사용 중입니다!\n' +
        '   `npx supabase start` 실행 후 .env.local을 로컬 URL로 변경하세요.\n' +
        '   로컬 URL: http://127.0.0.1:54321'
      );
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * 환경변수 검증 및 오류 시 예외 발생
 * 서버 시작 시 호출하면 잘못된 설정으로 인한 런타임 오류를 방지할 수 있습니다.
 */
export function assertEnvironmentValid(): void {
  const result = validateEnvironment();

  if (result.warnings.length > 0) {
    logger.warn('환경변수 경고:\n' + result.warnings.join('\n\n'));
  }

  if (!result.isValid) {
    const errorMessage =
      '🚨 환경변수 검증 실패!\n\n' +
      result.errors.join('\n\n') +
      '\n\n.env 파일을 확인하고 필요한 환경변수를 설정하세요.';

    throw new Error(errorMessage);
  }
}

/**
 * Supabase URL 가져오기 (검증 포함)
 */
export function getSupabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL이 설정되지 않았습니다.');
  }
  return url;
}

/**
 * Supabase Anon Key 가져오기 (검증 포함)
 */
export function getSupabaseAnonKey(): string {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!key) {
    throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY가 설정되지 않았습니다.');
  }
  return key;
}

/**
 * Supabase Service Role Key 가져오기 (검증 포함)
 */
export function getSupabaseServiceRoleKey(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다. ' + '이 키는 Admin 작업에 필요합니다.'
    );
  }
  return key;
}

/**
 * Web Push VAPID 공개 키 가져오기 (검증 포함)
 */
export function getVapidPublicKey(): string {
  const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!key) {
    throw new Error('NEXT_PUBLIC_VAPID_PUBLIC_KEY가 설정되지 않았습니다.');
  }
  return key;
}

/**
 * Web Push VAPID 개인 키 가져오기 (서버 전용, 검증 포함)
 */
export function getVapidPrivateKey(): string {
  const key = process.env.VAPID_PRIVATE_KEY;
  if (!key) {
    throw new Error('VAPID_PRIVATE_KEY가 설정되지 않았습니다. 웹푸시 발송에 필요합니다.');
  }
  return key;
}

/**
 * Web Push VAPID subject 가져오기 (검증 포함)
 */
export function getVapidSubject(): string {
  const subject = process.env.VAPID_SUBJECT;
  if (!subject) {
    throw new Error('VAPID_SUBJECT가 설정되지 않았습니다. (예: mailto:admin@example.com)');
  }
  return subject;
}
