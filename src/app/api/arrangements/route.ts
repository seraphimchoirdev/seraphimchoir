
import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const gridLayoutSchema = z.object({
    rows: z.number().int().min(4).max(8),
    rowCapacities: z.array(z.number().int().min(0).max(20)),
    zigzagPattern: z.enum(['even', 'odd', 'none']),
});

const createArrangementSchema = z.object({
    title: z.string().min(1, '제목을 입력해주세요'),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '유효한 날짜 형식이 아닙니다'),
    conductor: z.string().optional(),
    serviceInfo: z.string().optional(),
    grid_rows: z.number().int().min(4).max(8).default(6),
    grid_layout: gridLayoutSchema.optional(),
});

export async function GET(request: NextRequest) {
    const supabase = await createClient();
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = (page - 1) * limit;

    // 1. arrangements 조회
    const { data: arrangements, error, count } = await supabase
        .from('arrangements')
        .select('*', { count: 'exact' })
        .order('date', { ascending: false })
        .range(offset, offset + limit - 1);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 2. service_schedules 조회 (hymn_name, offertory_performer, service_type)
    const { data: schedules } = await supabase
        .from('service_schedules')
        .select('date, service_type, hymn_name, offertory_performer');

    // 3. 날짜 기준으로 병합
    const scheduleMap = new Map(
        (schedules || []).map(s => [s.date, s])
    );

    const enrichedArrangements = (arrangements || []).map(a => {
        const schedule = scheduleMap.get(a.date);
        return {
            ...a,
            // 자리배치 자체의 service_info가 있으면 우선 사용, 없으면 service_schedules에서 가져옴
            service_type: a.service_info || schedule?.service_type || null,
            hymn_name: schedule?.hymn_name || null,
            offertory_performer: schedule?.offertory_performer || null,
        };
    });

    return NextResponse.json({
        data: enrichedArrangements,
        meta: {
            total: count,
            page,
            limit,
            totalPages: count ? Math.ceil(count / limit) : 0,
        },
    });
}

export async function POST(request: NextRequest) {
    const supabase = await createClient();

    try {
        const json = await request.json();
        const body = createArrangementSchema.parse(json);

        // 해당 날짜에 예배 일정이 있는지 확인
        const { data: schedule } = await supabase
            .from('service_schedules')
            .select('id')
            .eq('date', body.date)
            .single();

        if (!schedule) {
            return NextResponse.json(
                { error: '해당 날짜에 등록된 예배 일정이 없습니다. 먼저 예배 일정을 등록해주세요.' },
                { status: 400 }
            );
        }

        const { data, error } = await supabase
            .from('arrangements')
            .insert({
                title: body.title,
                date: body.date,
                conductor: body.conductor,
                service_info: body.serviceInfo,
            })
            .select()
            .single();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json(data);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: 'Validation Error', details: error.issues },
                { status: 400 }
            );
        }
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
