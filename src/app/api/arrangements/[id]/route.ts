
import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const gridLayoutSchema = z.object({
    rows: z.number().int().min(4).max(8),
    rowCapacities: z.array(z.number().int().min(0).max(20)),
    zigzagPattern: z.enum(['even', 'odd', 'none']),
});

const updateArrangementSchema = z.object({
    title: z.string().min(1).optional(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    conductor: z.string().optional(),
    serviceInfo: z.string().optional(),
    isPublished: z.boolean().optional(),
    grid_rows: z.number().int().min(4).max(8).optional(),
    grid_layout: gridLayoutSchema.optional(),
});

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const supabase = await createClient();
    const { id } = await params;

    const { data, error } = await supabase
        .from('arrangements')
        .select(`
      *,
      seats (
        *,
        member:members (
          name,
          part
        )
      )
    `)
        .eq('id', id)
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 404 });
    }

    return NextResponse.json(data);
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const supabase = await createClient();
    const { id } = await params;

    try {
        const json = await request.json();
        const body = updateArrangementSchema.parse(json);

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

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const supabase = await createClient();
    const { id } = await params;

    const { error } = await supabase
        .from('arrangements')
        .delete()
        .eq('id', id);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}
