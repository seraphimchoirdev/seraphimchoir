import { createAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

interface MLSeat {
    member_id: string;
    member_name: string;
    part: string;
    row: number;
    col: number;
}

interface MLData {
    date: string;
    metadata: {
        service: string;
        anthem: string;
        offering_hymn_leader: string;
        total_members: number;
        breakdown: Record<string, number>;
    };
    grid_layout: {
        rows: number;
        row_capacities: number[];
        zigzag_pattern: string;
    };
    seats: MLSeat[];
}

export async function POST(request: NextRequest) {
    const supabase = createAdminClient();

    try {
        const { filename } = await request.json();

        if (!filename) {
            return NextResponse.json({ error: 'filename is required' }, { status: 400 });
        }

        // ML 데이터 파일 읽기
        const mlOutputDir = path.join(process.cwd(), 'training_data', 'ml_output');
        const filePath = path.join(mlOutputDir, filename);

        if (!fs.existsSync(filePath)) {
            return NextResponse.json({ error: `File not found: ${filename}` }, { status: 404 });
        }

        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const mlData: MLData = JSON.parse(fileContent);

        // 1. 예배 일정이 있는지 확인, 없으면 생성
        const { data: existingSchedule } = await supabase
            .from('service_schedules')
            .select('id')
            .eq('date', mlData.date)
            .single();

        if (!existingSchedule) {
            const { error: scheduleError } = await supabase
                .from('service_schedules')
                .insert({
                    date: mlData.date,
                    service_type: mlData.metadata.service,
                    title: mlData.metadata.anthem,
                    is_active: true,
                });

            if (scheduleError) {
                console.error('Schedule creation error:', scheduleError);
                // 이미 존재하면 무시
            }
        }

        // 2. 기존 arrangement가 있는지 확인
        const { data: existingArrangement } = await supabase
            .from('arrangements')
            .select('id')
            .eq('date', mlData.date)
            .eq('title', mlData.metadata.anthem)
            .single();

        let arrangementId: string;

        if (existingArrangement) {
            // 기존 arrangement의 seats 삭제 후 재생성
            arrangementId = existingArrangement.id;

            // conductor를 김보미로 업데이트
            await supabase
                .from('arrangements')
                .update({ conductor: '김보미' })
                .eq('id', arrangementId);

            await supabase
                .from('seats')
                .delete()
                .eq('arrangement_id', arrangementId);
        } else {
            // 새 arrangement 생성
            const { data: newArrangement, error: arrangementError } = await supabase
                .from('arrangements')
                .insert({
                    date: mlData.date,
                    title: mlData.metadata.anthem,
                    conductor: '김보미',  // 지휘자 통일
                    service_info: mlData.metadata.service,
                    grid_rows: mlData.grid_layout.rows,
                    grid_layout: {
                        rows: mlData.grid_layout.rows,
                        rowCapacities: mlData.grid_layout.row_capacities,
                        zigzagPattern: mlData.grid_layout.zigzag_pattern,
                    },
                    is_published: false,
                })
                .select()
                .single();

            if (arrangementError) {
                return NextResponse.json({ error: arrangementError.message }, { status: 500 });
            }

            arrangementId = newArrangement.id;
        }

        // 3. seats 데이터 입력
        // ML 데이터는 1-based 인덱스, UI는 0-based 인덱스를 사용하므로 변환 필요
        const seatsToInsert = mlData.seats
            .filter(seat => !seat.member_id.startsWith('unknown_'))
            .map(seat => ({
                arrangement_id: arrangementId,
                member_id: seat.member_id,
                part: seat.part,
                seat_row: seat.row - 1,      // Convert to 0-based index
                seat_column: seat.col - 1,   // Convert to 0-based index
                is_row_leader: false,
            }));

        const { error: seatsError } = await supabase
            .from('seats')
            .insert(seatsToInsert);

        if (seatsError) {
            return NextResponse.json({ error: seatsError.message }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            arrangementId,
            date: mlData.date,
            title: mlData.metadata.anthem,
            seatsCount: seatsToInsert.length,
        });
    } catch (error) {
        console.error('Import error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal Server Error' },
            { status: 500 }
        );
    }
}

// GET: ML 데이터 파일 목록 조회
export async function GET() {
    try {
        const mlOutputDir = path.join(process.cwd(), 'training_data', 'ml_output');

        if (!fs.existsSync(mlOutputDir)) {
            return NextResponse.json({ error: 'ML output directory not found' }, { status: 404 });
        }

        const files = fs.readdirSync(mlOutputDir)
            .filter(f => f.startsWith('ml_') && f.endsWith('.json'))
            .sort()
            .reverse();

        return NextResponse.json({ files });
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal Server Error' },
            { status: 500 }
        );
    }
}
