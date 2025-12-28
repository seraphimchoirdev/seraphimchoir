import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/arrangements/[id]/seats
 * 좌석 배치 저장 (일괄 업데이트)
 */
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const supabase = await createClient();
        const body = await request.json();
        const { seats } = body;

        if (!Array.isArray(seats)) {
            return NextResponse.json(
                { error: 'Invalid format: seats must be an array' },
                { status: 400 }
            );
        }

        // 1. 기존 좌석 삭제
        const { error: deleteError } = await supabase
            .from('seats')
            .delete()
            .eq('arrangement_id', id);

        if (deleteError) {
            return NextResponse.json({ error: deleteError.message }, { status: 500 });
        }

        // 2. 새 좌석 추가
        if (seats.length > 0) {
            const seatsToInsert = seats.map((seat: any) => ({
                arrangement_id: id,
                member_id: seat.member_id,
                seat_row: seat.seat_row,
                seat_column: seat.seat_column,
                part: seat.part,
            }));

            const { error: insertError } = await supabase
                .from('seats')
                .insert(seatsToInsert);

            if (insertError) {
                return NextResponse.json({ error: insertError.message }, { status: 500 });
            }
        }

        return NextResponse.json({ message: 'Seats updated successfully' });
    } catch (error) {
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
