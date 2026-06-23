import { z } from 'zod';

import { NextRequest, NextResponse } from 'next/server';

import { isValidReactionEmoji } from '@/lib/community/album-constants';
import { createAdminClient, createClient } from '@/lib/supabase/server';

import type { PhotoReactionCounts } from '@/types/community';

const toggleReactionSchema = z.object({
  emoji: z.string().min(1).max(10),
});

/**
 * 사진의 이모지별 반응 집계를 조회한다.
 */
async function getReactionCounts(
  adminClient: Awaited<ReturnType<typeof createAdminClient>>,
  photoId: string
): Promise<PhotoReactionCounts> {
  const { data } = await adminClient
    .from('album_photo_reactions')
    .select('emoji')
    .eq('photo_id', photoId);

  const counts: PhotoReactionCounts = {};
  for (const r of data || []) {
    counts[r.emoji] = (counts[r.emoji] ?? 0) + 1;
  }
  return counts;
}

/**
 * POST /api/community/albums/[id]/photos/[photoId]/reactions
 * 이모지 반응 토글 (3-way)
 * - 기존 반응 없음 → INSERT
 * - 같은 이모지 재선택 → DELETE (취소)
 * - 다른 이모지 선택 → UPDATE (교체)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ photoId: string }> }
) {
  const { photoId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
  }

  const body = await request.json();
  const parsed = toggleReactionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 });
  }

  const { emoji } = parsed.data;
  if (!isValidReactionEmoji(emoji)) {
    return NextResponse.json(
      { error: '허용되지 않는 이모지입니다.' },
      { status: 400 }
    );
  }

  // 기존 반응 조회
  const { data: existing } = await supabase
    .from('album_photo_reactions')
    .select('id, emoji')
    .eq('photo_id', photoId)
    .eq('user_id', user.id)
    .maybeSingle();

  let myReaction: string | null;

  if (!existing) {
    // 신규 반응
    const { error } = await supabase
      .from('album_photo_reactions')
      .insert({ photo_id: photoId, user_id: user.id, emoji });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    myReaction = emoji;
  } else if (existing.emoji === emoji) {
    // 같은 이모지 → 취소
    const { error } = await supabase
      .from('album_photo_reactions')
      .delete()
      .eq('id', existing.id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    myReaction = null;
  } else {
    // 다른 이모지 → 교체
    const { error } = await supabase
      .from('album_photo_reactions')
      .update({ emoji })
      .eq('id', existing.id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    myReaction = emoji;
  }

  const adminClient = await createAdminClient();
  const reactionCounts = await getReactionCounts(adminClient, photoId);

  return NextResponse.json({
    my_reaction: myReaction,
    reaction_counts: reactionCounts,
  });
}
