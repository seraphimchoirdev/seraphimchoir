import * as Sentry from '@sentry/nextjs';

/**
 * Sentry 이벤트에서 민감한 정보를 제거하는 유틸리티
 */

// 민감한 필드 목록
const SENSITIVE_FIELDS = [
  'password',
  'token',
  'api_key',
  'apikey',
  'secret',
  'credential',
  'auth',
  'authorization',
  'cookie',
  'session',
  'credit_card',
  'creditcard',
  'card_number',
  'cardnumber',
  'cvv',
  'ssn',
  'social_security',
  'tax_id',
  'phone',
  'email',
  'address',
  'birth',
  'dob',
];

// 민감한 헤더 목록
const SENSITIVE_HEADERS = [
  'authorization',
  'cookie',
  'x-auth-token',
  'x-api-key',
  'x-csrf-token',
  'x-access-token',
  'x-session-id',
];

// 환경변수 패턴
const ENV_VAR_PATTERNS = [
  /SUPABASE.*KEY/i,
  /SENTRY.*TOKEN/i,
  /DATABASE.*PASSWORD/i,
  /API.*KEY/i,
  /SECRET/i,
  /PRIVATE/i,
  /TOKEN/i,
  /PASSWORD/i,
];

/**
 * 객체에서 민감한 정보를 재귀적으로 마스킹
 */
function sanitizeObject(obj: any, depth = 0): any {
  if (depth > 10) return '[Max Depth Exceeded]'; // 무한 재귀 방지

  if (obj === null || obj === undefined) return obj;

  // 배열 처리
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item, depth + 1));
  }

  // 객체가 아닌 경우
  if (typeof obj !== 'object') {
    // 문자열에서 민감한 패턴 검사
    if (typeof obj === 'string') {
      // 이메일 마스킹
      if (obj.includes('@') && obj.includes('.')) {
        const parts = obj.split('@');
        if (parts.length === 2) {
          const localPart = parts[0];
          const masked = localPart.charAt(0) + '***' + localPart.charAt(localPart.length - 1);
          return `${masked}@${parts[1]}`;
        }
      }

      // JWT 토큰 마스킹
      if (obj.startsWith('eyJ') && obj.length > 100) {
        return '[JWT Token Redacted]';
      }

      // Base64 encoded secrets
      if (obj.length > 40 && /^[A-Za-z0-9+/]+=*$/.test(obj)) {
        return '[Possible Secret Redacted]';
      }
    }
    return obj;
  }

  // 객체 처리
  const sanitized: any = {};

  for (const key in obj) {
    if (!obj.hasOwnProperty(key)) continue;

    const lowerKey = key.toLowerCase();

    // 민감한 필드 체크
    const isSensitive = SENSITIVE_FIELDS.some(field =>
      lowerKey.includes(field)
    );

    if (isSensitive) {
      sanitized[key] = '[REDACTED]';
    } else {
      sanitized[key] = sanitizeObject(obj[key], depth + 1);
    }
  }

  return sanitized;
}

/**
 * Sentry 이벤트 전체를 sanitize
 */
export function sanitizeSentryEvent(event: Sentry.Event): Sentry.Event | null {
  // 개발 환경에서도 sanitization 적용
  const isDevelopment = process.env.NODE_ENV === 'development';

  // Request 정보 sanitization
  if (event.request) {
    // Headers 정리
    if (event.request.headers) {
      const sanitizedHeaders: Record<string, string> = {};

      for (const [key, value] of Object.entries(event.request.headers)) {
        const lowerKey = key.toLowerCase();

        if (SENSITIVE_HEADERS.includes(lowerKey)) {
          sanitizedHeaders[key] = '[REDACTED]';
        } else {
          sanitizedHeaders[key] = value as string;
        }
      }

      event.request.headers = sanitizedHeaders;
    }

    // Cookies 제거
    if (event.request.cookies) {
      event.request.cookies = '[REDACTED]' as any;
    }

    // Query string sanitization
    if (event.request.query_string) {
      event.request.query_string = sanitizeObject(event.request.query_string);
    }

    // Body sanitization
    if (event.request.data) {
      event.request.data = sanitizeObject(event.request.data);
    }
  }

  // Extra context sanitization
  if (event.extra) {
    event.extra = sanitizeObject(event.extra);
  }

  // User 정보 제한
  if (event.user) {
    const sanitizedUser: Sentry.User = {};

    // ID만 유지, 이메일과 이름은 해시 또는 제거
    if (event.user.id) {
      sanitizedUser.id = event.user.id;
    }

    // 이메일 마스킹
    if (event.user.email) {
      const parts = event.user.email.split('@');
      if (parts.length === 2) {
        const localPart = parts[0];
        const masked = localPart.charAt(0) + '***';
        sanitizedUser.email = `${masked}@${parts[1]}`;
      }
    }

    // IP 주소 일부 마스킹
    if (event.user.ip_address) {
      const parts = event.user.ip_address.split('.');
      if (parts.length === 4) {
        sanitizedUser.ip_address = `${parts[0]}.${parts[1]}.xxx.xxx`;
      }
    }

    event.user = sanitizedUser;
  }

  // 환경변수 제거
  if (event.contexts?.runtime?.env) {
    const sanitizedEnv: Record<string, string> = {};

    for (const [key, value] of Object.entries(event.contexts.runtime.env)) {
      const shouldRedact = ENV_VAR_PATTERNS.some(pattern =>
        pattern.test(key)
      );

      if (shouldRedact) {
        sanitizedEnv[key] = '[REDACTED]';
      } else {
        sanitizedEnv[key] = value as string;
      }
    }

    event.contexts.runtime.env = sanitizedEnv;
  }

  // Breadcrumbs sanitization
  if (event.breadcrumbs) {
    event.breadcrumbs = event.breadcrumbs.map(breadcrumb => ({
      ...breadcrumb,
      data: breadcrumb.data ? sanitizeObject(breadcrumb.data) : undefined,
      message: breadcrumb.message ?
        breadcrumb.message.replace(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g, '[EMAIL]') :
        breadcrumb.message,
    }));
  }

  // Exception values sanitization
  if (event.exception?.values) {
    event.exception.values = event.exception.values.map(exception => ({
      ...exception,
      value: exception.value ?
        exception.value
          .replace(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g, '[EMAIL]')
          .replace(/\b\d{3,4}\b/g, '[NUM]') // 3-4 digit numbers (potential sensitive IDs)
          : exception.value,
    }));
  }

  // 개발 환경에서는 콘솔 로그 후 전송 차단
  if (isDevelopment) {
    console.log('Sentry Event (dev - sanitized):', {
      level: event.level,
      event_id: event.event_id,
      message: event.message,
      exception: event.exception?.values?.[0]?.type,
      user: event.user,
      tags: event.tags,
    });
    return null; // 개발 환경에서는 전송하지 않음
  }

  return event;
}

/**
 * Sentry 초기화 시 사용할 공통 beforeSend 함수
 */
export function createBeforeSendHandler() {
  return (event: any, hint: any) => {
    // 에러 객체 로깅 (개발용)
    if (process.env.NODE_ENV === 'development' && hint.originalException) {
      console.error('Original Error (dev):', {
        name: (hint.originalException as Error).name,
        message: (hint.originalException as Error).message,
        stack: (hint.originalException as Error).stack?.split('\n').slice(0, 5),
      });
    }

    return sanitizeSentryEvent(event);
  };
}

/**
 * Transaction 이벤트 sanitization
 */
export function createBeforeTransactionHandler() {
  return (event: any) => {
    // URL에서 민감한 정보 제거
    if (event.transaction) {
      event.transaction = event.transaction
        .replace(/\/users\/[^\/]+/g, '/users/[ID]')
        .replace(/\/api\/auth\/[^\/]+/g, '/api/auth/[ACTION]')
        .replace(/\?.*$/, ''); // Query parameters 제거
    }

    return event;
  };
}