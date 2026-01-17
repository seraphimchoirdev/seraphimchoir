import { createAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { createLogger } from '@/lib/logger';

const logger = createLogger({ prefix: 'ImportMLDataAPI' });

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

        // 1. 예배 일정 upsert (date 기준)
        const { error: scheduleError } = await supabase
            .from('service_schedules')
            .upsert({
                date: mlData.date,
                service_type: mlData.metadata.service,
                hymn_name: mlData.metadata.anthem,
                offertory_performer: mlData.metadata.offering_hymn_leader || null,
            }, { onConflict: 'date' });

        if (scheduleError) {
            logger.error('Schedule upsert error:', scheduleError);
        }

        // 2. 출석 데이터 처리 - 배치된 대원은 등단 가능, 나머지는 등단 불가
        // 2-1. 모든 정대원 조회 (REGULAR 상태 등단자만 - 지휘자/반주자 제외)
        const { data: allMembers, error: membersError } = await supabase
            .from('members')
            .select('id')
            .eq('member_status', 'REGULAR')
            .eq('is_singer', true);

        if (membersError) {
            logger.error('Members fetch error:', membersError);
        }

        // 2-2. seats에 있는 member_id 추출 (배치된 대원 = 등단 가능)
        const presentMemberIds = new Set(
            mlData.seats
                .filter(s => !s.member_id.startsWith('unknown_'))
                .map(s => s.member_id)
        );

        // 2-3. 전체 대원에 대해 출석 레코드 생성
        let attendanceCount = 0;
        if (allMembers && allMembers.length > 0) {
            const attendancesToInsert = allMembers.map(member => ({
                member_id: member.id,
                date: mlData.date,
                is_service_available: presentMemberIds.has(member.id),
                is_practice_attended: presentMemberIds.has(member.id),
            }));

            // 2-4. upsert (member_id + date 기준)
            const { error: attendanceError } = await supabase
                .from('attendances')
                .upsert(attendancesToInsert, {
                    onConflict: 'member_id,date',
                    ignoreDuplicates: false
                });

            if (attendanceError) {
                logger.error('Attendance upsert error:', attendanceError);
            } else {
                attendanceCount = attendancesToInsert.length;
            }
        }

        // 3. 자리배치(arrangement) 처리 - 기존 arrangement가 있는지 확인
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

        // 4. seats 데이터 입력 (ML 데이터와 UI 모두 1-based 인덱스 사용)
        const seatsToInsert = mlData.seats
            .filter(seat => !seat.member_id.startsWith('unknown_'))
            .map(seat => ({
                arrangement_id: arrangementId,
                member_id: seat.member_id,
                part: seat.part,
                seat_row: seat.row,          // 1-based index
                seat_column: seat.col,       // 1-based index
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
            service: mlData.metadata.service,
            attendanceCount,
            seatsCount: seatsToInsert.length,
        });
    } catch (error) {
        logger.error('Import error:', error);
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
