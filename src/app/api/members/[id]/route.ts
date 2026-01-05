import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ApiError, handleApiError } from '@/lib/api-error-handler';
import { logger } from '@/lib/logger';

// Part enum validation
const PartEnum = z.enum(['SOPRANO', 'ALTO', 'TENOR', 'BASS', 'SPECIAL']);

// Member Status enum validation
const MemberStatusEnum = z.enum(['REGULAR', 'NEW', 'ON_LEAVE', 'RESIGNED']);

// Member update schema (모든 필드 optional)
const updateMemberSchema = z.object({
  name: z.string().min(2).max(50).optional(),
  part: PartEnum.optional(),
  is_leader: z.boolean().optional(),
  member_status: MemberStatusEnum.optional(),
  phone_number: z.string().nullable().optional(),
  email: z.string().email().nullable().optional(),
  notes: z.string().nullable().optional(),
  version: z.number().int().positive().optional(), // 낙관적 잠금을 위한 버전
  // 휴직 관련 필드
  leave_reason: z.string().nullable().optional(),
  leave_start_date: z.string().nullable().optional(), // YYYY-MM-DD 형식
  leave_duration_months: z.number().int().min(1).max(24).nullable().optional(),
  expected_return_date: z.string().nullable().optional(), // YYYY-MM-DD 형식
  joined_date: z.string().nullable().optional(), // 임명일
});

/**
 * GET /api/members/[id]
 * 찬양대원 단일 조회
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // 인증 확인
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
    }

    // members_public view 사용 (암호화 필드 제외)
    const { data: member, error } = await supabase
      .from('members_public')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw ApiError.notFound('찬양대원');
      }
      logger.error('Member fetch error:', error);
      throw ApiError.internal('찬양대원 조회에 실패했습니다');
    }

    return NextResponse.json({ data: member }, { status: 200 });
  } catch (error) {
    return handleApiError(error, 'GET /api/members/[id]');
  }
}

/**
 * PATCH /api/members/[id]
 * 찬양대원 정보 수정
 *
 * 권한: PART_LEADER 이상
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
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
    const validation = updateMemberSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: '입력값이 올바르지 않습니다', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { version: clientVersion, ...updateData } = validation.data;

    // updated_at은 자동으로 갱신되도록 DB trigger 설정되어 있음
    const dataToUpdate = {
      ...updateData,
      updated_at: new Date().toISOString(),
      // version 증가 (낙관적 잠금)
      ...(clientVersion !== undefined && { version: clientVersion + 1 }),
    };

    // 낙관적 잠금을 위한 원자적 업데이트
    // WHERE 절에서 version을 체크하여 경쟁 상태 방지
    let query = supabase
      .from('members')
      .update(dataToUpdate)
      .eq('id', id);

    // clientVersion이 있으면 WHERE 절에 version 조건 추가 (원자적 체크)
    if (clientVersion !== undefined) {
      query = query.eq('version', clientVersion);
    }

    const { data: updatedMember, error } = await query.select().single();

    if (error) {
      // PGRST116: 결과 없음 - version 불일치 또는 id 없음
      if (error.code === 'PGRST116') {
        // clientVersion이 있었다면 version 충돌 가능성 확인
        if (clientVersion !== undefined) {
          const { data: existingMember } = await supabase
            .from('members')
            .select('id, version')
            .eq('id', id)
            .single();

          if (existingMember) {
            // 멤버는 존재하지만 version이 다름 = 충돌
            throw ApiError.versionConflict(
              '이 회원 정보가 다른 곳에서 수정되었습니다. 페이지를 새로고침해주세요.'
            );
          }
        }
        throw ApiError.notFound('찬양대원');
      }
      logger.error('Member update error:', error);
      throw ApiError.internal('찬양대원 수정에 실패했습니다');
    }

    return NextResponse.json({ data: updatedMember, message: '찬양대원 정보가 성공적으로 수정되었습니다' }, { status: 200 });
  } catch (error) {
    return handleApiError(error, 'PATCH /api/members/[id]');
  }
}

/**
 * DELETE /api/members/[id]
 * 찬양대원 삭제
 *
 * 권한: MANAGER 이상
 * CASCADE 삭제: attendances, seats 자동 삭제됨
 */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // 인증 확인
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw ApiError.unauthorized();
    }

    // 권한 확인 (MANAGER 이상)
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const allowedRoles = ['ADMIN', 'CONDUCTOR', 'MANAGER'];
    if (!profile || !allowedRoles.includes(profile.role)) {
      throw ApiError.forbidden('MANAGER 이상 권한이 필요합니다');
    }

    // Supabase delete (CASCADE로 attendances, seats 자동 삭제)
    const { error } = await supabase.from('members').delete().eq('id', id);

    if (error) {
      logger.error('Member delete error:', error);
      throw ApiError.internal('찬양대원 삭제에 실패했습니다');
    }

    return NextResponse.json({ message: '찬양대원이 성공적으로 삭제되었습니다' }, { status: 200 });
  } catch (error) {
    return handleApiError(error, 'DELETE /api/members/[id]');
  }
}
