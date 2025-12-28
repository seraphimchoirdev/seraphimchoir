/**
 * 과거 배치 데이터에서 출석 데이터 자동 생성
 *
 * seats 테이블의 데이터를 기반으로 attendances 레코드를 생성합니다.
 * 이를 통해 "과거 배치 불러오기" 기능의 매칭율을 100%로 높입니다.
 *
 * 실행: npx tsx scripts/generate-attendances-from-seats.ts
 */

import { createClient } from '@supabase/supabase-js';
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

interface ArrangementWithSeats {
    id: string;
    date: string;
    title: string;
    seats: {
        member_id: string;
    }[];
}

async function getExistingAttendances(): Promise<Set<string>> {
    // 기존 출석 데이터 조회 (date + member_id 조합)
    const { data, error } = await supabase
        .from('attendances')
        .select('date, member_id');

    if (error) {
        console.error('❌ 기존 출석 데이터 조회 실패:', error.message);
        return new Set();
    }

    // "date|member_id" 형태로 Set 생성
    return new Set(data?.map(a => `${a.date}|${a.member_id}`) || []);
}

async function getArrangementsWithSeats(): Promise<ArrangementWithSeats[]> {
    // ML 데이터로 생성된 배치표들 조회 (title에 날짜가 포함된 것들)
    const { data, error } = await supabase
        .from('arrangements')
        .select(`
            id,
            date,
            title,
            seats (
                member_id
            )
        `)
        .order('date', { ascending: true });

    if (error) {
        console.error('❌ 배치표 조회 실패:', error.message);
        return [];
    }

    return (data as ArrangementWithSeats[]) || [];
}

async function main() {
    console.log('🚀 과거 배치 데이터에서 출석 데이터 생성 시작...\n');

    // 1. 기존 출석 데이터 조회
    const existingAttendances = await getExistingAttendances();
    console.log(`📋 기존 출석 데이터 수: ${existingAttendances.size}개\n`);

    // 2. 배치표와 좌석 데이터 조회
    const arrangements = await getArrangementsWithSeats();
    console.log(`📁 처리할 배치표 수: ${arrangements.length}개\n`);

    let totalCreated = 0;
    let totalSkipped = 0;
    let totalFailed = 0;

    for (const arrangement of arrangements) {
        const { date, title, seats } = arrangement;

        if (!seats || seats.length === 0) {
            console.log(`⏭️  스킵 (좌석 없음): ${date} ${title}`);
            continue;
        }

        // 해당 날짜에 생성할 출석 데이터 준비
        const attendancesToInsert: {
            date: string;
            member_id: string;
            is_service_available: boolean;
            is_practice_attended: boolean;
            notes: string;
        }[] = [];

        let skippedCount = 0;

        for (const seat of seats) {
            if (!seat.member_id) {
                skippedCount++;
                continue;
            }

            const key = `${date}|${seat.member_id}`;

            // 이미 존재하는 출석 데이터는 스킵
            if (existingAttendances.has(key)) {
                skippedCount++;
                continue;
            }

            attendancesToInsert.push({
                date,
                member_id: seat.member_id,
                is_service_available: true,
                is_practice_attended: true,
                notes: '과거 배치 데이터에서 자동 생성'
            });

            // Set에 추가하여 중복 방지
            existingAttendances.add(key);
        }

        // 일괄 삽입
        if (attendancesToInsert.length > 0) {
            const { error } = await supabase
                .from('attendances')
                .insert(attendancesToInsert);

            if (error) {
                console.error(`❌ 삽입 실패 (${date} ${title}):`, error.message);
                totalFailed += attendancesToInsert.length;
            } else {
                console.log(`✅ ${date} ${title}: ${attendancesToInsert.length}명 생성 (${skippedCount}명 스킵)`);
                totalCreated += attendancesToInsert.length;
            }
        } else {
            console.log(`⏭️  ${date} ${title}: 모두 이미 존재 (${skippedCount}명 스킵)`);
        }

        totalSkipped += skippedCount;
    }

    console.log('\n' + '='.repeat(50));
    console.log('📊 최종 결과');
    console.log('='.repeat(50));
    console.log(`✅ 생성된 출석 데이터: ${totalCreated}개`);
    console.log(`⏭️  스킵 (이미 존재): ${totalSkipped}개`);
    console.log(`❌ 실패: ${totalFailed}개`);
}

main().catch(console.error);
