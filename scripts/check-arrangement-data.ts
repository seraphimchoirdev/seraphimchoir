#!/usr/bin/env node

/**
 * 자리배치 데이터 연도별 확인 스크립트
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

// 환경변수 로드
dotenv.config({ path: resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkData() {
  console.log('🔍 데이터 확인 중...\n');
  console.log('📌 Supabase URL:', supabaseUrl);
  console.log();

  // 0. members 테이블 확인
  console.log('0️⃣ members 테이블 확인:');
  const { count: memberCount } = await supabase
    .from('members')
    .select('*', { count: 'exact', head: true });
  console.log(`  - 총 ${memberCount || 0}명의 대원 데이터`);

  // 1. service_schedules 데이터 확인
  console.log('1️⃣ service_schedules 테이블 확인:');
  const { data: schedules, error: scheduleError } = await supabase
    .from('service_schedules')
    .select('date, service_type, hymn_name')
    .order('date', { ascending: false })
    .limit(10);

  if (scheduleError) {
    console.error('service_schedules 조회 오류:', scheduleError);
  } else if (!schedules || schedules.length === 0) {
    console.log('  - service_schedules 데이터 없음');
  } else {
    console.log(`  - ${schedules.length}개 데이터 발견`);
    schedules.forEach(s => {
      console.log(`    • ${s.date}: ${s.service_type || '타입 없음'} - ${s.hymn_name || '찬양곡 없음'}`);
    });
  }

  console.log('\n2️⃣ arrangements 테이블 확인:');
  // 모든 자리배치 데이터의 날짜 범위 확인
  const { data: arrangements, error } = await supabase
    .from('arrangements')
    .select('date, title, service_info')
    .order('date', { ascending: false });

  if (error) {
    console.error('조회 오류:', error);
    return;
  }

  if (!arrangements || arrangements.length === 0) {
    console.log('❌ 자리배치 데이터가 없습니다.');
    return;
  }

  // 연도별 집계
  const yearStats = new Map<string, number>();
  const yearDetails = new Map<string, any[]>();

  arrangements.forEach(arr => {
    const year = arr.date.substring(0, 4);
    yearStats.set(year, (yearStats.get(year) || 0) + 1);

    if (!yearDetails.has(year)) {
      yearDetails.set(year, []);
    }
    yearDetails.get(year)!.push(arr);
  });

  console.log('📊 연도별 자리배치 데이터 현황');
  console.log('=' .repeat(50));

  // 연도별 출력
  Array.from(yearStats.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .forEach(([year, count]) => {
      console.log(`\n📅 ${year}년: ${count}개`);
      console.log('-'.repeat(50));

      // 해당 년도의 첫 5개 데이터 표시
      const details = yearDetails.get(year)!.slice(0, 5);
      details.forEach(arr => {
        const date = format(new Date(arr.date), 'M월 d일 (EEE)', { locale: ko });
        const title = arr.title || arr.service_info || '제목 없음';
        console.log(`  • ${date}: ${title}`);
      });

      if (yearDetails.get(year)!.length > 5) {
        console.log(`  ... 외 ${yearDetails.get(year)!.length - 5}개`);
      }
    });

  console.log('\n' + '=' .repeat(50));
  console.log(`총 ${arrangements.length}개의 자리배치 데이터`);

  // 날짜 범위
  const firstDate = arrangements[arrangements.length - 1].date;
  const lastDate = arrangements[0].date;
  console.log(`날짜 범위: ${firstDate} ~ ${lastDate}`);
}

// 실행
checkData()
  .then(() => {
    console.log('\n✅ 확인 완료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 오류 발생:', error);
    process.exit(1);
  });