/**
 * 등단 불가능으로 표시된 멤버 목록 확인
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function showUnavailableMembers() {
  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('🔍 등단 불가능 멤버 확인\n');

  // 최근 날짜
  const { data: recentArr } = await supabase
    .from('arrangements')
    .select('date, title')
    .order('date', { ascending: false })
    .limit(1)
    .single();

  const testDate = recentArr?.date;
  console.log(`📅 배치표: ${testDate} - ${recentArr?.title}\n`);

  // is_service_available = false인 멤버들
  const { data: unavailable } = await supabase
    .from('attendances')
    .select(
      `
      id,
      member_id,
      is_service_available,
      is_practice_attended,
      notes,
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

  console.log(`❌ 등단 불가능 (is_service_available = false): ${unavailable?.length}명\n`);

  if (unavailable && unavailable.length > 0) {
    console.log('멤버 목록:\n');

    // 파트별로 그룹화
    const byPart: Record<string, any[]> = {
      SOPRANO: [],
      ALTO: [],
      TENOR: [],
      BASS: [],
      SPECIAL: [],
    };

    unavailable.forEach((att: any) => {
      if (att.members) {
        byPart[att.members.part].push({
          name: att.members.name,
          status: att.members.member_status,
          notes: att.notes,
          practice: att.is_practice_attended,
        });
      }
    });

    // 파트별 출력
    (['SOPRANO', 'ALTO', 'TENOR', 'BASS', 'SPECIAL'] as const).forEach((part) => {
      const members = byPart[part];
      if (members.length > 0) {
        console.log(`  ${part} (${members.length}명):`);
        members.forEach((m) => {
          const statusIcon = m.status === 'REGULAR' ? '🟢' : m.status === 'ON_LEAVE' ? '🟡' : '🔴';
          const notesText = m.notes ? ` - ${m.notes}` : '';
          console.log(`    ${statusIcon} ${m.name}${notesText}`);
        });
        console.log('');
      }
    });
  }

  // 등단 가능한 멤버들
  const { data: available } = await supabase
    .from('attendances')
    .select(
      `
      members (name, part)
    `
    )
    .eq('date', testDate!)
    .eq('is_service_available', true);

  console.log(`✅ 등단 가능 (is_service_available = true): ${available?.length}명`);

  // 파트별 분포
  const partCounts: Record<string, number> = {};
  available?.forEach((att: any) => {
    if (att.members) {
      const part = att.members.part;
      partCounts[part] = (partCounts[part] || 0) + 1;
    }
  });

  console.log('\n파트별 분포:');
  Object.entries(partCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([part, count]) => {
      console.log(`  ${part}: ${count}명`);
    });

  console.log('\n💡 참고:');
  console.log('  - 등단 불가능 멤버는 자리배치 페이지에서 제외됩니다.');
  console.log('  - 멤버 상태: 🟢 REGULAR, 🟡 ON_LEAVE, 🔴 RESIGNED');
  console.log('  - 출석 데이터를 수정하려면 출석 관리 페이지를 이용하세요.');
}

showUnavailableMembers().catch(console.error);
