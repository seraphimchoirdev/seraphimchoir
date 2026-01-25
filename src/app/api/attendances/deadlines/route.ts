import { z } from 'zod';

import { NextRequest, NextResponse } from 'next/server';

import { createLogger } from '@/lib/logger';
import { createClient } from '@/lib/supabase/server';

import type { Database } from '@/types/database.types';

const logger = createLogger({ prefix: 'DeadlinesAPI' });

type Part = Database['public']['Enums']['part'];

// 마감 생성 스키마
const createDeadlineSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '날짜 형식은 YYYY-MM-DD여야 합니다'),
  part: z.enum(['SOPRANO', 'ALTO', 'TENOR', 'BASS', 'SPECIAL']).nullable().optional(),
});

/**
 * GET /api/attendances/deadlines
 * 특정 날짜의 마감 상태 조회
 * 쿼리 파라미터:
 * - date: 조회할 날짜 (YYYY-MM-DD, 필수)
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

    const searchParams = request.nextUrl.searchParams;
    const date = searchParams.get('date');

    if (!date) {
      return NextResponse.json({ error: '날짜 파라미터가 필요합니다' }, { status: 400 });
    }

    // 마감 데이터 조회 (closer 정보는 별도 조회)
    const { data, error } = await supabase
      .from('attendance_deadlines')
      .select('*')
      .eq('date', date);

    if (error) {
      logger.error('Supabase error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // closer 정보 조회 (user_profiles에서)
    const closerIds = [...new Set(data?.map((d) => d.closed_by) || [])];
    const closerMap: Record<string, { id: string; name: string; email: string }> = {};

    if (closerIds.length > 0) {
      const { data: closers } = await supabase
        .from('user_profiles')
        .select('id, name, email')
        .in('id', closerIds);

      closers?.forEach((c) => {
        closerMap[c.id] = c;
      });
    }

    // 데이터에 closer 정보 추가
    const dataWithCloser = data?.map((d) => ({
      ...d,
      closer: closerMap[d.closed_by] || null,
    }));

    // 파트별 마감과 전체 마감을 구분하여 응답
    const partDeadlines: Record<string, (typeof dataWithCloser)[0] | null> = {
      SOPRANO: null,
      ALTO: null,
      TENOR: null,
      BASS: null,
      SPECIAL: null,
    };
    let fullDeadline: (typeof dataWithCloser)[0] | null = null;

    dataWithCloser?.forEach((deadline) => {
      if (deadline.part === null) {
        fullDeadline = deadline;
      } else {
        partDeadlines[deadline.part] = deadline;
      }
    });

    return NextResponse.json({
      date,
      partDeadlines,
      fullDeadline,
      isFullyClosed: fullDeadline !== null,
    });
  } catch (error) {
    logger.error('Deadlines GET error:', error);
    return NextResponse.json({ error: '마감 상태를 불러오는데 실패했습니다' }, { status: 500 });
  }
}

/**
 * POST /api/attendances/deadlines
 * 마감 처리
 * 권한:
 * - 파트 마감: PART_LEADER는 자기 파트만, CONDUCTOR/ADMIN은 모든 파트
 * - 전체 마감: CONDUCTOR/ADMIN만
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 인증 확인
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
    }

    // 사용자 프로필 및 권한 확인
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role, email')
      .eq('id', user.id)
      .single();

    const userRole = profile?.role;
    const userEmail = profile?.email;

    const allowedRoles = ['ADMIN', 'CONDUCTOR', 'MANAGER', 'PART_LEADER'];
    if (!userRole || !allowedRoles.includes(userRole)) {
      return NextResponse.json({ error: '마감 처리 권한이 없습니다' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = createDeadlineSchema.parse(body);

    // 전체 마감인 경우 (part가 없거나 null)
    const isFullDeadline = validatedData.part === undefined || validatedData.part === null;

    if (isFullDeadline) {
      // 전체 마감은 CONDUCTOR/ADMIN만 가능
      if (!['ADMIN', 'CONDUCTOR'].includes(userRole)) {
        return NextResponse.json(
          { error: '전체 마감은 CONDUCTOR 또는 ADMIN만 할 수 있습니다' },
          { status: 403 }
        );
      }
    } else {
      // 파트 마감인 경우
      // PART_LEADER는 자기 파트만 마감 가능
      if (userRole === 'PART_LEADER') {
        // 파트장의 파트 확인 (members 테이블에서 이메일로 조회)
        const { data: member } = await supabase
          .from('members')
          .select('part, is_leader')
          .eq('email', userEmail)
          .eq('is_leader', true)
          .single();

        if (!member || member.part !== validatedData.part) {
          return NextResponse.json({ error: '자신의 파트만 마감할 수 있습니다' }, { status: 403 });
        }
      }
      // MANAGER, CONDUCTOR, ADMIN은 모든 파트 마감 가능
    }

    // 마감 생성
    const { data, error } = await supabase
      .from('attendance_deadlines')
      .insert({
        date: validatedData.date,
        part: isFullDeadline ? null : (validatedData.part as Part),
        closed_by: user.id,
      })
      .select()
      .single();

    if (error) {
      logger.error('Supabase error:', error);
      // 중복 에러 처리 (UNIQUE constraint)
      if (error.code === '23505') {
        return NextResponse.json(
          {
            error: isFullDeadline ? '이미 전체 마감되었습니다' : '해당 파트가 이미 마감되었습니다',
          },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }

    logger.error('Deadlines POST error:', error);
    return NextResponse.json({ error: '마감 처리에 실패했습니다' }, { status: 500 });
  }
}
