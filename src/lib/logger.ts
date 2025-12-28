/**
 * 프로덕션 환경을 고려한 로거 유틸리티
 *
 * 개발 환경에서는 상세한 로그를 출력하고,
 * 프로덕션에서는 중요한 로그만 출력합니다.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerOptions {
  level?: LogLevel;
  prefix?: string;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

/**
 * 현재 환경에 따른 최소 로그 레벨
 * - development: debug (모든 로그 출력)
 * - production: warn (warn, error만 출력)
 * - test: error (error만 출력)
 */
function getMinLogLevel(): LogLevel {
  const env = process.env.NODE_ENV;

  if (env === 'production') {
    return 'warn';
  }

  if (env === 'test') {
    return 'error';
  }

  return 'debug';
}

/**
 * 로그 출력 여부 확인
 */
function shouldLog(level: LogLevel): boolean {
  const minLevel = getMinLogLevel();
  return LOG_LEVELS[level] >= LOG_LEVELS[minLevel];
}

/**
 * 타임스탬프 포맷
 */
function getTimestamp(): string {
  return new Date().toISOString();
}

/**
 * 로그 메시지 포맷
 */
function formatMessage(level: LogLevel, prefix: string, args: unknown[]): string {
  const timestamp = getTimestamp();
  const levelTag = `[${level.toUpperCase()}]`;
  const prefixTag = prefix ? `[${prefix}]` : '';

  return `${timestamp} ${levelTag}${prefixTag}`;
}

/**
 * 안전하게 값을 문자열로 변환
 */
function safeStringify(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

/**
 * 로거 인스턴스 생성
 */
function createLogger(options: LoggerOptions = {}) {
  const prefix = options.prefix || '';

  return {
    /**
     * 디버그 로그 (개발 환경에서만 출력)
     * API 요청 파라미터, 중간 계산 결과 등
     */
    debug: (...args: unknown[]) => {
      if (shouldLog('debug')) {
        const message = formatMessage('debug', prefix, args);
        console.log(message, ...args);
      }
    },

    /**
     * 정보 로그
     * 중요한 작업 완료, 상태 변경 등
     */
    info: (...args: unknown[]) => {
      if (shouldLog('info')) {
        const message = formatMessage('info', prefix, args);
        console.info(message, ...args);
      }
    },

    /**
     * 경고 로그
     * 잠재적 문제, 권장하지 않는 사용법 등
     */
    warn: (...args: unknown[]) => {
      if (shouldLog('warn')) {
        const message = formatMessage('warn', prefix, args);
        console.warn(message, ...args);
      }
    },

    /**
     * 에러 로그 (항상 출력)
     * 예외, 실패한 작업 등
     */
    error: (...args: unknown[]) => {
      if (shouldLog('error')) {
        const message = formatMessage('error', prefix, args);
        console.error(message, ...args);
      }
    },

    /**
     * 자식 로거 생성 (prefix 추가)
     */
    child: (childPrefix: string) => {
      const newPrefix = prefix ? `${prefix}:${childPrefix}` : childPrefix;
      return createLogger({ ...options, prefix: newPrefix });
    },
  };
}

/**
 * 기본 로거 인스턴스
 *
 * @example
 * import { logger } from '@/lib/logger';
 *
 * logger.debug('Debug message');
 * logger.info('Info message');
 * logger.warn('Warning message');
 * logger.error('Error message');
 *
 * // 자식 로거 생성
 * const apiLogger = logger.child('api');
 * apiLogger.info('API call'); // [INFO][api] API call
 */
export const logger = createLogger();

/**
 * 커스텀 로거 생성
 *
 * @example
 * const authLogger = createLogger({ prefix: 'auth' });
 * authLogger.info('User logged in');
 */
export { createLogger };
