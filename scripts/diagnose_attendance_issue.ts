/**
 * Attendance 조회 문제 진단
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function diagnose() {
  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('🔍 Attendance 조회 문제 진단\n');

  // 최근 날짜
  const { data: recentArr } = await supabase
    .from('arrangements')
    .select('date')
    .order('date', { ascending: false })
    .limit(1)
    .single();

  const testDate = recentArr?.date;
  console.log(`📅 테스트 날짜: ${testDate}\n`);

  // 1. is_service_available 분포
  const { data: all } = await supabase
    .from('attendances')
    .select('is_service_available')
    .eq('date', testDate!);

  const trueCount = all?.filter((a) => a.is_service_available === true).length || 0;
  const falseCount = all?.filter((a) => a.is_service_available === false).length || 0;

  console.log('📊 is_service_available 분포:');
  console.log(`  총 Attendance: ${all?.length}`);
  console.log(`  true (등단 가능): ${trueCount}명`);
  console.log(`  false (등단 불가): ${falseCount}명\n`);

  // 2. 조인 없이 전체 조회
  const { data: allAtt } = await supabase
    .from('attendances')
    .select('member_id')
    .eq('date', testDate!)
    .eq('is_service_available', true);

  // 3. 조인 포함 조회 (수정된 구문)
  const { data: withJoin } = await supabase
    .from('attendances')
    .select(
      `
      member_id,
      members (id, name, part)
    `
    )
    .eq('date', testDate!)
    .eq('is_service_available', true);

  console.log('🔗 조인 결과 비교:');
  console.log(`  조인 없이: ${allAtt?.length}개`);
  console.log(`  조인 포함: ${withJoin?.length}개\n`);

  // 4. null members 체크
  const nullMembers = withJoin?.filter((a: any) => !a.members) || [];
  console.log(`❌ members가 null인 레코드: ${nullMembers.length}개\n`);

  if (nullMembers.length > 0) {
    console.log('누락된 member_id 확인:\n');
    for (let i = 0; i < Math.min(nullMembers.length, 5); i++) {
      const nm: any = nullMembers[i];
      console.log(`  ${i + 1}. member_id: ${nm.member_id}`);

      // 해당 member가 실제로 존재하는지 확인
      const { data: member } = await supabase
        .from('members')
        .select('id, name, part, member_status')
        .eq('id', nm.member_id)
        .maybeSingle();

      if (member) {
        console.log(`     → Member 존재: ✅ ${member.name} (${member.part})`);
        console.log(`        상태: ${(member as any).member_status || 'ACTIVE'}`);
      } else {
        console.log(`     → Member 존재: ❌ members 테이블에 없음`);
      }
    }

    if (nullMembers.length > 5) {
      console.log(`  ... 외 ${nullMembers.length - 5}개`);
    }
  }

  // 5. member_status 확인
  console.log('\n👥 Members 테이블 상태 확인:');
  const { data: members } = await supabase
    .from('members')
    .select('id, name, part, member_status');

  console.log(`  총 Members: ${members?.length}개`);

  const statusCounts: Record<string, number> = {};
  members?.forEach((m: any) => {
    const status = m.member_status || 'ACTIVE';
    statusCounts[status] = (statusCounts[status] || 0) + 1;
  });

  console.log('  상태별 분포:');
  Object.entries(statusCounts).forEach(([status, count]) => {
    console.log(`    ${status}: ${count}명`);
  });

  // 6. 해결 방법 제시
  if (nullMembers.length > 0) {
    console.log('\n💡 해결 방법:');
    console.log('  문제: attendance 레코드가 참조하는 member_id가 members 테이블에 없습니다.');
    console.log('  원인: 멤버가 삭제되었거나, member_id가 잘못 입력되었을 수 있습니다.');
    console.log('\n  해결책:');
    console.log('  1. 고아 레코드 삭제: 해당 attendance 레코드를 삭제');
    console.log('  2. Member 복구: 삭제된 멤버를 members 테이블에 다시 추가');
  } else {
    console.log('\n✅ 문제 없음: 모든 attendance가 올바른 member를 참조하고 있습니다.');
  }
}

diagnose().catch(console.error);
