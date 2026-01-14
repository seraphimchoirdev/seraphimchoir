#!/usr/bin/env node

/**
 * 2025년 예배당 평균 등단 인원 통계 스크립트
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { format, startOfYear, endOfYear } from 'date-fns';
import { ko } from 'date-fns/locale';

// 환경변수 로드
dotenv.config({ path: resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface ArrangementStats {
  date: string;
  service_type: string | null;
  title: string | null;
  total_seats: number;
  part_distribution: {
    SOPRANO: number;
    ALTO: number;
    TENOR: number;
    BASS: number;
    SPECIAL: number;
  };
}

async function fetchStatistics() {
  console.log('🔍 2025년 예배 등단 인원 통계 조회 중...\n');

  // 2025년 데이터 조회
  const startDate = '2025-01-01';
  const endDate = '2025-12-31';

  // 1. 자리배치 데이터 조회 (주일 2부 예배만)
  const { data: arrangements, error: arrangementError } = await supabase
    .from('arrangements')
    .select(`
      id,
      date,
      status,
      service_info,
      title,
      created_at
    `)
    .gte('date', startDate)
    .lte('date', endDate)
    .or('service_info.like.%2부%,service_info.like.%주일%,service_info.is.null')
    .order('date', { ascending: true });

  if (arrangementError) {
    console.error('자리배치 조회 오류:', arrangementError);
    return;
  }

  if (!arrangements || arrangements.length === 0) {
    console.log('❌ 2025년 자리배치 데이터가 없습니다.');
    return;
  }

  // 2. 각 자리배치의 좌석 데이터 조회
  const stats: ArrangementStats[] = [];

  for (const arrangement of arrangements) {
    const { data: seats, error: seatsError } = await supabase
      .from('seats')
      .select(`
        id,
        member_id,
        members!inner (
          name,
          part
        )
      `)
      .eq('arrangement_id', arrangement.id);

    if (seatsError) {
      console.error(`좌석 조회 오류 (${arrangement.date}):`, seatsError);
      continue;
    }

    // 파트별 집계
    const partCount = {
      SOPRANO: 0,
      ALTO: 0,
      TENOR: 0,
      BASS: 0,
      SPECIAL: 0
    };

    if (seats) {
      seats.forEach(seat => {
        const part = seat.members?.part;
        if (part && part in partCount) {
          partCount[part as keyof typeof partCount]++;
        }
      });
    }

    stats.push({
      date: arrangement.date,
      service_type: arrangement.service_info,
      title: arrangement.title,
      total_seats: seats?.length || 0,
      part_distribution: partCount
    });
  }

  // 3. 통계 분석
  console.log('=' .repeat(80));
  console.log('📊 2025년 주일 2부 예배 찬양대 등단 인원 통계');
  console.log('=' .repeat(80));
  console.log();

  // 기본 통계
  const totalArrangements = stats.length;
  const totalSeats = stats.reduce((sum, s) => sum + s.total_seats, 0);
  const avgSeatsPerService = totalSeats / totalArrangements;

  console.log('📌 기본 통계');
  console.log('-'.repeat(40));
  console.log(`  • 총 예배 횟수: ${totalArrangements}회`);
  console.log(`  • 총 등단 인원 (연인원): ${totalSeats}명`);
  console.log(`  • 예배당 평균 등단 인원: ${avgSeatsPerService.toFixed(1)}명`);
  console.log();

  // 월별 통계
  console.log('📌 월별 평균 등단 인원');
  console.log('-'.repeat(40));
  const monthlyStats = new Map<string, { total: number, count: number }>();

  stats.forEach(stat => {
    const month = stat.date.substring(0, 7); // YYYY-MM
    if (!monthlyStats.has(month)) {
      monthlyStats.set(month, { total: 0, count: 0 });
    }
    const monthStat = monthlyStats.get(month)!;
    monthStat.total += stat.total_seats;
    monthStat.count++;
  });

  Array.from(monthlyStats.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .forEach(([month, stat]) => {
      const [year, monthNum] = month.split('-');
      const monthName = format(new Date(parseInt(year), parseInt(monthNum) - 1), 'M월', { locale: ko });
      const avg = stat.total / stat.count;
      const bar = '█'.repeat(Math.round(avg / 2));
      console.log(`  ${monthName.padEnd(4)}: ${avg.toFixed(1).padStart(5)}명 ${bar}`);
    });
  console.log();

  // 파트별 평균 인원
  console.log('📌 파트별 평균 등단 인원');
  console.log('-'.repeat(40));
  const partTotals = {
    SOPRANO: 0,
    ALTO: 0,
    TENOR: 0,
    BASS: 0,
    SPECIAL: 0
  };

  stats.forEach(stat => {
    Object.entries(stat.part_distribution).forEach(([part, count]) => {
      partTotals[part as keyof typeof partTotals] += count;
    });
  });

  Object.entries(partTotals).forEach(([part, total]) => {
    const avg = total / totalArrangements;
    const percentage = (avg / avgSeatsPerService * 100).toFixed(1);
    console.log(`  • ${part.padEnd(8)}: ${avg.toFixed(1).padStart(5)}명 (${percentage.padStart(5)}%)`);
  });
  console.log();

  // 최대/최소 등단 인원 예배
  const maxService = stats.reduce((max, s) => s.total_seats > max.total_seats ? s : max, stats[0]);
  const minService = stats.reduce((min, s) => s.total_seats < min.total_seats ? s : min, stats[0]);

  console.log('📌 특이사항');
  console.log('-'.repeat(40));
  console.log(`  • 최대 등단: ${format(new Date(maxService.date), 'M월 d일', { locale: ko })} - ${maxService.total_seats}명`);
  if (maxService.title) {
    console.log(`    예배명: ${maxService.title}`);
  }
  console.log(`  • 최소 등단: ${format(new Date(minService.date), 'M월 d일', { locale: ko })} - ${minService.total_seats}명`);
  if (minService.title) {
    console.log(`    예배명: ${minService.title}`);
  }
  console.log();

  // 상세 데이터 출력 (선택적)
  const showDetails = process.argv.includes('--details');
  if (showDetails) {
    console.log('📌 예배별 상세 데이터');
    console.log('-'.repeat(80));
    console.log('날짜        | 인원 | S  | A  | T  | B  | SP | 예배');
    console.log('-'.repeat(80));

    stats.forEach(stat => {
      const dateStr = format(new Date(stat.date), 'MM/dd (EEE)', { locale: ko });
      const p = stat.part_distribution;
      const titleStr = stat.title ? stat.title.substring(0, 30) : '-';

      console.log(
        `${dateStr.padEnd(12)}| ${stat.total_seats.toString().padStart(4)} | ` +
        `${p.SOPRANO.toString().padStart(2)} | ` +
        `${p.ALTO.toString().padStart(2)} | ` +
        `${p.TENOR.toString().padStart(2)} | ` +
        `${p.BASS.toString().padStart(2)} | ` +
        `${p.SPECIAL.toString().padStart(2)} | ${titleStr}`
      );
    });
  }

  console.log();
  console.log('=' .repeat(80));
  console.log('💡 팁: --details 옵션을 추가하면 예배별 상세 데이터를 볼 수 있습니다.');
}

// 실행
fetchStatistics()
  .then(() => {
    console.log('\n✅ 통계 조회 완료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 오류 발생:', error);
    process.exit(1);
  });