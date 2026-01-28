/**
 * 핸드오프 문서 목록 API (관리자 전용)
 */
import fs from 'fs';
import path from 'path';

import { NextRequest, NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';

interface HandoffFile {
  filename: string;
  date: string;
  title: string;
  project: string;
  size: number;
  modifiedAt: string;
}

interface HandoffManifest {
  files: HandoffFile[];
  generatedAt: string;
  totalCount: number;
}

/**
 * GET /api/admin/handoff
 *
 * 핸드오프 문서 목록 반환
 */
export async function GET(_request: NextRequest) {
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

    let files: string[] = [];

    // 방법 1: 로컬 파일 시스템에서 직접 읽기 (개발 환경)
    const handoffDir = path.join(process.cwd(), 'docs', 'handoff');
    if (fs.existsSync(handoffDir)) {
      files = fs
        .readdirSync(handoffDir)
        .filter((file) => file.endsWith('.md'))
        .sort((a, b) => b.localeCompare(a));
    } else {
      // 방법 2: 매니페스트 파일에서 읽기 (Vercel 환경)
      const manifestPath = path.join(process.cwd(), 'public', 'handoff-manifest.json');
      if (fs.existsSync(manifestPath)) {
        const manifestContent = fs.readFileSync(manifestPath, 'utf-8');
        const manifest: HandoffManifest = JSON.parse(manifestContent);
        files = manifest.files.map((f) => f.filename);
      }
    }

    return NextResponse.json(files, { status: 200 });
  } catch (error) {
    console.error('Handoff list API error:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 });
  }
}
