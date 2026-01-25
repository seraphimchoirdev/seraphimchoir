/**
 * 핸드오프 문서 상세 API (관리자 전용)
 */
import fs from 'fs';
import path from 'path';

import { marked } from 'marked';
import { NextRequest, NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';

// GitHub 저장소 정보 (Vercel 환경용 폴백)
const GITHUB_OWNER = 'seraphimchoirdev';
const GITHUB_REPO = 'seraphimchoir';
const GITHUB_BRANCH = 'main';

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

    let markdown = '';

    // 방법 1: 로컬 파일 시스템에서 직접 읽기 (개발 환경)
    const filePath = path.join(process.cwd(), 'docs', 'handoff', `${date}.md`);
    if (fs.existsSync(filePath)) {
      markdown = fs.readFileSync(filePath, 'utf-8');
    } else {
      // 방법 2: GitHub raw content에서 가져오기 (Vercel 환경)
      const rawUrl = `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/${GITHUB_BRANCH}/docs/handoff/${date}.md`;
      const res = await fetch(rawUrl, { cache: 'no-store' });

      if (!res.ok) {
        if (res.status === 404) {
          return NextResponse.json({ error: '문서를 찾을 수 없습니다' }, { status: 404 });
        }
        throw new Error(`GitHub fetch failed: ${res.status}`);
      }

      markdown = await res.text();
    }

    // HTML로 변환
    const html = await marked(markdown);

    return NextResponse.json({ html, date }, { status: 200 });
  } catch (error) {
    console.error('Handoff detail API error:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 });
  }
}
