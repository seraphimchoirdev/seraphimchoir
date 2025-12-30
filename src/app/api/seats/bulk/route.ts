
import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const seatSchema = z.object({
    memberId: z.string().uuid(),
    row: z.number().int().min(0),
    column: z.number().int().min(0),
    part: z.enum(['SOPRANO', 'ALTO', 'TENOR', 'BASS', 'SPECIAL']),
    isRowLeader: z.boolean().optional(),
});

const bulkSeatsSchema = z.object({
    arrangementId: z.string().uuid(),
    seats: z.array(seatSchema),
});

export async function POST(request: NextRequest) {
    const supabase = await createClient();

    try {
        const json = await request.json();
        const { arrangementId, seats } = bulkSeatsSchema.parse(json);

        // 1. Delete existing seats for this arrangement
        const { error: deleteError } = await supabase
            .from('seats')
            .delete()
            .eq('arrangement_id', arrangementId);

        if (deleteError) {
            return NextResponse.json({ error: deleteError.message }, { status: 500 });
        }

        // 2. Insert new seats
        if (seats.length > 0) {
            const seatsToInsert = seats.map((seat) => ({
                arrangement_id: arrangementId,
                member_id: seat.memberId,
                seat_row: seat.row,
                seat_column: seat.column,
                part: seat.part,
                is_row_leader: seat.isRowLeader || false,
            }));

            const { data, error: insertError } = await supabase
                .from('seats')
                .insert(seatsToInsert)
                .select();

            if (insertError) {
                return NextResponse.json({ error: insertError.message }, { status: 500 });
            }

            return NextResponse.json(data);
        }

        return NextResponse.json([]);
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
