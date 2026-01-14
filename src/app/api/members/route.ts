import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import type { PaginatedResponse, PaginationMeta } from '@/types/api';

// Part enum validation
const PartEnum = z.enum(['SOPRANO', 'ALTO', 'TENOR', 'BASS', 'SPECIAL']);

// Member Status enum validation
const MemberStatusEnum = z.enum(['REGULAR', 'NEW', 'ON_LEAVE', 'RESIGNED']);

// Query parameters validation schema
const queryParamsSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0).nullish(),
  page: z.coerce.number().int().min(1).optional().nullish(),
  part: PartEnum.optional().nullish(),
  search: z.string().optional().nullish(),
  member_status: MemberStatusEnum.optional().nullish(),
  sortBy: z.enum(['name', 'part', 'createdAt']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

// Member creation schema
const createMemberSchema = z.object({
  name: z.string().min(2, '이름은 최소 2자 이상이어야 합니다').max(50, '이름은 최대 50자까지 입력 가능합니다'),
  part: PartEnum,
  is_leader: z.boolean().default(false),
  member_status: MemberStatusEnum.default('NEW'),
  joined_date: z.string().optional(), // YYYY-MM-DD 형식, 미입력 시 오늘 날짜
  phone_number: z.string().nullable().optional(),
  email: z.string().email('올바른 이메일 형식이 아닙니다').nullable().optional(),
  notes: z.string().nullable().optional(),
});

/**
 * GET /api/members
 * 찬양대원 목록 조회 (페이지네이션, 필터링, 검색, 정렬 지원)
 *
 * Query Parameters:
 * - limit: number (페이지당 항목 수, 기본값: 20, 최대값: 100)
 * - offset: number (건너뛸 항목 수, 기본값: 0)
 * - page: number (페이지 번호, 선택사항, offset 대신 사용 가능)
 * - part: SOPRANO | ALTO | TENOR | BASS | SPECIAL (파트별 필터링)
 * - search: string (이름 검색)
 * - member_status: REGULAR | NEW | ON_LEAVE | RESIGNED (상태별 필터링)
 * - sortBy: name | part | createdAt (정렬 기준, 기본값: createdAt)
 * - sortOrder: asc | desc (정렬 순서, 기본값: desc)
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

    // Query parameters 파싱 및 검증 (null을 undefined로 변환)
    const searchParams = request.nextUrl.searchParams;
    const rawParams = {
      limit: searchParams.get('limit') ?? undefined,
      offset: searchParams.get('offset') ?? undefined,
      page: searchParams.get('page') ?? undefined,
      part: searchParams.get('part') ?? undefined,
      search: searchParams.get('search') ?? undefined,
      member_status: searchParams.get('member_status') ?? undefined,
      sortBy: searchParams.get('sortBy') ?? undefined,
      sortOrder: searchParams.get('sortOrder') ?? undefined,
    };

    const validation = queryParamsSchema.safeParse(rawParams);

    if (!validation.success) {
      console.error('Query validation failed:', {
        rawParams,
        errors: validation.error.issues,
      });
      return NextResponse.json(
        { error: '쿼리 파라미터가 올바르지 않습니다', details: validation.error.issues },
        { status: 400 }
      );
    }

    const params = validation.data;

    // page 파라미터가 있으면 offset 계산
    let offset = params.offset ?? 0;
    let page = params.page ?? 1;
    if (params.page) {
      offset = (params.page - 1) * params.limit;
    } else {
      page = Math.floor(offset / params.limit) + 1;
    }

    // sortBy 값에 따라 DB 컬럼명 매핑
    const columnMap: Record<string, string> = {
      name: 'name',
      part: 'part',
      createdAt: 'created_at',
    };

    // Supabase query (members_public view 사용 - 암호화 필드 제외)
    let query = supabase
      .from('members_public')
      .select('*', { count: 'exact' });

    // 파트 필터링
    if (params.part) {
      query = query.eq('part', params.part);
    }

    // 이름 검색 (부분 일치)
    if (params.search) {
      // SQL 와일드카드 문자 이스케이프하여 injection 방지
      const sanitizedSearch = params.search
        .replace(/[%_\\]/g, '\\$&')  // SQL 와일드카드 및 이스케이프 문자 처리
        .trim();

      if (sanitizedSearch.length > 0) {
        query = query.ilike('name', `%${sanitizedSearch}%`);
      }
    }

    // 상태 필터링
    if (params.member_status) {
      query = query.eq('member_status', params.member_status);
    }

    // 정렬 적용
    const sortColumn = columnMap[params.sortBy];
    query = query.order(sortColumn, { ascending: params.sortOrder === 'asc' });

    // 페이지네이션 적용
    query = query.range(offset, offset + params.limit - 1);

    const { data: members, error, count } = await query;

    if (error) {
      console.error('Members fetch error:', error);
      return NextResponse.json({ error: '찬양대원 목록을 불러오는데 실패했습니다' }, { status: 500 });
    }

    // 페이지네이션 메타데이터 계산
    const total = count || 0;
    const totalPages = Math.ceil(total / params.limit);

    const meta: PaginationMeta = {
      total,
      page,
      limit: params.limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };

    const response: PaginatedResponse<typeof members[0]> = {
      data: members || [],
      meta,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('GET /api/members error:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 });
  }
}

/**
 * POST /api/members
 * 찬양대원 신규 등록
 *
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
    if (!profile || !allowedRoles.includes(profile.role)) {
      return NextResponse.json({ error: '권한이 없습니다' }, { status: 403 });
    }

    // Request body 파싱 및 검증
    const body = await request.json();
    const validation = createMemberSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: '입력값이 올바르지 않습니다', details: validation.error.issues },
        { status: 400 }
      );
    }

    const memberData = validation.data;

    // joined_date 기본값 설정 (오늘 날짜)
    const today = new Date().toISOString().split('T')[0];
    const dataToInsert = {
      ...memberData,
      joined_date: memberData.joined_date || today,
    };

    // Supabase insert
    const { data: newMember, error } = await supabase
      .from('members')
      .insert([dataToInsert])
      .select()
      .single();

    if (error) {
      console.error('Member creation error:', error);
      return NextResponse.json({ error: '찬양대원 등록에 실패했습니다' }, { status: 500 });
    }

    return NextResponse.json({ data: newMember, message: '찬양대원이 성공적으로 등록되었습니다' }, { status: 201 });
  } catch (error) {
    console.error('POST /api/members error:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 });
  }
}
