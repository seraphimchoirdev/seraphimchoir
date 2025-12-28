/**
 * REGULAR 상태인데 is_service_available = false인 멤버들을 true로 수정
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function fixUnavailableRegularMembers() {
  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('🔧 REGULAR 멤버 is_service_available 수정\n');

  // 최근 날짜
  const { data: recentArr } = await supabase
    .from('arrangements')
    .select('date, title')
    .order('date', { ascending: false })
    .limit(1)
    .single();

  const testDate = recentArr?.date;
  console.log(`📅 배치표: ${testDate} - ${recentArr?.title}\n`);

  // 1. is_service_available = false이면서 member_status = REGULAR인 멤버 찾기
  const { data: toFix } = await supabase
    .from('attendances')
    .select(
      `
      id,
      member_id,
      members (
        id,
        name,
        part,
        member_status
      )
    `
    )
    .eq('date', testDate!)
    .eq('is_service_available', false);

  const regularMembers = toFix?.filter((att: any) => {
    return att.members?.member_status === 'REGULAR';
  });

  console.log(`🔍 발견된 문제:`);
  console.log(`  is_service_available = false: ${toFix?.length}명`);
  console.log(`  그 중 REGULAR 상태: ${regularMembers?.length}명\n`);

  if (!regularMembers || regularMembers.length === 0) {
    console.log('✅ 수정할 데이터가 없습니다.');
    return;
  }

  console.log('수정할 멤버 목록:\n');

  const byPart: Record<string, string[]> = {
    SOPRANO: [],
    ALTO: [],
    TENOR: [],
    BASS: [],
  };

  regularMembers.forEach((att: any) => {
    if (att.members) {
      byPart[att.members.part].push(att.members.name);
    }
  });

  (['SOPRANO', 'ALTO', 'TENOR', 'BASS'] as const).forEach((part) => {
    if (byPart[part].length > 0) {
      console.log(`  ${part} (${byPart[part].length}명):`);
      byPart[part].forEach((name) => {
        console.log(`    - ${name}`);
      });
    }
  });

  // 2. 수정 실행
  console.log(`\n🔧 is_service_available을 true로 수정 중...\n`);

  const attendanceIds = regularMembers.map((att: any) => att.id);

  const { error } = await supabase
    .from('attendances')
    .update({ is_service_available: true })
    .in('id', attendanceIds);

  if (error) {
    console.error('❌ 수정 실패:', error.message);
    return;
  }

  console.log(`✅ ${regularMembers.length}명의 출석 데이터 수정 완료\n`);

  // 3. 검증
  const { data: afterFix } = await supabase
    .from('attendances')
    .select('is_service_available')
    .eq('date', testDate!)
    .eq('is_service_available', true);

  console.log('📊 수정 후 상태:');
  console.log(`  등단 가능 멤버: ${afterFix?.length}명`);
  console.log(`  (수정 전: 76명 → 수정 후: ${afterFix?.length}명)\n`);

  console.log('✅ 자리배치 페이지에서 모든 REGULAR 멤버가 표시됩니다.');
}

fixUnavailableRegularMembers().catch(console.error);
