/**
 * 보안 감사 로깅 시스템
 *
 * 모든 보안 관련 이벤트를 추적하고 기록
 */
import { NextRequest } from 'next/server';

import { createLogger } from '@/lib/logger';
import { createAdminClient } from '@/lib/supabase/server';

import { getClientIp } from './rate-limiter';

const logger = createLogger({ prefix: 'AuditLogger' });

/**
 * 감사 로그 이벤트 타입
 */
export type AuditEventType =
  | 'login_success'
  | 'login_failed'
  | 'logout'
  | 'signup_success'
  | 'signup_failed'
  | 'password_reset_request'
  | 'password_changed'
  | 'rate_limit_exceeded'
  | 'csp_violation'
  | 'unauthorized_access'
  | 'data_export'
  | 'data_deletion'
  | 'permission_changed'
  | 'suspicious_activity';

/**
 * 이벤트 카테고리
 */
export type EventCategory = 'auth' | 'security' | 'api' | 'data' | 'admin';

/**
 * 이벤트 심각도
 */
export type EventSeverity = 'info' | 'warning' | 'error' | 'critical';

/**
 * 감사 로그 데이터
 */
export interface AuditLogData {
  event_type: AuditEventType;
  event_category: EventCategory;
  severity?: EventSeverity;
  user_id?: string;
  user_email?: string;
  ip_address?: string;
  user_agent?: string;
  request_method?: string;
  request_path?: string;
  request_params?: Record<string, any>;
  response_status?: number;
  response_time_ms?: number;
  metadata?: Record<string, any>;
  error_message?: string;
  is_suspicious?: boolean;
}

/**
 * 감사 로그 기록
 *
 * @param data - 로그 데이터
 */
export async function logAuditEvent(data: AuditLogData): Promise<void> {
  try {
    const supabase = await createAdminClient();

    // 기본 심각도 설정
    if (!data.severity) {
      data.severity = getDefaultSeverity(data.event_type);
    }

    // 의심스러운 활동 자동 표시
    if (!data.is_suspicious) {
      data.is_suspicious = isSuspiciousEvent(data.event_type);
    }

    const { error } = await supabase.from('audit_logs').insert({
      ...data,
      created_at: new Date().toISOString(),
    });

    if (error) {
      logger.error('Failed to log audit event:', error);
      // 감사 로그 실패가 메인 작업을 방해하지 않도록 에러를 던지지 않음
    }

    // 심각한 이벤트는 즉시 알림 (선택적)
    if (data.severity === 'critical') {
      await notifyCriticalEvent(data);
    }
  } catch (error) {
    logger.error('Audit logging exception:', error);
    // 감사 로그 실패가 메인 작업을 방해하지 않도록 에러를 던지지 않음
  }
}

/**
 * NextRequest에서 감사 로그 데이터 추출
 *
 * @param request - NextRequest 객체
 * @param additionalData - 추가 데이터
 */
export function extractAuditDataFromRequest(
  request: NextRequest,
  additionalData?: Partial<AuditLogData>
): Partial<AuditLogData> {
  return {
    ip_address: getClientIp(request),
    user_agent: request.headers.get('user-agent') || undefined,
    request_method: request.method,
    request_path: request.nextUrl.pathname,
    request_params: {
      query: Object.fromEntries(request.nextUrl.searchParams),
    },
    ...additionalData,
  };
}

/**
 * 기본 심각도 결정
 */
function getDefaultSeverity(eventType: AuditEventType): EventSeverity {
  const severityMap: Record<AuditEventType, EventSeverity> = {
    login_success: 'info',
    login_failed: 'warning',
    logout: 'info',
    signup_success: 'info',
    signup_failed: 'warning',
    password_reset_request: 'info',
    password_changed: 'warning',
    rate_limit_exceeded: 'warning',
    csp_violation: 'warning',
    unauthorized_access: 'error',
    data_export: 'warning',
    data_deletion: 'warning',
    permission_changed: 'warning',
    suspicious_activity: 'critical',
  };

  return severityMap[eventType] || 'info';
}

/**
 * 의심스러운 이벤트 판별
 */
function isSuspiciousEvent(eventType: AuditEventType): boolean {
  const suspiciousEvents: AuditEventType[] = ['unauthorized_access', 'suspicious_activity'];

  return suspiciousEvents.includes(eventType);
}

/**
 * 심각한 이벤트 알림 (Sentry로 전송)
 */
async function notifyCriticalEvent(data: AuditLogData): Promise<void> {
  try {
    // Sentry가 설정되어 있으면 Sentry로 전송
    if (typeof window === 'undefined' && process.env.NEXT_PUBLIC_SENTRY_DSN) {
      const Sentry = await import('@sentry/nextjs');
      Sentry.captureMessage(`Critical security event: ${data.event_type}`, {
        level: 'error',
        extra: { ...data } as Record<string, any>,
        tags: {
          event_type: data.event_type,
          category: data.event_category,
        },
      });
    }

    // 추가 알림 채널 (이메일, Slack 등) 구현 가능
    logger.error(`CRITICAL SECURITY EVENT: ${data.event_type}`, data);
  } catch (error) {
    logger.error('Failed to notify critical event:', error);
  }
}

/**
 * 로그인 이벤트 기록
 */
export async function logLoginEvent(
  request: NextRequest,
  success: boolean,
  userEmail?: string,
  userId?: string,
  errorMessage?: string
): Promise<void> {
  const startTime = Date.now();

  await logAuditEvent({
    event_type: success ? 'login_success' : 'login_failed',
    event_category: 'auth',
    user_email: userEmail,
    user_id: userId,
    error_message: errorMessage,
    response_time_ms: Date.now() - startTime,
    ...extractAuditDataFromRequest(request),
  });
}

/**
 * Rate Limit 위반 기록
 */
export async function logRateLimitExceeded(
  request: NextRequest,
  endpoint: string,
  userId?: string
): Promise<void> {
  await logAuditEvent({
    event_type: 'rate_limit_exceeded',
    event_category: 'security',
    user_id: userId,
    metadata: { endpoint },
    ...extractAuditDataFromRequest(request),
  });
}

/**
 * CSP 위반 기록
 */
export async function logCSPViolation(violationReport: any, request?: NextRequest): Promise<void> {
  await logAuditEvent({
    event_type: 'csp_violation',
    event_category: 'security',
    metadata: violationReport,
    ...(request ? extractAuditDataFromRequest(request) : {}),
  });
}

/**
 * 권한 없는 접근 시도 기록
 */
export async function logUnauthorizedAccess(
  request: NextRequest,
  resource: string,
  userId?: string
): Promise<void> {
  await logAuditEvent({
    event_type: 'unauthorized_access',
    event_category: 'security',
    severity: 'error',
    user_id: userId,
    metadata: { resource },
    ...extractAuditDataFromRequest(request),
  });
}

/**
 * 데이터 작업 기록 (GDPR 준수)
 */
export async function logDataOperation(
  request: NextRequest,
  operation: 'export' | 'deletion',
  userId: string,
  dataType: string,
  recordCount?: number
): Promise<void> {
  await logAuditEvent({
    event_type: operation === 'export' ? 'data_export' : 'data_deletion',
    event_category: 'data',
    user_id: userId,
    metadata: {
      data_type: dataType,
      record_count: recordCount,
    },
    ...extractAuditDataFromRequest(request),
  });
}

/**
 * 보안 요약 통계 조회
 */
export async function getSecuritySummary(days: number = 7) {
  try {
    const supabase = await createAdminClient();

    const { data, error } = await supabase
      .from('security_summary')
      .select('*')
      .gte('date', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString());

    if (error) {
      logger.error('Failed to get security summary:', error);
      return null;
    }

    return data;
  } catch (error) {
    logger.error('Security summary exception:', error);
    return null;
  }
}

/**
 * 의심스러운 활동 조회
 */
export async function getSuspiciousActivities(limit: number = 100) {
  try {
    const supabase = await createAdminClient();

    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('is_suspicious', true)
      .eq('is_reviewed', false)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      logger.error('Failed to get suspicious activities:', error);
      return null;
    }

    return data;
  } catch (error) {
    logger.error('Suspicious activities exception:', error);
    return null;
  }
}
