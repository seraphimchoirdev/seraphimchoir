/**
 * Attendance 쿼리 테스트 스크립트
 * Supabase 조인이 제대로 동작하는지 확인
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// .env.local 파일 로드
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function testAttendanceQuery() {
  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('🔍 Attendance 쿼리 테스트 시작\n');

  // 1. 최근 날짜 조회
  const { data: recentArrangements } = await supabase
    .from('arrangements')
    .select('date, title')
    .order('date', { ascending: false })
    .limit(5);

  console.log('📅 최근 배치표 날짜:');
  recentArrangements?.forEach((arr, idx) => {
    console.log(`  ${idx + 1}. ${arr.date} - ${arr.title}`);
  });

  if (!recentArrangements || recentArrangements.length === 0) {
    console.log('⚠️  배치표가 없습니다.');
    return;
  }

  const testDate = recentArrangements[0].date;
  console.log(`\n🎯 테스트 날짜: ${testDate}\n`);

  // 2. 해당 날짜의 모든 attendance 조회 (조인 없이)
  const { data: attendancesOnly, error: err1 } = await supabase
    .from('attendances')
    .select('*')
    .eq('date', testDate);

  console.log('📊 Attendance 레코드 (조인 없음):');
  console.log(`  총 ${attendancesOnly?.length || 0}개`);
  if (err1) {
    console.error('  에러:', err1.message);
  }

  // 3. 조인 포함 (잘못된 구문)
  const { data: wrongJoin, error: err2 } = await supabase
    .from('attendances')
    .select('*, members:member_id(id, name, part)')
    .eq('date', testDate)
    .eq('is_service_available', true);

  console.log('\n❌ 조인 (잘못된 구문: members:member_id):');
  console.log(`  총 ${wrongJoin?.length || 0}개`);
  if (err2) {
    console.error('  에러:', err2.message);
  } else if (wrongJoin && wrongJoin.length > 0) {
    console.log('  샘플 데이터:', JSON.stringify(wrongJoin[0], null, 2));
  }

  // 4. 조인 포함 (올바른 구문 1)
  const { data: correctJoin1, error: err3 } = await supabase
    .from('attendances')
    .select(`
      *,
      members!member_id(
        id,
        name,
        part
      )
    `)
    .eq('date', testDate)
    .eq('is_service_available', true);

  console.log('\n✅ 조인 (올바른 구문 1: members!member_id):');
  console.log(`  총 ${correctJoin1?.length || 0}개`);
  if (err3) {
    console.error('  에러:', err3.message);
  } else if (correctJoin1 && correctJoin1.length > 0) {
    console.log('  샘플 데이터:', JSON.stringify(correctJoin1[0], null, 2));

    // null members 체크
    const nullMembers = correctJoin1.filter((a: any) => !a.members);
    if (nullMembers.length > 0) {
      console.log(`  ⚠️  members가 null인 레코드: ${nullMembers.length}개`);
      console.log('  첫 번째 null 레코드:', JSON.stringify(nullMembers[0], null, 2));
    }
  }

  // 5. 조인 포함 (올바른 구문 2 - 명시적 외래 키)
  const { data: correctJoin2, error: err4 } = await supabase
    .from('attendances')
    .select(`
      *,
      members(
        id,
        name,
        part
      )
    `)
    .eq('date', testDate)
    .eq('is_service_available', true);

  console.log('\n✅ 조인 (올바른 구문 2: members):');
  console.log(`  총 ${correctJoin2?.length || 0}개`);
  if (err4) {
    console.error('  에러:', err4.message);
  } else if (correctJoin2 && correctJoin2.length > 0) {
    console.log('  샘플 데이터:', JSON.stringify(correctJoin2[0], null, 2));
  }

  // 6. 실제 member가 있는지 확인
  console.log('\n🔍 Member 존재 여부 확인:');
  if (attendancesOnly && attendancesOnly.length > 0) {
    const sampleMemberId = attendancesOnly[0].member_id;
    const { data: member } = await supabase
      .from('members')
      .select('*')
      .eq('id', sampleMemberId)
      .single();

    console.log(`  샘플 member_id: ${sampleMemberId}`);
    console.log(`  Member 존재: ${member ? '✅' : '❌'}`);
    if (member) {
      console.log(`  이름: ${member.name}, 파트: ${member.part}`);
    }
  }

  // 7. 등단 가능 필터 테스트
  console.log('\n🎵 등단 가능 멤버 (is_service_available = true):');
  const { data: serviceAvailable } = await supabase
    .from('attendances')
    .select(`
      *,
      members!member_id(
        id,
        name,
        part
      )
    `)
    .eq('date', testDate)
    .eq('is_service_available', true);

  console.log(`  총 ${serviceAvailable?.length || 0}명`);

  // 파트별 분포
  if (serviceAvailable && serviceAvailable.length > 0) {
    const partCounts: Record<string, number> = {};
    serviceAvailable.forEach((att: any) => {
      if (att.members) {
        const part = att.members.part;
        partCounts[part] = (partCounts[part] || 0) + 1;
      }
    });

    console.log('  파트별 분포:');
    Object.entries(partCounts).forEach(([part, count]) => {
      console.log(`    ${part}: ${count}명`);
    });
  }

  console.log('\n✅ 테스트 완료');
}

testAttendanceQuery().catch(console.error);
