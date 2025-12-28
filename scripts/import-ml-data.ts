/**
 * ML 학습 데이터를 DB에 삽입하는 스크립트
 *
 * training_data/ml_output/*.json 파일들을 읽어서
 * arrangements 및 seats 테이블에 삽입합니다.
 *
 * 실행: npx tsx scripts/import-ml-data.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';

// .env 파일 로드
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ SUPABASE 환경 변수가 설정되지 않았습니다.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface MLSeat {
    member_id: string;
    member_name: string;
    part: string;
    height: number | null;
    experience_years: number;
    is_part_leader: boolean;
    row: number;
    col: number;
}

interface MLData {
    arrangement_id: string;
    date: string;
    metadata: {
        service: string;
        anthem?: string;
        offering_hymn_leader?: string;
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

async function getExistingMembers(): Promise<Set<string>> {
    const { data, error } = await supabase
        .from('members')
        .select('id');

    if (error) {
        console.error('❌ members 조회 실패:', error.message);
        return new Set();
    }

    return new Set(data?.map(m => m.id) || []);
}

async function checkExistingArrangement(date: string, title: string): Promise<boolean> {
    const { data, error } = await supabase
        .from('arrangements')
        .select('id')
        .eq('date', date)
        .eq('title', title)
        .limit(1);

    if (error) {
        console.error('❌ 기존 arrangement 확인 실패:', error.message);
        return false;
    }

    return (data?.length || 0) > 0;
}

async function importFile(filePath: string, existingMembers: Set<string>): Promise<{
    success: boolean;
    arrangementId?: string;
    seatsInserted: number;
    seatsSkipped: number;
}> {
    const content = fs.readFileSync(filePath, 'utf-8');
    const data: MLData = JSON.parse(content);

    // 타이틀 생성: "2025-01-05 2부예배" 형식
    const title = `${data.date} ${data.metadata.service}`;

    // 중복 확인
    const exists = await checkExistingArrangement(data.date, title);
    if (exists) {
        console.log(`⏭️  스킵 (이미 존재): ${title}`);
        return { success: true, seatsInserted: 0, seatsSkipped: 0 };
    }

    // grid_layout 변환 (snake_case → camelCase)
    const gridLayout = {
        rows: data.grid_layout.rows,
        rowCapacities: data.grid_layout.row_capacities,
        zigzagPattern: data.grid_layout.zigzag_pattern as 'even' | 'odd' | 'none'
    };

    // arrangement 삽입
    const { data: arrangement, error: arrError } = await supabase
        .from('arrangements')
        .insert({
            title,
            date: data.date,
            service_info: data.metadata.service,
            grid_rows: data.grid_layout.rows,
            grid_layout: gridLayout,
            is_published: true, // 과거 데이터이므로 발행 상태
            conductor: data.metadata.offering_hymn_leader || null
        })
        .select('id')
        .single();

    if (arrError) {
        console.error(`❌ arrangement 삽입 실패 (${title}):`, arrError.message);
        return { success: false, seatsInserted: 0, seatsSkipped: 0 };
    }

    const arrangementId = arrangement.id;
    let seatsInserted = 0;
    let seatsSkipped = 0;

    // seats 데이터 준비
    const seatsToInsert: {
        arrangement_id: string;
        member_id: string;
        part: string;
        seat_row: number;
        seat_column: number;
    }[] = [];

    for (const seat of data.seats) {
        // member_id 유효성 검증
        if (!existingMembers.has(seat.member_id)) {
            console.log(`  ⚠️  member_id 없음: ${seat.member_name} (${seat.member_id})`);
            seatsSkipped++;
            continue;
        }

        // row/col: JSON은 1-based, DB는 0-based
        seatsToInsert.push({
            arrangement_id: arrangementId,
            member_id: seat.member_id,
            part: seat.part,
            seat_row: seat.row - 1,
            seat_column: seat.col - 1
        });
    }

    // seats 일괄 삽입
    if (seatsToInsert.length > 0) {
        const { error: seatsError } = await supabase
            .from('seats')
            .insert(seatsToInsert);

        if (seatsError) {
            console.error(`❌ seats 삽입 실패 (${title}):`, seatsError.message);
            // 실패 시 arrangement도 삭제 (롤백)
            await supabase.from('arrangements').delete().eq('id', arrangementId);
            return { success: false, seatsInserted: 0, seatsSkipped };
        }

        seatsInserted = seatsToInsert.length;
    }

    console.log(`✅ ${title}: ${seatsInserted}명 배치 (${seatsSkipped}명 스킵)`);
    return { success: true, arrangementId, seatsInserted, seatsSkipped };
}

async function main() {
    console.log('🚀 ML 학습 데이터 DB 삽입 시작...\n');

    // 기존 members 조회
    const existingMembers = await getExistingMembers();
    console.log(`📋 DB에 등록된 member 수: ${existingMembers.size}명\n`);

    // ml_output 디렉토리의 JSON 파일 목록
    const mlOutputDir = path.join(__dirname, '..', 'training_data', 'ml_output');
    const files = fs.readdirSync(mlOutputDir)
        .filter(f => f.endsWith('.json'))
        .sort();

    console.log(`📁 처리할 파일 수: ${files.length}개\n`);

    let totalSuccess = 0;
    let totalFailed = 0;
    let totalSeatsInserted = 0;
    let totalSeatsSkipped = 0;

    for (const file of files) {
        const filePath = path.join(mlOutputDir, file);
        const result = await importFile(filePath, existingMembers);

        if (result.success) {
            totalSuccess++;
        } else {
            totalFailed++;
        }
        totalSeatsInserted += result.seatsInserted;
        totalSeatsSkipped += result.seatsSkipped;
    }

    console.log('\n' + '='.repeat(50));
    console.log('📊 최종 결과');
    console.log('='.repeat(50));
    console.log(`✅ 성공: ${totalSuccess}개`);
    console.log(`❌ 실패: ${totalFailed}개`);
    console.log(`👥 총 배치된 좌석: ${totalSeatsInserted}개`);
    console.log(`⚠️  스킵된 좌석: ${totalSeatsSkipped}개`);
}

main().catch(console.error);
