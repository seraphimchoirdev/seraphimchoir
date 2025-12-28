
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
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    // Basic query
    let query = supabase
        .from('arrangements')
        .select('*', { count: 'exact' })
        .order('date', { ascending: false })
        .range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
        data,
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
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: 'Validation Error', details: (error as any).errors },
                { status: 400 }
            );
        }
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
