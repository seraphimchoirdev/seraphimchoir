import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { encryptConductorNotes, decryptConductorNotes } from '@/lib/crypto';
import { createLogger } from '@/lib/logger';

const logger = createLogger({ prefix: 'ConductorNotesAPI' });

/**
 * 지휘자 메모 조회 API
 * 오직 CONDUCTOR만 접근 가능 (ADMIN 포함 다른 역할 접근 불가)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;

    // 현재 사용자 확인
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    // 사용자 권한 확인 (오직 CONDUCTOR만 가능)
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: '사용자 프로필을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    if (profile.role !== 'CONDUCTOR') {
      return NextResponse.json(
        { error: '지휘자만 접근할 수 있습니다.' },
        { status: 403 }
      );
    }

    // 찬양대원 정보 조회 (암호화된 메모 포함)
    const { data: member, error: memberError } = await supabase
      .from('members')
      .select('id, name, encrypted_conductor_notes, conductor_notes_iv, conductor_notes_auth_tag')
      .eq('id', id)
      .single();

    if (memberError || !member) {
      return NextResponse.json(
        { error: '찬양대원을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 메모가 없으면 빈 문자열 반환
    if (
      !member.encrypted_conductor_notes ||
      !member.conductor_notes_iv ||
      !member.conductor_notes_auth_tag
    ) {
      return NextResponse.json({
        memberId: member.id,
        memberName: member.name,
        notes: '',
      });
    }

    // 복호화
    try {
      const decryptedNotes = decryptConductorNotes(
        member.encrypted_conductor_notes,
        member.conductor_notes_iv,
        member.conductor_notes_auth_tag
      );

      return NextResponse.json({
        memberId: member.id,
        memberName: member.name,
        notes: decryptedNotes,
      });
    } catch (decryptError) {
      logger.error('복호화 오류:', decryptError);
      return NextResponse.json(
        { error: '메모를 복호화할 수 없습니다. 데이터가 손상되었을 수 있습니다.' },
        { status: 500 }
      );
    }
  } catch (error) {
    logger.error('지휘자 메모 조회 오류:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

/**
 * 지휘자 메모 업데이트 API
 * 오직 CONDUCTOR만 접근 가능 (ADMIN 포함 다른 역할 접근 불가)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;

    // 현재 사용자 확인
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    // 사용자 권한 확인 (오직 CONDUCTOR만 가능)
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: '사용자 프로필을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    if (profile.role !== 'CONDUCTOR') {
      return NextResponse.json(
        { error: '지휘자만 접근할 수 있습니다.' },
        { status: 403 }
      );
    }

    // 요청 본문 파싱
    const body = await request.json();
    const { notes } = body;

    if (typeof notes !== 'string') {
      return NextResponse.json(
        { error: '메모는 문자열이어야 합니다.' },
        { status: 400 }
      );
    }

    // 찬양대원 존재 여부 확인
    const { data: member, error: memberError } = await supabase
      .from('members')
      .select('id, name')
      .eq('id', id)
      .single();

    if (memberError || !member) {
      return NextResponse.json(
        { error: '찬양대원을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 메모가 비어있으면 NULL로 저장
    if (!notes || notes.trim() === '') {
      const { error: updateError } = await supabase
        .from('members')
        .update({
          encrypted_conductor_notes: null,
          conductor_notes_iv: null,
          conductor_notes_auth_tag: null,
        })
        .eq('id', id);

      if (updateError) {
        logger.error('메모 삭제 오류:', updateError);
        return NextResponse.json(
          { error: '메모를 삭제할 수 없습니다.' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: '메모가 삭제되었습니다.',
        memberId: member.id,
        memberName: member.name,
      });
    }

    // 암호화
    try {
      const { encryptedText, iv, authTag } = encryptConductorNotes(notes);

      // DB 업데이트
      const { error: updateError } = await supabase
        .from('members')
        .update({
          encrypted_conductor_notes: encryptedText,
          conductor_notes_iv: iv,
          conductor_notes_auth_tag: authTag,
        })
        .eq('id', id);

      if (updateError) {
        logger.error('메모 저장 오류:', updateError);
        return NextResponse.json(
          { error: '메모를 저장할 수 없습니다.' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: '메모가 저장되었습니다.',
        memberId: member.id,
        memberName: member.name,
      });
    } catch (encryptError) {
      logger.error('암호화 오류:', encryptError);
      return NextResponse.json(
        { error: '메모를 암호화할 수 없습니다.' },
        { status: 500 }
      );
    }
  } catch (error) {
    logger.error('지휘자 메모 업데이트 오류:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

/**
 * 지휘자 메모 삭제 API
 * 오직 CONDUCTOR만 접근 가능 (ADMIN 포함 다른 역할 접근 불가)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;

    // 현재 사용자 확인
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    // 사용자 권한 확인 (오직 CONDUCTOR만 가능)
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: '사용자 프로필을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    if (profile.role !== 'CONDUCTOR') {
      return NextResponse.json(
        { error: '지휘자만 접근할 수 있습니다.' },
        { status: 403 }
      );
    }

    // 메모 삭제 (NULL로 설정)
    const { error: updateError } = await supabase
      .from('members')
      .update({
        encrypted_conductor_notes: null,
        conductor_notes_iv: null,
        conductor_notes_auth_tag: null,
      })
      .eq('id', id);

    if (updateError) {
      logger.error('메모 삭제 오류:', updateError);
      return NextResponse.json(
        { error: '메모를 삭제할 수 없습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '메모가 삭제되었습니다.',
    });
  } catch (error) {
    logger.error('지휘자 메모 삭제 오류:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
