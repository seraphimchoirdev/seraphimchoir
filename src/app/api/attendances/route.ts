import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Attendance 생성 스키마
const createAttendanceSchema = z.object({
  member_id: z.string().uuid('유효한 찬양대원 ID를 입력해주세요'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '날짜 형식은 YYYY-MM-DD여야 합니다'),
  is_service_available: z.boolean().default(true),
  is_practice_attended: z.boolean().default(true),
  notes: z.string().nullable().optional(),
});

/**
 * GET /api/attendances
 * 출석 현황 목록 조회 (필터링 지원)
 * 쿼리 파라미터:
 * - member_id: 특정 찬양대원 필터링
 * - date: 특정 날짜 필터링 (YYYY-MM-DD)
 * - start_date, end_date: 날짜 범위 필터링
 * - is_service_available: 등단 가능 여부 필터링 (true/false)
 * - is_practice_attended: 연습 참석 여부 필터링 (true/false)
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
    const memberId = searchParams.get('member_id');
    const date = searchParams.get('date');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    // is_available은 backward compatibility를 위해 is_service_available로 매핑
    const isAvailable = searchParams.get('is_available');
    const isServiceAvailable = searchParams.get('is_service_available') || isAvailable;
    const isPracticeAttended = searchParams.get('is_practice_attended');

    // 필터가 하나도 없으면 빈 배열 반환 (의도치 않은 전체 조회 방지)
    const hasAnyFilter = memberId || date || startDate || endDate || isServiceAvailable || isPracticeAttended;
    if (!hasAnyFilter) {
      console.log('Attendances: No filters provided, returning empty array');
      return NextResponse.json([]);
    }

    // Supabase max_rows=1000 제한 우회를 위한 페이지네이션
    const PAGE_SIZE = 1000;
    let allData: Array<{
      id: string;
      member_id: string;
      date: string;
      is_service_available: boolean;
      is_practice_attended: boolean;
      notes: string | null;
      created_at: string;
      updated_at: string;
      members: { id: string; name: string; part: string };
    }> = [];
    let page = 0;
    let hasMore = true;

    while (hasMore) {
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = supabase
        .from('attendances')
        .select(`
          *,
          members!member_id(
            id,
            name,
            part
          )
        `)
        .order('date', { ascending: false })
        .range(from, to);

      // 필터 적용
      if (memberId) {
        query = query.eq('member_id', memberId);
      }

      if (date) {
        query = query.eq('date', date);
      }

      if (startDate && endDate) {
        query = query.gte('date', startDate).lte('date', endDate);
      } else if (startDate) {
        query = query.gte('date', startDate);
      } else if (endDate) {
        query = query.lte('date', endDate);
      }

      if (isServiceAvailable !== null) {
        query = query.eq('is_service_available', isServiceAvailable === 'true');
      }

      if (isPracticeAttended !== null) {
        query = query.eq('is_practice_attended', isPracticeAttended === 'true');
      }

      const { data: pageData, error: pageError } = await query;

      if (pageError) {
        console.error('Supabase error:', pageError);
        return NextResponse.json({ error: pageError.message }, { status: 500 });
      }

      if (pageData && pageData.length > 0) {
        allData = allData.concat(pageData);
        hasMore = pageData.length === PAGE_SIZE;
        page++;
      } else {
        hasMore = false;
      }
    }

    return NextResponse.json(allData);
  } catch (error) {
    console.error('Attendances GET error:', error);
    return NextResponse.json(
      { error: '출석 현황을 불러오는데 실패했습니다' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/attendances
 * 새 출석 기록 생성
 * 권한: PART_LEADER 이상
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

    // 권한 확인 (PART_LEADER 이상)
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const allowedRoles = ['ADMIN', 'CONDUCTOR', 'MANAGER', 'PART_LEADER'];
    if (!profile?.role || !allowedRoles.includes(profile.role)) {
      return NextResponse.json(
        { error: '출석 기록 생성 권한이 없습니다' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = createAttendanceSchema.parse(body);

    const { data, error } = await supabase
      .from('attendances')
      .insert(validatedData)
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      // 중복 에러 처리 (UNIQUE constraint)
      if (error.code === '23505') {
        return NextResponse.json(
          { error: '해당 날짜에 이미 출석 기록이 존재합니다' },
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

    console.error('Attendances POST error:', error);
    return NextResponse.json(
      { error: '출석 기록 생성에 실패했습니다' },
      { status: 500 }
    );
  }
}
