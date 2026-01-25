import { z } from 'zod';

import { NextRequest, NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';

const gridLayoutSchema = z
  .object({
    rows: z.number().int().min(4).max(8),
    rowCapacities: z.array(z.number().int().min(0).max(20)),
    zigzagPattern: z.enum(['even', 'odd', 'none']),
  })
  .passthrough(); // 추가 필드 허용

// 배치표 상태 타입
const arrangementStatusSchema = z.enum(['DRAFT', 'SHARED', 'CONFIRMED']);

const updateArrangementSchema = z.object({
  title: z.string().min(1).optional(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  conductor: z.string().nullable().optional(), // null 값 허용
  serviceInfo: z.string().nullable().optional(), // null 값 허용
  isPublished: z.boolean().optional(),
  is_published: z.boolean().optional(), // snake_case 직접 지원
  status: arrangementStatusSchema.optional(),
  grid_rows: z.number().int().min(4).max(8).optional(),
  grid_layout: gridLayoutSchema.nullable().optional(), // null 값 허용
});

// 상태 전환 유효성 검사
const isValidStatusTransition = (currentStatus: string | null, newStatus: string): boolean => {
  const current = currentStatus || 'DRAFT';

  // CONFIRMED에서는 어떤 변경도 불가
  if (current === 'CONFIRMED') return false;

  // DRAFT → SHARED 또는 DRAFT → CONFIRMED 가능
  if (current === 'DRAFT') {
    return newStatus === 'SHARED' || newStatus === 'CONFIRMED';
  }

  // SHARED → CONFIRMED 가능, SHARED → DRAFT는 롤백이므로 허용
  if (current === 'SHARED') {
    return newStatus === 'CONFIRMED' || newStatus === 'DRAFT';
  }

  return false;
};

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { id } = await params;

  const { data, error } = await supabase
    .from('arrangements')
    .select(
      `
      *,
      seats (
        *,
        member:members (
          name,
          part
        )
      )
    `
    )
    .eq('id', id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  return NextResponse.json(data);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { id } = await params;

  try {
    const json = await request.json();
    const body = updateArrangementSchema.parse(json);

    // 현재 배치표 상태 조회
    const { data: currentArrangement, error: fetchError } = await supabase
      .from('arrangements')
      .select('status')
      .eq('id', id)
      .single();

    if (fetchError) {
      return NextResponse.json({ error: '배치표를 찾을 수 없습니다' }, { status: 404 });
    }

    const currentStatus = currentArrangement?.status || 'DRAFT';

    // CONFIRMED 상태에서는 수정 불가
    if (currentStatus === 'CONFIRMED') {
      return NextResponse.json({ error: '확정된 배치표는 수정할 수 없습니다' }, { status: 403 });
    }

    // 상태 변경 요청 시 유효성 검사
    if (body.status && !isValidStatusTransition(currentStatus, body.status)) {
      return NextResponse.json(
        { error: `잘못된 상태 전환입니다: ${currentStatus} → ${body.status}` },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = { ...body };
    if (body.serviceInfo !== undefined) updateData.service_info = body.serviceInfo;
    if (body.isPublished !== undefined) updateData.is_published = body.isPublished;

    // Remove camelCase keys that were mapped to snake_case
    delete updateData.serviceInfo;
    delete updateData.isPublished;

    const { data, error } = await supabase
      .from('arrangements')
      .update(updateData)
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // RLS로 인해 업데이트가 차단된 경우 (0개 행 반환)
    if (!data) {
      return NextResponse.json(
        { error: '배치표를 수정할 권한이 없습니다. ADMIN 또는 CONDUCTOR 역할이 필요합니다.' },
        { status: 403 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation Error', details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id } = await params;

  const { error } = await supabase.from('arrangements').delete().eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
