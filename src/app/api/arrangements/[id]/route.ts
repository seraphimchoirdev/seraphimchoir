import { z } from 'zod';

import { NextRequest, NextResponse } from 'next/server';

import { createLogger } from '@/lib/logger';
import { notifyArrangementStatusChange } from '@/lib/notifications/arrangement-notify';
import { createClient } from '@/lib/supabase/server';

const logger = createLogger({ prefix: 'ArrangementsAPI' });

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
  notes: z.string().nullable().optional(), // 지시사항/메모
  isPublished: z.boolean().optional(),
  is_published: z.boolean().optional(), // snake_case 직접 지원
  status: arrangementStatusSchema.optional(),
  grid_rows: z.number().int().min(4).max(8).optional(),
  grid_layout: gridLayoutSchema.nullable().optional(), // null 값 허용
});

// 상태 전환 유효성 검사
const isValidStatusTransition = (currentStatus: string | null, newStatus: string): boolean => {
  const current = currentStatus || 'DRAFT';

  // CONFIRMED에서는 SHARED로만 전환 가능 (긴급 수정)
  if (current === 'CONFIRMED') {
    return newStatus === 'SHARED';
  }

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

  // 인증 검사
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
  }

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

  // 인증 검사
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
  }

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

    // CONFIRMED 상태에서는 상태 전환(→SHARED)만 허용, 나머지 수정은 차단
    if (currentStatus === 'CONFIRMED') {
      if (body.status !== 'SHARED') {
        return NextResponse.json(
          { error: '확정된 배치표는 수정할 수 없습니다. 먼저 긴급 수정 모드로 전환해주세요.' },
          { status: 403 }
        );
      }
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

    // 상태가 SHARED 또는 CONFIRMED로 변경 시 ML 이력 자동 기록
    // (행 분배 패턴 학습 + 배치 이력 저장)
    if (body.status === 'SHARED' || body.status === 'CONFIRMED') {
      try {
        const { error: rpcError } = await supabase.rpc('record_arrangement_to_ml_history', {
          p_arrangement_id: id,
        });
        if (rpcError) {
          logger.warn('ML 이력 기록 실패 (배치표 저장은 정상):', rpcError.message);
        } else {
          logger.debug('ML 이력 기록 완료:', id);
        }
      } catch (rpcErr) {
        logger.warn('ML 이력 기록 중 예외 (배치표 저장은 정상):', rpcErr);
      }

      // 대원 알림 발송 — 긴급수정 진입(CONFIRMED→SHARED)은 재공유가 아니므로 제외
      const isEmergencyEdit = body.status === 'SHARED' && currentStatus === 'CONFIRMED';
      if (!isEmergencyEdit && currentStatus !== body.status) {
        try {
          await notifyArrangementStatusChange(id, body.status, data.date);
        } catch (notifyErr) {
          logger.warn('배치표 알림 발송 실패 (배치표 저장은 정상):', notifyErr);
        }
      }
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

  // 인증 검사
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
  }

  const { id } = await params;

  const { error } = await supabase.from('arrangements').delete().eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
