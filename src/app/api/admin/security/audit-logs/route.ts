/**
 * 보안 감사 로그 조회 API (관리자 전용)
 */
import { NextRequest, NextResponse } from 'next/server';

import { createLogger } from '@/lib/logger';
import { getSecuritySummary, getSuspiciousActivities } from '@/lib/security/audit-logger';
import { logUnauthorizedAccess } from '@/lib/security/audit-logger';
import {
  apiRateLimiter,
  createRateLimitErrorResponse,
  getClientIp,
} from '@/lib/security/rate-limiter';
import { createClient } from '@/lib/supabase/server';

const logger = createLogger({ prefix: 'SecurityAuditAPI' });

/**
 * GET /api/admin/security/audit-logs
 *
 * 보안 감사 로그 및 통계 조회
 */
export async function GET(request: NextRequest) {
  try {
    // Rate Limiting
    const ip = getClientIp(request);
    const { success, reset } = await apiRateLimiter.limit(ip);

    if (!success) {
      return NextResponse.json(createRateLimitErrorResponse(reset), { status: 429 });
    }

    const supabase = await createClient();

    // 인증 확인
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      await logUnauthorizedAccess(request, 'audit_logs');
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
    }

    // 관리자 권한 확인
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || !['ADMIN', 'MANAGER'].includes(profile.role)) {
      await logUnauthorizedAccess(request, 'audit_logs', user.id);
      return NextResponse.json({ error: '권한이 없습니다' }, { status: 403 });
    }

    // 쿼리 파라미터 파싱
    const searchParams = request.nextUrl.searchParams;
    const view = searchParams.get('view') || 'summary'; // summary, logs, suspicious
    const days = parseInt(searchParams.get('days') || '7');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    let responseData: Record<string, unknown> = {};

    // 뷰에 따라 다른 데이터 반환
    switch (view) {
      case 'summary':
        // 보안 요약 통계
        const summary = await getSecuritySummary(days);
        responseData = {
          summary,
          period_days: days,
        };
        break;

      case 'suspicious':
        // 의심스러운 활동
        const suspicious = await getSuspiciousActivities(limit);
        responseData = {
          suspicious_activities: suspicious,
          total_count: suspicious?.length || 0,
        };
        break;

      case 'logs':
      default:
        // 전체 감사 로그
        const {
          data: logs,
          error,
          count,
        } = await supabase
          .from('audit_logs')
          .select('*', { count: 'exact' })
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1);

        if (error) {
          logger.error('Failed to fetch audit logs:', error);
          return NextResponse.json({ error: '로그 조회 실패' }, { status: 500 });
        }

        responseData = {
          logs,
          total_count: count,
          limit,
          offset,
        };
        break;
    }

    return NextResponse.json(responseData, { status: 200 });
  } catch (error) {
    logger.error('Audit logs API error:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/security/audit-logs
 *
 * 감사 로그 리뷰 상태 업데이트 (의심스러운 활동 처리)
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 인증 및 권한 확인
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'ADMIN') {
      await logUnauthorizedAccess(request, 'audit_logs_update', user.id);
      return NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 });
    }

    // 요청 본문 파싱
    const body = await request.json();
    const { log_ids, is_reviewed } = body;

    if (!log_ids || !Array.isArray(log_ids)) {
      return NextResponse.json({ error: '로그 ID 목록이 필요합니다' }, { status: 400 });
    }

    // 로그 리뷰 상태 업데이트
    const { error } = await supabase
      .from('audit_logs')
      .update({
        is_reviewed,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      })
      .in('id', log_ids);

    if (error) {
      logger.error('Failed to update audit logs:', error);
      return NextResponse.json({ error: '업데이트 실패' }, { status: 500 });
    }

    return NextResponse.json(
      {
        message: '리뷰 상태가 업데이트되었습니다',
        updated_count: log_ids.length,
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error('Audit logs update error:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 });
  }
}
