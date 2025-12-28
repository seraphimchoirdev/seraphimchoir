/**
 * 출석 데이터 생성 결과 검증 스크립트
 *
 * 실행: npx tsx scripts/verify-attendances.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ SUPABASE 환경 변수가 설정되지 않았습니다.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifyResults() {
    console.log('🔍 출석 데이터 생성 결과 검증\n');

    // 1. 전체 출석 데이터 수
    const { count: totalAttendances } = await supabase
        .from('attendances')
        .select('*', { count: 'exact', head: true });

    console.log('📊 전체 출석 데이터 수:', totalAttendances);

    // 2. 날짜별 출석 데이터 분포
    const { data: dateDistribution } = await supabase
        .from('attendances')
        .select('date')
        .order('date', { ascending: true });

    const dateCounts = new Map<string, number>();
    dateDistribution?.forEach(a => {
        dateCounts.set(a.date, (dateCounts.get(a.date) || 0) + 1);
    });

    console.log('\n📅 날짜별 출석 데이터 분포 (처음 10개):');
    let i = 0;
    for (const [date, count] of dateCounts) {
        if (i >= 10) break;
        console.log(`  ${date}: ${count}명`);
        i++;
    }
    console.log(`  ... 총 ${dateCounts.size}개 날짜\n`);

    // 3. 과거 배치표와 출석 데이터 매칭 검증
    const { data: arrangements } = await supabase
        .from('arrangements')
        .select('id, date, title')
        .order('date', { ascending: true })
        .limit(5);

    console.log('🔗 과거 배치표-출석 매칭 검증 (처음 5개):');
    for (const arr of arrangements || []) {
        // 해당 배치의 seats 수
        const { count: seatsCount } = await supabase
            .from('seats')
            .select('*', { count: 'exact', head: true })
            .eq('arrangement_id', arr.id);

        // 해당 날짜의 attendances 수
        const { count: attendancesCount } = await supabase
            .from('attendances')
            .select('*', { count: 'exact', head: true })
            .eq('date', arr.date);

        const serviceLabel = arr.title?.includes('2부') ? '2부' : arr.title?.includes('1부') ? '1부' : '';
        console.log(`  ${arr.date} ${serviceLabel}`);
        console.log(`    좌석: ${seatsCount}명 / 출석: ${attendancesCount}명`);
    }

    // 4. 매칭율 시뮬레이션 (첫 번째 배치표 기준)
    if (arrangements && arrangements.length > 0) {
        const testArr = arrangements[0];

        // 해당 배치의 좌석 정보
        const { data: seats } = await supabase
            .from('seats')
            .select('member_id')
            .eq('arrangement_id', testArr.id);

        // 해당 날짜의 출석 가능 인원
        const { data: attendances } = await supabase
            .from('attendances')
            .select('member_id')
            .eq('date', testArr.date)
            .eq('is_service_available', true);

        const availableIds = new Set(attendances?.map(a => a.member_id) || []);
        const matchedCount = seats?.filter(s => availableIds.has(s.member_id)).length || 0;
        const totalSeats = seats?.length || 0;
        const matchRate = totalSeats > 0 ? ((matchedCount / totalSeats) * 100).toFixed(1) : '0';

        console.log(`\n✨ 예상 매칭율 (${testArr.date} 기준):`);
        console.log(`  매칭된 인원: ${matchedCount}/${totalSeats}명`);
        console.log(`  매칭율: ${matchRate}%`);
    }

    console.log('\n' + '='.repeat(50));
    console.log('✅ 검증 완료');
}

verifyResults().catch(console.error);
