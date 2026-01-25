/**
 * 핸드오프 문서 상세 API (관리자 전용)
 */
import fs from 'fs';
import path from 'path';

import { marked } from 'marked';
import { NextRequest, NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/admin/handoff/[date]
 *
 * 특정 날짜의 핸드오프 문서를 HTML로 변환하여 반환
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ date: string }> }) {
  try {
    const { date } = await params;
    const supabase = await createClient();

    // 인증 확인
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
    }

    // 관리자 권한 확인
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || !['ADMIN', 'MANAGER'].includes(profile.role)) {
      return NextResponse.json({ error: '권한이 없습니다' }, { status: 403 });
    }

    // 날짜 형식 검증 (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: '잘못된 날짜 형식입니다' }, { status: 400 });
    }

    // 파일 경로 구성
    const filePath = path.join(process.cwd(), 'docs', 'handoff', `${date}.md`);

    // 파일 존재 확인
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: '문서를 찾을 수 없습니다' }, { status: 404 });
    }

    // 마크다운 파일 읽기
    const markdown = fs.readFileSync(filePath, 'utf-8');

    // HTML로 변환
    const html = await marked(markdown);

    return NextResponse.json({ html, date }, { status: 200 });
  } catch (error) {
    console.error('Handoff detail API error:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 });
  }
}
