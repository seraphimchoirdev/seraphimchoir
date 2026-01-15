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
    for (const [key, config] of Object.entries(SERVER_ENV_VARS)) {
      const value = process.env[key];
      if (!value) {
        warnings.push(
          `⚠️ ${key}가 설정되지 않았습니다.\n` +
          `   설명: ${config.description}\n` +
          `   필요한 기능: ${config.requiredFor}`
        );
      } else if ('validate' in config && config.validate) {
        const validationError = config.validate(value);
        if (validationError) {
          errors.push(
            `❌ ${key} 값이 유효하지 않습니다: ${validationError}`
          );
        }
      }
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
      'SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다. ' +
      '이 키는 Admin 작업에 필요합니다.'
    );
  }
  return key;
}
