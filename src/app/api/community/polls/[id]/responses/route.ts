import { z } from 'zod';

import { NextRequest, NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';

const submitResponseSchema = z
  .object({
    attendance_status: z
      .enum(['attending', 'not_attending', 'undecided'])
      .optional(),
    option_ids: z.array(z.string().uuid()).max(20).optional(),
    text_response: z.string().min(1).max(2000).optional(),
  })
  .refine(
    (v) =>
      [v.attendance_status, v.option_ids, v.text_response].filter(
        (x) => x !== undefined
      ).length === 1,
    { message: '응답 유형은 한 가지만 보낼 수 있습니다.' }
  );

/**
 * POST /api/community/polls/[id]/responses
 * 투표/응답 제출 (재응답 = 기존 응답 교체)
 *
 * 대상 여부·마감·본인 확인은 poll_responses RLS(INSERT 정책)가 최종 강제한다.
 * 여기서는 poll_type 정합성 검증과 교체(delete-then-insert) 시맨틱만 처리.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
  }

  const body = await request.json();
  const parsed = submitResponseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || '입력값이 올바르지 않습니다.' },
      { status: 400 }
    );
  }
  const input = parsed.data;

  // 설문 조회 (RLS 적용 — 대상 아니면 404)
  const { data: poll } = await supabase
    .from('polls')
    .select(
      'id, poll_type, allow_multiple, is_closed, deadline_at, is_deleted, audience_type, target_parts'
    )
    .eq('id', id)
    .eq('is_deleted', false)
    .maybeSingle();

  if (!poll) {
    return NextResponse.json(
      { error: '설문을 찾을 수 없습니다.' },
      { status: 404 }
    );
  }

  // poll_type과 응답 유형 정합성
  if (poll.poll_type === 'attendance' && !input.attendance_status) {
    return NextResponse.json(
      { error: '참석 조사에는 참석 여부를 선택해야 합니다.' },
      { status: 400 }
    );
  }
  if (poll.poll_type === 'choice') {
    if (!input.option_ids || input.option_ids.length === 0) {
      return NextResponse.json(
        { error: '선택지를 골라야 합니다.' },
        { status: 400 }
      );
    }
    if (!poll.allow_multiple && input.option_ids.length > 1) {
      return NextResponse.json(
        { error: '이 투표는 하나만 선택할 수 있습니다.' },
        { status: 400 }
      );
    }
    // 선택지가 이 설문의 것인지 검증
    const { data: validOptions } = await supabase
      .from('poll_options')
      .select('id')
      .eq('poll_id', id)
      .in('id', input.option_ids);
    if ((validOptions?.length ?? 0) !== input.option_ids.length) {
      return NextResponse.json(
        { error: '유효하지 않은 선택지가 포함되어 있습니다.' },
        { status: 400 }
      );
    }
  }
  if (poll.poll_type === 'open_ended' && !input.text_response) {
    return NextResponse.json(
      { error: '응답 내용을 입력해야 합니다.' },
      { status: 400 }
    );
  }

  // 삭제 전에 투표 자격을 선검증한다.
  // delete-then-insert 도중 INSERT만 RLS에 막히면 기존 표가 유실되기 때문
  // (예: 파트 이동으로 대상에서 빠진 대원의 재투표 시도)
  const isClosed =
    poll.is_closed ||
    (poll.deadline_at && new Date(poll.deadline_at) <= new Date());
  if (isClosed) {
    return NextResponse.json(
      { error: '마감된 설문입니다.' },
      { status: 403 }
    );
  }
  const { data: inAudience } = await supabase.rpc('is_in_poll_audience', {
    p_audience_type: poll.audience_type,
    p_target_parts: poll.target_parts ?? [],
  });
  if (!inAudience) {
    return NextResponse.json(
      { error: '이 설문의 투표 대상이 아닙니다.' },
      { status: 403 }
    );
  }

  // 재응답 = 교체: 내 기존 응답 삭제 후 새로 INSERT
  const { error: deleteError } = await supabase
    .from('poll_responses')
    .delete()
    .eq('poll_id', id)
    .eq('user_id', user.id);

  if (deleteError) {
    return NextResponse.json(
      { error: '기존 응답 정리에 실패했습니다.' },
      { status: 500 }
    );
  }

  const rows =
    poll.poll_type === 'choice'
      ? input.option_ids!.map((optionId) => ({
          poll_id: id,
          user_id: user.id,
          selected_option_id: optionId,
        }))
      : [
          {
            poll_id: id,
            user_id: user.id,
            attendance_status: input.attendance_status ?? null,
            text_response: input.text_response ?? null,
          },
        ];

  const { error: insertError } = await supabase
    .from('poll_responses')
    .insert(rows);

  if (insertError) {
    // RLS 차단(대상 아님/마감)과 서버 오류를 구분해 응답
    const isRlsBlock = insertError.code === '42501';
    return NextResponse.json(
      {
        error: isRlsBlock
          ? '투표 대상이 아니거나 마감된 설문입니다.'
          : '응답 제출에 실패했습니다.',
      },
      { status: isRlsBlock ? 403 : 500 }
    );
  }

  return NextResponse.json({ success: true }, { status: 201 });
}

/**
 * DELETE /api/community/polls/[id]/responses
 * 내 응답 취소 (마감 전에만 — RLS가 강제)
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
  }

  const { error } = await supabase
    .from('poll_responses')
    .delete()
    .eq('poll_id', id)
    .eq('user_id', user.id);

  if (error) {
    return NextResponse.json(
      { error: '응답 취소에 실패했습니다.' },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
