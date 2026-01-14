#!/usr/bin/env npx tsx

/**
 * ML Output 파트 데이터 DB 동기화 스크립트
 *
 * 1. DB에서 전체 멤버 목록 조회 (id, name, part)
 * 2. 모든 ml_output/*.json 파일 순회
 * 3. 각 좌석의 member_name으로 DB 파트 조회
 * 4. JSON 파트 vs DB 파트 비교
 * 5. 불일치 목록 출력
 * 6. --fix 옵션: 자동 수정
 *
 * 실행:
 *   검사만: npx tsx scripts/sync-ml-parts-with-db.ts
 *   수정: npx tsx scripts/sync-ml-parts-with-db.ts --fix
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

// 타입 정의
type Part = 'SOPRANO' | 'ALTO' | 'TENOR' | 'BASS' | 'SPECIAL';

interface DBMember {
  id: string;
  name: string;
  part: Part;
}

interface MLSeat {
  member_id: string;
  member_name: string;
  part: Part;
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

interface Mismatch {
  fileName: string;
  memberName: string;
  memberId: string;
  jsonPart: Part;
  dbPart: Part;
  row: number;
  col: number;
}

// 커맨드라인 인자 확인
const shouldFix = process.argv.includes('--fix');

async function getDBMembers(): Promise<Map<string, DBMember>> {
  console.log('📋 DB 멤버 정보 조회 중...');

  const { data, error } = await supabase
    .from('members')
    .select('id, name, part');

  if (error) {
    console.error('❌ members 조회 실패:', error.message);
    process.exit(1);
  }

  const memberMap = new Map<string, DBMember>();

  // ID 기반 맵
  for (const member of data || []) {
    memberMap.set(member.id, member as DBMember);
  }

  console.log(`✅ ${memberMap.size}명의 멤버 정보 로드 완료\n`);
  return memberMap;
}

function findMismatches(
  data: MLData,
  fileName: string,
  dbMembers: Map<string, DBMember>
): Mismatch[] {
  const mismatches: Mismatch[] = [];

  for (const seat of data.seats) {
    const dbMember = dbMembers.get(seat.member_id);

    if (!dbMember) {
      // member_id가 DB에 없는 경우 (별도 로그)
      continue;
    }

    if (seat.part !== dbMember.part) {
      mismatches.push({
        fileName,
        memberName: seat.member_name,
        memberId: seat.member_id,
        jsonPart: seat.part,
        dbPart: dbMember.part,
        row: seat.row,
        col: seat.col,
      });
    }
  }

  return mismatches;
}

function fixFile(filePath: string, mismatches: Mismatch[]): boolean {
  if (mismatches.length === 0) return false;

  try {
    const data: MLData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    // 수정 대상 member_id → 올바른 part 매핑
    const corrections = new Map<string, Part>();
    for (const m of mismatches) {
      corrections.set(m.memberId, m.dbPart);
    }

    // seats 배열 수정
    for (const seat of data.seats) {
      if (corrections.has(seat.member_id)) {
        seat.part = corrections.get(seat.member_id)!;
      }
    }

    // breakdown 재계산
    const partCounts: Record<string, number> = {
      소프라노: 0,
      알토: 0,
      테너: 0,
      베이스: 0,
    };

    const partNameMap: Record<Part, string> = {
      SOPRANO: '소프라노',
      ALTO: '알토',
      TENOR: '테너',
      BASS: '베이스',
      SPECIAL: '스페셜',
    };

    for (const seat of data.seats) {
      const koreanPart = partNameMap[seat.part];
      if (koreanPart && koreanPart in partCounts) {
        partCounts[koreanPart]++;
      }
    }

    data.metadata.breakdown = partCounts;

    // 파일 저장
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error(`❌ 파일 수정 실패 (${filePath}):`, error);
    return false;
  }
}

async function main() {
  console.log('\n' + '='.repeat(70));
  console.log('📊 ML Output 파트 데이터 DB 동기화');
  console.log('='.repeat(70));
  console.log(`모드: ${shouldFix ? '🔧 수정 모드 (--fix)' : '🔍 검사 모드'}`);
  console.log('');

  // 1. DB 멤버 정보 조회
  const dbMembers = await getDBMembers();

  // 2. ml_output 파일 목록
  const mlOutputDir = path.join(__dirname, '..', 'training_data', 'ml_output');
  const files = fs.readdirSync(mlOutputDir)
    .filter((f) => f.endsWith('.json'))
    .sort();

  console.log(`📁 검사할 파일: ${files.length}개\n`);

  // 3. 파일별 불일치 검출
  const allMismatches: Mismatch[] = [];
  const fileStats: {
    fileName: string;
    mismatchCount: number;
    fixed: boolean;
  }[] = [];

  for (const file of files) {
    const filePath = path.join(mlOutputDir, file);
    const data: MLData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    const mismatches = findMismatches(data, file, dbMembers);

    if (mismatches.length > 0) {
      allMismatches.push(...mismatches);

      let fixed = false;
      if (shouldFix) {
        fixed = fixFile(filePath, mismatches);
      }

      fileStats.push({
        fileName: file,
        mismatchCount: mismatches.length,
        fixed,
      });
    }
  }

  // 4. 결과 출력
  console.log('='.repeat(70));
  console.log('📋 불일치 상세 목록');
  console.log('='.repeat(70));

  // 파일별 그룹핑
  const byFile = new Map<string, Mismatch[]>();
  for (const m of allMismatches) {
    if (!byFile.has(m.fileName)) {
      byFile.set(m.fileName, []);
    }
    byFile.get(m.fileName)!.push(m);
  }

  for (const [fileName, mismatches] of byFile) {
    console.log(`\n📄 ${fileName}`);
    console.log('-'.repeat(50));

    for (const m of mismatches) {
      console.log(
        `  - ${m.memberName} (R${m.row}C${m.col}): JSON(${m.jsonPart}) ≠ DB(${m.dbPart})`
      );
    }
  }

  // 5. 요약 출력
  console.log('\n' + '='.repeat(70));
  console.log('📊 요약');
  console.log('='.repeat(70));
  console.log(`총 파일 수: ${files.length}개`);
  console.log(`불일치 파일 수: ${fileStats.length}개`);
  console.log(`총 불일치 좌석 수: ${allMismatches.length}개`);

  if (shouldFix) {
    const fixedCount = fileStats.filter((f) => f.fixed).length;
    console.log(`수정된 파일 수: ${fixedCount}개`);
  }

  // 파트별 불일치 통계
  const partMismatchStats: Record<string, number> = {};
  for (const m of allMismatches) {
    const key = `${m.jsonPart}→${m.dbPart}`;
    partMismatchStats[key] = (partMismatchStats[key] || 0) + 1;
  }

  if (Object.keys(partMismatchStats).length > 0) {
    console.log('\n파트 변환 패턴:');
    for (const [pattern, count] of Object.entries(partMismatchStats).sort(
      (a, b) => b[1] - a[1]
    )) {
      console.log(`  ${pattern}: ${count}건`);
    }
  }

  if (!shouldFix && allMismatches.length > 0) {
    console.log('\n💡 자동 수정하려면: npx tsx scripts/sync-ml-parts-with-db.ts --fix');
  }
}

main().catch(console.error);
