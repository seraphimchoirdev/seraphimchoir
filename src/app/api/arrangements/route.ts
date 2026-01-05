
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
    conductor: z.string().nullable().optional(),
    service_info: z.string().nullable().optional(),
    grid_rows: z.number().int().min(4).max(8).default(6),
    grid_layout: gridLayoutSchema.optional(),
});

// 파트별 좌석 수 타입
interface PartComposition {
    SOPRANO: number;
    ALTO: number;
    TENOR: number;
    BASS: number;
    SPECIAL: number;
    total: number;
}

export async function GET(request: NextRequest) {
    const supabase = await createClient();
    const searchParams = request.nextUrl.searchParams;

    // 기본 파라미터
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    // 필터 파라미터
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const serviceType = searchParams.get('serviceType');
    const search = searchParams.get('search')?.toLowerCase();

    // 1. service_schedules 먼저 조회 (필터링에 사용)
    let schedulesQuery = supabase
        .from('service_schedules')
        .select('date, service_type, hymn_name, offertory_performer');

    if (serviceType) {
        schedulesQuery = schedulesQuery.eq('service_type', serviceType);
    }

    const { data: schedules } = await schedulesQuery;

    const scheduleMap = new Map(
        (schedules || []).map(s => [s.date, s])
    );

    // 2. arrangements 조회 (날짜 필터 적용, 페이지네이션 없이 전체 조회)
    let arrangementsQuery = supabase
        .from('arrangements')
        .select('*', { count: 'exact' })
        .order('date', { ascending: false });

    // 날짜 범위 필터
    if (startDate) {
        arrangementsQuery = arrangementsQuery.gte('date', startDate);
    }
    if (endDate) {
        arrangementsQuery = arrangementsQuery.lte('date', endDate);
    }

    // serviceType 필터가 있으면 해당 날짜들만 조회
    if (serviceType && schedules && schedules.length > 0) {
        const validDates = schedules.map(s => s.date);
        arrangementsQuery = arrangementsQuery.in('date', validDates);
    }

    const { data: arrangements, error } = await arrangementsQuery;

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 3. 모든 관련 seats 조회 (파트별 인원 계산용)
    const arrangementIds = (arrangements || []).map(a => a.id);
    const { data: allSeats } = arrangementIds.length > 0
        ? await supabase
            .from('seats')
            .select('arrangement_id, part')
            .in('arrangement_id', arrangementIds)
        : { data: [] };

    // 4. arrangement별 파트 구성 계산
    const seatCompositionMap = new Map<string, PartComposition>();
    (allSeats || []).forEach(seat => {
        if (!seatCompositionMap.has(seat.arrangement_id)) {
            seatCompositionMap.set(seat.arrangement_id, {
                SOPRANO: 0,
                ALTO: 0,
                TENOR: 0,
                BASS: 0,
                SPECIAL: 0,
                total: 0,
            });
        }
        const comp = seatCompositionMap.get(seat.arrangement_id)!;
        comp[seat.part as keyof Omit<PartComposition, 'total'>]++;
        comp.total++;
    });

    // 5. 데이터 병합
    let enrichedArrangements = (arrangements || []).map(a => {
        const schedule = scheduleMap.get(a.date);
        const composition = seatCompositionMap.get(a.id) || {
            SOPRANO: 0,
            ALTO: 0,
            TENOR: 0,
            BASS: 0,
            SPECIAL: 0,
            total: 0,
        };

        return {
            ...a,
            service_type: schedule?.service_type || null,
            hymn_name: schedule?.hymn_name || null,
            offertory_performer: schedule?.offertory_performer || null,
            seat_count: composition.total,
            part_composition: {
                SOPRANO: composition.SOPRANO,
                ALTO: composition.ALTO,
                TENOR: composition.TENOR,
                BASS: composition.BASS,
                SPECIAL: composition.SPECIAL,
            },
        };
    });

    // 6. 검색어 필터 (메모리에서 적용)
    if (search) {
        enrichedArrangements = enrichedArrangements.filter(a =>
            a.title?.toLowerCase().includes(search) ||
            a.hymn_name?.toLowerCase().includes(search) ||
            a.offertory_performer?.toLowerCase().includes(search)
        );
    }

    // 7. 페이지네이션 적용 (메모리에서)
    const total = enrichedArrangements.length;
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;
    const paginatedData = enrichedArrangements.slice(offset, offset + limit);

    return NextResponse.json({
        data: paginatedData,
        meta: {
            total,
            page,
            limit,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1,
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
                service_info: body.service_info,
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
