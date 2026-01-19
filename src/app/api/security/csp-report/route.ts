/**
 * CSP 위반 리포트 수신 API
 *
 * 브라우저가 CSP 위반을 감지하면 이 엔드포인트로 리포트를 전송합니다.
 */

import { NextRequest, NextResponse } from 'next/server';
import { logCSPViolation } from '@/lib/security/audit-logger';
import { createLogger } from '@/lib/logger';

const logger = createLogger({ prefix: 'CSPReport' });

/**
 * POST /api/security/csp-report
 *
 * CSP 위반 리포트를 수신하고 감사 로그에 기록
 */
export async function POST(request: NextRequest) {
  try {
    // CSP 리포트는 application/csp-report 또는 application/json으로 전송됨
    const contentType = request.headers.get('content-type') || '';

    let report;
    if (contentType.includes('application/csp-report') || contentType.includes('application/json')) {
      const body = await request.json();
      report = body['csp-report'] || body;
    } else {
      // 텍스트로 받은 경우 파싱 시도
      const text = await request.text();
      try {
        const parsed = JSON.parse(text);
        report = parsed['csp-report'] || parsed;
      } catch {
        report = { raw: text };
      }
    }

    // 리포트 구조 확인 및 정규화
    const normalizedReport = {
      document_uri: report['document-uri'] || report.documentURI,
      referrer: report.referrer,
      violated_directive: report['violated-directive'] || report.violatedDirective,
      effective_directive: report['effective-directive'] || report.effectiveDirective,
      original_policy: report['original-policy'] || report.originalPolicy,
      blocked_uri: report['blocked-uri'] || report.blockedURI,
      line_number: report['line-number'] || report.lineNumber,
      column_number: report['column-number'] || report.columnNumber,
      source_file: report['source-file'] || report.sourceFile,
      status_code: report['status-code'] || report.statusCode,
      script_sample: report['script-sample'] || report.scriptSample,
    };

    // 무시할 패턴 (브라우저 확장 프로그램 등)
    const ignoredPatterns = [
      'chrome-extension://',
      'moz-extension://',
      'safari-extension://',
      'about:',
      'resource://',
      'webpack-internal://',
      'eval',
    ];

    const shouldIgnore = ignoredPatterns.some(pattern =>
      normalizedReport.blocked_uri?.includes(pattern) ||
      normalizedReport.source_file?.includes(pattern)
    );

    if (shouldIgnore) {
      logger.debug('Ignored CSP violation from browser extension or internal source');
      return NextResponse.json({ status: 'ignored' }, { status: 204 });
    }

    // 감사 로그에 기록
    await logCSPViolation(normalizedReport, request);

    // 개발 환경에서는 콘솔에도 출력
    if (process.env.NODE_ENV === 'development') {
      logger.warn('CSP Violation:', normalizedReport);
    }

    // 204 No Content 응답 (CSP 리포트 표준)
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    logger.error('Failed to process CSP report:', error);
    // CSP 리포트 처리 실패가 클라이언트에 영향을 주지 않도록 204 응답
    return new NextResponse(null, { status: 204 });
  }
}

/**
 * OPTIONS /api/security/csp-report
 *
 * CORS 프리플라이트 요청 처리
 */
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}