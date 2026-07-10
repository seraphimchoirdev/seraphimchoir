import { z } from 'zod';

import { NextRequest, NextResponse } from 'next/server';

import { POLL_MANAGER_ROLES } from '@/lib/community/poll-constants';
import {
  fetchVoterMap,
  isEffectivelyClosed,
} from '@/lib/community/poll-server';
import { createAdminClient, createClient } from '@/lib/supabase/server';

import type {
  AttendanceStatus,
  AttendanceSummary,
  MyPollResponse,
  PollDetail,
  PollOptionWithVotes,
  PollTextResponse,
} from '@/types/community';

const updatePollSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  deadline_at: z.string().datetime({ offset: true }).nullable().optional(),
  is_closed: z.boolean().optional(),
});

/**
 * GET /api/community/polls/[id]
 * 설문 상세 (선택지·집계·내 응답 포함)
 *
 * 결과 공개 규칙:
 * - show_results_before_close=true 또는 마감됨 → 전체 공개
 * - 그 외에는 생성자·운영진(ADMIN/CONDUCTOR/MANAGER)만 중간 집계 열람
 * - 익명 설문은 집계만 공개하고 응답자 명단은 숨김
 */
export async function GET(
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

  // 가시성은 polls RLS가 결정 — 대상이 아니면 여기서 404
  const { data: poll } = await supabase
    .from('polls')
    .select('*')
    .eq('id', id)
    .eq('is_deleted', false)
    .maybeSingle();

  if (!poll) {
    return NextResponse.json(
      { error: '설문을 찾을 수 없습니다.' },
      { status: 404 }
    );
  }

  const adminClient = await createAdminClient();

  const [{ data: profile }, { data: options }, { data: responses }] =
    await Promise.all([
      adminClient
        .from('user_profiles')
        .select('role, linked_member_id')
        .eq('id', user.id)
        .single(),
      adminClient
        .from('poll_options')
        .select('*')
        .eq('poll_id', id)
        .order('sort_order'),
      adminClient
        .from('poll_responses')
        .select('*')
        .eq('poll_id', id)
        .order('created_at'),
    ]);

  const role = profile?.role || '';
  const canManage =
    poll.created_by === user.id || POLL_MANAGER_ROLES.includes(role);
  const effectivelyClosed = isEffectivelyClosed(poll);
  const resultsVisible =
    poll.show_results_before_close || effectivelyClosed || canManage;

  const allResponses = responses ?? [];
  const myResponses = allResponses.filter((r) => r.user_id === user.id);

  // 응답자 명단 (익명 설문이면 노출하지 않음)
  const voterMap = poll.is_anonymous
    ? new Map()
    : await fetchVoterMap(
        adminClient,
        allResponses.map((r) => r.user_id)
      );
  const toVoter = (userId: string) =>
    voterMap.get(userId) ?? null;

  // 선택지별 집계
  const optionRows: PollOptionWithVotes[] = (options ?? []).map((opt) => {
    const optResponses = allResponses.filter(
      (r) => r.selected_option_id === opt.id
    );
    return {
      ...opt,
      vote_count: resultsVisible ? optResponses.length : 0,
      voters: resultsVisible
        ? optResponses.map((r) => toVoter(r.user_id)).filter(Boolean)
        : [],
      is_my_choice: optResponses.some((r) => r.user_id === user.id),
    };
  });

  // 참석 조사 집계
  const attendanceSummary: AttendanceSummary[] = (
    ['attending', 'not_attending', 'undecided'] as AttendanceStatus[]
  ).map((status) => {
    const rows = allResponses.filter((r) => r.attendance_status === status);
    return {
      status,
      count: resultsVisible ? rows.length : 0,
      voters: resultsVisible
        ? rows.map((r) => toVoter(r.user_id)).filter(Boolean)
        : [],
    };
  });

  // 주관식 응답
  const textResponses: PollTextResponse[] = resultsVisible
    ? allResponses
        .filter((r) => r.text_response)
        .map((r) => ({
          id: r.id,
          text_response: r.text_response!,
          created_at: r.created_at,
          author: toVoter(r.user_id),
        }))
    : [];

  const myResponse: MyPollResponse | null =
    myResponses.length > 0
      ? {
          attendance_status:
            (myResponses.find((r) => r.attendance_status)
              ?.attendance_status as AttendanceStatus | undefined) ?? null,
          selected_option_ids: myResponses
            .map((r) => r.selected_option_id)
            .filter((v): v is string => Boolean(v)),
          text_response:
            myResponses.find((r) => r.text_response)?.text_response ?? null,
        }
      : null;

  // 투표 가능 여부: 대상 여부는 RLS가 최종 강제하지만 UI 판단용으로 계산
  const { data: audienceCheck } = await supabase.rpc('is_in_poll_audience', {
    p_audience_type: poll.audience_type,
    p_target_parts: poll.target_parts ?? [],
  });
  const canVote =
    !effectivelyClosed && Boolean(audienceCheck) && Boolean(profile?.linked_member_id);

  const creatorMap = await fetchVoterMap(adminClient, [poll.created_by]);
  const responderSet = new Set(allResponses.map((r) => r.user_id));

  const detail: PollDetail = {
    ...poll,
    creator: creatorMap.get(poll.created_by) ?? null,
    voter_count: responderSet.size,
    has_my_response: myResponses.length > 0,
    is_effectively_closed: effectivelyClosed,
    options: optionRows,
    attendance_summary: attendanceSummary,
    text_responses: textResponses,
    my_response: myResponse,
    can_vote: canVote,
    can_manage: canManage,
    results_visible: resultsVisible,
  };

  return NextResponse.json({ data: detail });
}

/**
 * PATCH /api/community/polls/[id]
 * 설문 수정 (제목/설명/마감시각/마감처리)
 * 권한: 생성자 또는 ADMIN/CONDUCTOR/MANAGER (RLS와 동일)
 */
export async function PATCH(
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
  const parsed = updatePollSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: '입력값이 올바르지 않습니다.' },
      { status: 400 }
    );
  }

  // RLS UPDATE 정책(생성자 or 운영진)이 강제 — 권한 없으면 0행 갱신
  const { data: updated, error } = await supabase
    .from('polls')
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('is_deleted', false)
    .select('*')
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: '설문 수정에 실패했습니다.' },
      { status: 500 }
    );
  }
  if (!updated) {
    return NextResponse.json(
      { error: '설문이 없거나 수정 권한이 없습니다.' },
      { status: 403 }
    );
  }

  return NextResponse.json({ data: updated });
}

/**
 * DELETE /api/community/polls/[id]
 * 설문 소프트 삭제 (is_deleted = true)
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

  const { data: deleted, error } = await supabase
    .from('polls')
    .update({ is_deleted: true, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('is_deleted', false)
    .select('id')
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: '설문 삭제에 실패했습니다.' },
      { status: 500 }
    );
  }
  if (!deleted) {
    return NextResponse.json(
      { error: '설문이 없거나 삭제 권한이 없습니다.' },
      { status: 403 }
    );
  }

  return NextResponse.json({ success: true });
}
