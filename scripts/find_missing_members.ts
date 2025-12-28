/**
 * 누락된 멤버 찾기
 * attendance에는 있지만 members 테이블에 없는 member_id 찾기
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function findMissingMembers() {
  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('🔍 누락된 멤버 찾기\n');

  // 1. 최근 날짜
  const { data: recentArr } = await supabase
    .from('arrangements')
    .select('date')
    .order('date', { ascending: false })
    .limit(1)
    .single();

  const testDate = recentArr?.date;
  console.log(`📅 테스트 날짜: ${testDate}\n`);

  // 2. 해당 날짜의 모든 attendance (조인 없이)
  const { data: allAttendances } = await supabase
    .from('attendances')
    .select('id, member_id, is_service_available')
    .eq('date', testDate!)
    .eq('is_service_available', true);

  console.log(`총 Attendance 레코드: ${allAttendances?.length || 0}개\n`);

  // 3. 각 member_id에 대해 실제 member 존재 여부 확인
  const missingMembers: Array<{ attendance_id: string; member_id: string }> = [];

  if (allAttendances) {
    for (const att of allAttendances) {
      const { data: member, error } = await supabase
        .from('members')
        .select('id, name, part')
        .eq('id', att.member_id)
        .maybeSingle();

      if (!member) {
        missingMembers.push({
          attendance_id: att.id,
          member_id: att.member_id,
        });
        console.log(`❌ Member 없음: ${att.member_id}`);
      }
    }
  }

  console.log(`\n📊 결과:`);
  console.log(`  총 Attendance: ${allAttendances?.length || 0}개`);
  console.log(`  존재하는 Member: ${(allAttendances?.length || 0) - missingMembers.length}개`);
  console.log(`  누락된 Member: ${missingMembers.length}개`);

  if (missingMembers.length > 0) {
    console.log('\n⚠️  누락된 멤버 상세:');
    missingMembers.forEach((m, idx) => {
      console.log(`  ${idx + 1}. Attendance ID: ${m.attendance_id}`);
      console.log(`     Member ID: ${m.member_id}`);
    });

    console.log('\n💡 해결 방법:');
    console.log('  1. 누락된 member_id의 attendance 레코드 삭제');
    console.log('  2. 또는 해당 member를 members 테이블에 추가');
  }

  return missingMembers;
}

findMissingMembers().catch(console.error);
