import { z } from 'zod';

import { NextRequest, NextResponse } from 'next/server';

import {
  POLL_CREATOR_ROLES,
  POLL_SENIOR_STAFF_ROLES,
} from '@/lib/community/poll-constants';
import {
  fetchVoterMap,
  isEffectivelyClosed,
} from '@/lib/community/poll-server';
import { createAdminClient, createClient } from '@/lib/supabase/server';

import type { PollWithMeta } from '@/types/community';

const PART_VALUES = ['SOPRANO', 'ALTO', 'TENOR', 'BASS', 'SPECIAL'] as const;

const createPollSchema = z
  .object({
    title: z.string().min(1).max(200),
    description: z.string().max(2000).optional(),
    poll_type: z.enum(['attendance', 'choice', 'open_ended']),
    audience_type: z.enum(['ALL', 'STAFF', 'PART']),
    target_parts: z.array(z.enum(PART_VALUES)).min(1).max(5).optional(),
    options: z.array(z.string().min(1).max(100)).min(2).max(20).optional(),
    is_anonymous: z.boolean().optional(),
    allow_multiple: z.boolean().optional(),
    deadline_at: z.string().datetime({ offset: true }).nullable().optional(),
    show_results_before_close: z.boolean().optional(),
  })
  .refine(
    (v) => v.audience_type !== 'PART' || (v.target_parts?.length ?? 0) > 0,
    { message: '파트 대상 설문은 대상 파트를 선택해야 합니다.' }
  )
  .refine((v) => v.poll_type !== 'choice' || (v.options?.length ?? 0) >= 2, {
    message: '선택 투표는 선택지가 2개 이상 필요합니다.',
  });

/**
 * GET /api/community/polls
 * 설문 목록 (커서 기반 페이지네이션)
 *
 * 가시성(대상 아님 → 완전 숨김)은 polls RLS SELECT 정책이 담당하므로
 * 일반 클라이언트로 조회한다. 필터를 앱에서 중복 구현하지 않는다.
 *
 * Query params:
 * - status: active | closed (default: active)
 * - cursor: ISO timestamp
 * - limit: number (default 20)
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const status = searchParams.get('status') || 'active';
  const cursor = searchParams.get('cursor');
  const limit = Math.min(Number(searchParams.get('limit')) || 20, 50);
  const nowIso = new Date().toISOString();

  let query = supabase
    .from('polls')
    .select('*')
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (status === 'closed') {
    query = query.or(`is_closed.eq.true,deadline_at.lte.${nowIso}`);
  } else {
    query = query
      .eq('is_closed', false)
      .or(`deadline_at.is.null,deadline_at.gt.${nowIso}`);
  }

  if (cursor) {
    query = query.lt('created_at', cursor);
  }

  const { data: polls, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const adminClient = await createAdminClient();
  const pollIds = (polls ?? []).map((p) => p.id);

  // 응답자 수(사람 기준) + 내 응답 여부
  const responderMap = new Map<string, Set<string>>();
  if (pollIds.length > 0) {
    const { data: responses } = await adminClient
      .from('poll_responses')
      .select('poll_id, user_id')
      .in('poll_id', pollIds);
    for (const r of responses ?? []) {
      if (!responderMap.has(r.poll_id)) responderMap.set(r.poll_id, new Set());
      responderMap.get(r.poll_id)!.add(r.user_id);
    }
  }

  const creatorMap = await fetchVoterMap(
    adminClient,
    (polls ?? []).map((p) => p.created_by)
  );

  const data: PollWithMeta[] = (polls ?? []).map((p) => ({
    ...p,
    creator: creatorMap.get(p.created_by) ?? null,
    voter_count: responderMap.get(p.id)?.size ?? 0,
    has_my_response: responderMap.get(p.id)?.has(user.id) ?? false,
    is_effectively_closed: isEffectivelyClosed(p),
  }));

  const hasMore = data.length === limit;
  const nextCursor = hasMore ? (data[data.length - 1].created_at ?? null) : null;

  return NextResponse.json({ data, nextCursor, hasMore });
}

/**
 * POST /api/community/polls
 * 설문 생성 (+ 선택지 일괄 생성)
 *
 * 권한 (RLS와 동일 조건, 앱 레벨은 명확한 에러 메시지용):
 * - 상위 운영진(ADMIN/CONDUCTOR/MANAGER/SECRETARY/TREASURER): 모든 대상
 * - PART_LEADER: 자기 파트 대상(PART)만
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
  }

  const body = await request.json();
  const parsed = createPollSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || '입력값이 올바르지 않습니다.' },
      { status: 400 }
    );
  }
  const input = parsed.data;

  const adminClient = await createAdminClient();
  const { data: profile } = await adminClient
    .from('user_profiles')
    .select('role, linked_member_id, linked_member:members(part)')
    .eq('id', user.id)
    .single();

  const role = profile?.role || '';
  if (!POLL_CREATOR_ROLES.includes(role)) {
    return NextResponse.json(
      { error: '설문 생성 권한이 없습니다.' },
      { status: 403 }
    );
  }
  if (!profile?.linked_member_id) {
    return NextResponse.json(
      { error: '대원 연결(linked member)이 필요합니다.' },
      { status: 403 }
    );
  }

  // 파트장은 자기 파트 대상 설문만 생성 가능
  if (!POLL_SENIOR_STAFF_ROLES.includes(role)) {
    const myPart = (
      profile.linked_member as unknown as { part: string } | null
    )?.part;
    const isOwnPartOnly =
      input.audience_type === 'PART' &&
      input.target_parts?.length === 1 &&
      input.target_parts[0] === myPart;
    if (!isOwnPartOnly) {
      return NextResponse.json(
        { error: '파트장은 자기 파트 대상 설문만 만들 수 있습니다.' },
        { status: 403 }
      );
    }
  }

  // RLS가 최종 강제하도록 일반 클라이언트로 INSERT
  const { data: poll, error: insertError } = await supabase
    .from('polls')
    .insert({
      title: input.title,
      description: input.description || null,
      poll_type: input.poll_type,
      audience_type: input.audience_type,
      target_parts:
        input.audience_type === 'PART' ? (input.target_parts ?? null) : null,
      is_anonymous: input.is_anonymous ?? false,
      allow_multiple:
        input.poll_type === 'choice' ? (input.allow_multiple ?? false) : false,
      deadline_at: input.deadline_at || null,
      // 참석 조사는 즉시 공개, 의견 수렴형(선택/주관식)은 마감 후 공개가 기본
      show_results_before_close:
        input.show_results_before_close ?? input.poll_type === 'attendance',
      created_by: user.id,
    })
    .select('*')
    .single();

  if (insertError || !poll) {
    return NextResponse.json(
      { error: '설문 생성에 실패했습니다.' },
      { status: 500 }
    );
  }

  if (input.poll_type === 'choice' && input.options) {
    const { error: optionsError } = await supabase.from('poll_options').insert(
      input.options.map((label, i) => ({
        poll_id: poll.id,
        label,
        sort_order: i,
      }))
    );
    if (optionsError) {
      // 선택지 생성 실패 시 설문도 롤백 (고아 설문 방지)
      await adminClient.from('polls').delete().eq('id', poll.id);
      return NextResponse.json(
        { error: '선택지 생성에 실패했습니다.' },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ data: poll }, { status: 201 });
}
