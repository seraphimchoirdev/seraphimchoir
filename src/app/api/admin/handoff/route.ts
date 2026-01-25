/**
 * 핸드오프 문서 목록 API (관리자 전용)
 */
import fs from 'fs';
import path from 'path';

import { NextRequest, NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/admin/handoff
 *
 * docs/handoff 폴더의 마크다운 파일 목록 반환
 */
export async function GET(request: NextRequest) {
  try {
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

    // docs/handoff 폴더에서 .md 파일 목록 읽기
    const handoffDir = path.join(process.cwd(), 'docs', 'handoff');

    // 폴더가 없으면 빈 배열 반환
    if (!fs.existsSync(handoffDir)) {
      return NextResponse.json([], { status: 200 });
    }

    const files = fs
      .readdirSync(handoffDir)
      .filter((file) => file.endsWith('.md'))
      .sort((a, b) => b.localeCompare(a)); // 최신 날짜 순

    return NextResponse.json(files, { status: 200 });
  } catch (error) {
    console.error('Handoff list API error:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 });
  }
}
