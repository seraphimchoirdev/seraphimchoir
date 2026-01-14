/**
 * DOCX 자리배치표를 파싱하여 ML 데이터로 변환하고 DB에 저장하는 스크립트
 *
 * 실행: npx tsx scripts/convert-docx-to-db.ts
 */

import * as mammoth from 'mammoth';
import * as fs from 'fs';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { randomUUID } from 'crypto';
import { JSDOM } from 'jsdom';

// .env 파일 로드
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('SUPABASE 환경 변수가 설정되지 않았습니다.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// 변환할 파일 목록
const FILES_TO_CONVERT = [
  {
    filename: '26-01-01 신년예배 2부(73).DOCX',
    date: '2026-01-01',
    totalExpected: 73,
  },
  {
    filename: '26-01-04 2부주일예배 등단자리표(83).DOCX',
    date: '2026-01-04',
    totalExpected: 83,
  },
  {
    filename: '26-01-11 2부주일예배 등단자리표(82).DOCX',
    date: '2026-01-11',
    totalExpected: 82,
  },
];

// OCR 이름 보정 매핑
const NAME_CORRECTIONS: Record<string, string> = {
  '강해선': '강혜선',
  '강성희': '강혜선',
  '김경숙': '김정숙',
  '김경희': '김정희',
  '김단빛': '김한빛',
  '김대명': '김대영',
  '김명경': '김영정',
  '김상무': '김상목',
  '김상복': '김상목',
  '김상우': '김상목',
  '김선희': '김진희',
  '김성옥': '김상목',
  '김성희': '김진희',
  '김소욱': '김소옥',
  '김영경': '김영정',
  '김영성': '김영정',
  '김영숙': '김향숙',
  '김재관': '김재원',
  '김정우': '김철우',
  '김지연': '김지영',
  '김창규': '김창동',
  '김평숙': '김향숙',
  '김해선': '김혜선',
  '김현범': '김한빛',
  '김혜경': '최해경',
  '김훈희': '김윤희',
  '김희원': '김희진',
  '김항숙': '김향숙',
  '김황숙': '김향숙',
  '김택준': '김택훈',
  '김택호': '김택훈',
  '김태훈': '김택훈',
  '문성희': '현성희',
  '민경심': '민경실',
  '백사무엘': '배사무엘',
  '백 사무엘': '배사무엘',
  '백하나': '백한나',
  '박재웅': '박재용',
  '박성길': '박재용',
  '사도자': '신나래',
  '서성숙': '서헌숙',
  '서원숙': '서헌숙',
  '서현숙': '서헌숙',
  '송기순': '손기순',
  '신혜리': '신나래',
  '안철준': '안형준',
  '안현준': '안형준',
  '양강현': '안강현',
  '양아들': '양아름',
  '엄성리': '임희정',
  '엄용주': '염용주',
  '오산영': '오신영',
  '오연부': '오연분',
  '오종철': '오흥철',
  '오홍철': '오흥철',
  '아건자': '이건자',
  '아지영': '이지영',
  '어상미': '이상미',
  '어선미': '이선미',
  '어광숙': '이광숙',
  '어지영': '이지영',
  '이강현': '이강봉',
  '이강복': '이강봉',
  '이광남': '이원섭',
  '이규라': '이규락',
  '이문령': '이문형',
  '이상봉': '이강봉',
  '이상아': '이선아',
  '이송숙': '이승숙',
  '이승교': '이승숙',
  '이원선': '이원섭',
  '이윤욱': '이윤옥',
  '이은영': '이문형',
  '이종숙': '이광숙',
  '이창재': '이철재',
  '이혜면': '이혜연',
  '임서언': '임서연',
  '임상진': '임삼진',
  '임찬성': '임찬섭',
  '정진선': '정진문',
  '최승은': '최승운',
  '최승훈': '최승운',
  '최창윤': '최창운',
  '최창은': '최창운',
  '최장은': '최창운',
  '최혜경': '최해경',
  '추석예': '추민아',
  '한민영': '한만영',
  '황복식': '황봉식',
  '황동식': '황봉식',
  '황봉석': '황봉식',
  '하 범': '하범',
  '문 희': '문희',
  '배사무엘': '배사무엘',
};

// 멤버 캐시 (DB에서 한 번만 조회)
let memberCache: Map<string, { id: string; part: string }> | null = null;

async function loadMemberCache(): Promise<Map<string, { id: string; part: string }>> {
  if (memberCache) return memberCache;

  const { data: members, error } = await supabase
    .from('members')
    .select('id, name, part');

  if (error) {
    throw new Error(`멤버 조회 실패: ${error.message}`);
  }

  memberCache = new Map();
  for (const m of members || []) {
    memberCache.set(m.name, { id: m.id, part: m.part });
  }

  console.log(`멤버 캐시 로드: ${memberCache.size}명\n`);
  return memberCache;
}

// 이름 정규화 및 보정
function normalizeName(rawName: string): string {
  // 줄바꿈 제거 및 공백 정리
  let name = rawName.replace(/\n/g, '').replace(/\s+/g, ' ').trim();

  // 보정 매핑 적용
  if (NAME_CORRECTIONS[name]) {
    name = NAME_CORRECTIONS[name];
  }

  // 공백 제거된 버전으로도 체크
  const noSpaceName = name.replace(/\s+/g, '');
  if (NAME_CORRECTIONS[noSpaceName]) {
    name = NAME_CORRECTIONS[noSpaceName];
  }

  return name.replace(/\s+/g, '');
}

// HTML에서 테이블 파싱
function parseHtmlTable(html: string): { rows: string[][]; metadata: Record<string, string> } {
  const dom = new JSDOM(html);
  const doc = dom.window.document;

  // 메타데이터 추출 (p 태그에서)
  const paragraphs = doc.querySelectorAll('p');
  const metadata: Record<string, string> = {
    date: '',
    service: '',
    anthem: '',
    offering_hymn_leader: '',
  };

  for (const p of paragraphs) {
    const text = p.textContent?.trim() || '';

    // 날짜 및 예배 유형
    const dateMatch = text.match(/(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일\s*(.+)/);
    if (dateMatch) {
      const [, year, month, day, service] = dateMatch;
      metadata.date = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      metadata.service = service.trim();
    }

    // 본 찬양 및 봉헌송
    const anthemMatch = text.match(/본\s*찬양\s*[:：]?\s*(.+?)\s*[\/]\s*봉헌송\s*[:：]?\s*(.+)/);
    if (anthemMatch) {
      metadata.anthem = anthemMatch[1].trim();
      metadata.offering_hymn_leader = anthemMatch[2].trim();
    }
  }

  // 테이블에서 이름 추출
  const rows: string[][] = [];
  const table = doc.querySelector('table');

  if (table) {
    const trs = table.querySelectorAll('tr');
    for (const tr of trs) {
      const rowNames: string[] = [];
      const tds = tr.querySelectorAll('td');

      for (const td of tds) {
        // td 안의 텍스트 전체를 가져와서 처리 (줄바꿈된 이름 처리)
        const tdText = td.textContent?.trim() || '';
        // 숫자만 있는 것은 행 인원 수이므로 스킵
        if (tdText && !/^\d+$/.test(tdText)) {
          // 줄바꿈으로 분리된 이름들을 합침 (예: "배\n사무엘" -> "배사무엘")
          const combinedName = tdText.replace(/\n/g, '').replace(/\s+/g, '');
          if (combinedName) {
            rowNames.push(combinedName);
          }
        }
      }

      if (rowNames.length > 0) {
        rows.push(rowNames);
      }
    }
  }

  // 행 순서 뒤집기: 지휘자에 가까운 쪽(테이블 하단)이 row 1이 되도록
  const reversedRows = rows.reverse();

  return { rows: reversedRows, metadata };
}

// 파트별 인원 수 계산
function calculateBreakdown(members: { name: string; part: string }[]): Record<string, number> {
  const breakdown: Record<string, number> = {
    SOPRANO: 0,
    ALTO: 0,
    TENOR: 0,
    BASS: 0,
  };

  for (const m of members) {
    if (breakdown[m.part] !== undefined) {
      breakdown[m.part]++;
    }
  }

  return breakdown;
}

interface ParsedData {
  date: string;
  service: string;
  anthem: string;
  offeringHymnLeader: string;
  rows: { row: number; members: { name: string; memberId: string | null; part: string }[] }[];
  totalMembers: number;
  breakdown: Record<string, number>;
  unmatchedNames: string[];
}

// DOCX 파일 파싱
async function parseDocx(filePath: string, overrideDate?: string): Promise<ParsedData> {
  const memberMap = await loadMemberCache();

  // HTML로 변환
  const htmlResult = await mammoth.convertToHtml({ path: filePath });
  const { rows: rawRows, metadata } = parseHtmlTable(htmlResult.value);

  const date = overrideDate || metadata.date;
  const service = metadata.service;
  const anthem = metadata.anthem;
  const offeringHymnLeader = metadata.offering_hymn_leader;

  const rows: ParsedData['rows'] = [];
  const allMembers: { name: string; part: string }[] = [];
  const unmatchedNames: string[] = [];

  for (let rowIdx = 0; rowIdx < rawRows.length; rowIdx++) {
    const rowMembers: { name: string; memberId: string | null; part: string }[] = [];

    for (const rawName of rawRows[rowIdx]) {
      const name = normalizeName(rawName);
      if (!name) continue;

      const memberInfo = memberMap.get(name);

      if (memberInfo) {
        rowMembers.push({
          name,
          memberId: memberInfo.id,
          part: memberInfo.part,
        });
        allMembers.push({ name, part: memberInfo.part });
      } else {
        // 매칭 안됨 - UNKNOWN으로 추가하되 기록
        rowMembers.push({
          name,
          memberId: null,
          part: 'UNKNOWN',
        });
        unmatchedNames.push(name);
      }
    }

    if (rowMembers.length > 0) {
      rows.push({ row: rowIdx + 1, members: rowMembers });
    }
  }

  const breakdown = calculateBreakdown(allMembers);

  return {
    date,
    service,
    anthem,
    offeringHymnLeader,
    rows,
    totalMembers: allMembers.length,
    breakdown,
    unmatchedNames,
  };
}

// ML 데이터 형식으로 변환
function toMlFormat(data: ParsedData): Record<string, unknown> {
  const seats: Record<string, unknown>[] = [];

  for (const row of data.rows) {
    for (let colIdx = 0; colIdx < row.members.length; colIdx++) {
      const member = row.members[colIdx];
      seats.push({
        member_id: member.memberId,
        member_name: member.name,
        part: member.part,
        height: null,
        experience_years: 0,
        is_part_leader: false,
        row: row.row,
        col: colIdx + 1,
      });
    }
  }

  return {
    arrangement_id: `docx_${data.date}_0`,
    date: data.date,
    metadata: {
      service: data.service,
      anthem: data.anthem,
      offering_hymn_leader: data.offeringHymnLeader,
      total_members: data.totalMembers,
      breakdown: {
        소프라노: data.breakdown.SOPRANO,
        알토: data.breakdown.ALTO,
        테너: data.breakdown.TENOR,
        베이스: data.breakdown.BASS,
      },
    },
    grid_layout: {
      rows: data.rows.length,
      row_capacities: data.rows.map(r => r.members.length),
      zigzag_pattern: 'even',
    },
    seats,
  };
}

// DB에 저장
async function saveToDb(data: ParsedData): Promise<{ success: boolean; arrangementId?: string; error?: string }> {
  try {
    // 1. 기존 arrangement 확인
    const { data: existingArr } = await supabase
      .from('arrangements')
      .select('id')
      .eq('date', data.date)
      .ilike('service_info', `%${data.service.includes('2부') ? '2부' : data.service}%`)
      .limit(1);

    let arrangementId: string;

    if (existingArr && existingArr.length > 0) {
      // 기존 arrangement 사용
      arrangementId = existingArr[0].id;
      console.log(`   기존 arrangement 사용: ${arrangementId}`);

      // 기존 seats 삭제
      await supabase
        .from('seats')
        .delete()
        .eq('arrangement_id', arrangementId);
    } else {
      // 새 arrangement 생성
      arrangementId = randomUUID();
      const serviceInfo = data.service.includes('신년') ? '신년 2부 예배' : '주일 2부 예배';
      const title = `${data.date.replace(/-/g, '/')} ${serviceInfo}`;

      const { error: arrError } = await supabase.from('arrangements').insert({
        id: arrangementId,
        date: data.date,
        title: title,
        service_info: serviceInfo,
        status: 'CONFIRMED',
      });

      if (arrError) {
        return { success: false, error: `Arrangement 생성 실패: ${arrError.message}` };
      }
      console.log(`   새 arrangement 생성: ${arrangementId}`);
    }

    // 2. Seats 저장
    const seatsToInsert: Record<string, unknown>[] = [];

    for (const row of data.rows) {
      for (let colIdx = 0; colIdx < row.members.length; colIdx++) {
        const member = row.members[colIdx];
        if (member.memberId) {
          seatsToInsert.push({
            arrangement_id: arrangementId,
            member_id: member.memberId,
            seat_row: row.row,
            seat_column: colIdx + 1,
            part: member.part,
            is_row_leader: false,
          });
        }
      }
    }

    if (seatsToInsert.length > 0) {
      const { error: seatsError } = await supabase.from('seats').insert(seatsToInsert);
      if (seatsError) {
        return { success: false, error: `Seats 저장 실패: ${seatsError.message}` };
      }
      console.log(`   Seats 저장: ${seatsToInsert.length}명`);
    }

    // 3. Attendances 저장/업데이트
    const memberIds = data.rows
      .flatMap(r => r.members)
      .filter(m => m.memberId)
      .map(m => m.memberId!);

    // 기존 attendance 조회
    const { data: existingAtt } = await supabase
      .from('attendances')
      .select('id, member_id')
      .eq('date', data.date);

    const existingAttMemberIds = new Set((existingAtt || []).map(a => a.member_id));

    // 새로 추가할 attendance
    const newAttendances = memberIds
      .filter(id => !existingAttMemberIds.has(id))
      .map(memberId => ({
        date: data.date,
        member_id: memberId,
        is_service_available: true,
        is_practice_available: false,
      }));

    if (newAttendances.length > 0) {
      const { error: attError } = await supabase.from('attendances').insert(newAttendances);
      if (attError) {
        console.warn(`   Attendance 추가 경고: ${attError.message}`);
      } else {
        console.log(`   Attendance 추가: ${newAttendances.length}명`);
      }
    }

    // 기존 attendance 업데이트 (is_service_available = true)
    const existingToUpdate = memberIds.filter(id => existingAttMemberIds.has(id));
    if (existingToUpdate.length > 0) {
      await supabase
        .from('attendances')
        .update({ is_service_available: true })
        .eq('date', data.date)
        .in('member_id', existingToUpdate);
      console.log(`   Attendance 업데이트: ${existingToUpdate.length}명`);
    }

    // 4. ml_arrangement_history 저장
    const { data: existingHistory } = await supabase
      .from('ml_arrangement_history')
      .select('id')
      .eq('date', data.date)
      .limit(1);

    if (!existingHistory || existingHistory.length === 0) {
      const { error: histError } = await supabase.from('ml_arrangement_history').insert({
        id: randomUUID(),
        arrangement_id: arrangementId,
        date: data.date,
        service_type: data.service.includes('신년') ? '신년 2부 예배' : '주일 2부 예배',
        total_members: data.totalMembers,
        part_breakdown: data.breakdown,
        grid_layout: {
          rows: data.rows.length,
          row_capacities: data.rows.map(r => r.members.length),
          zigzag_pattern: 'even',
        },
      });

      if (histError) {
        console.warn(`   ML History 저장 경고: ${histError.message}`);
      } else {
        console.log(`   ML History 저장 완료`);
      }
    } else {
      console.log(`   ML History 이미 존재 (스킵)`);
    }

    return { success: true, arrangementId };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

async function main() {
  console.log('=== DOCX -> ML 데이터 변환 및 DB 저장 시작 ===\n');

  // jsdom 의존성 체크
  try {
    require.resolve('jsdom');
  } catch {
    console.error('jsdom이 설치되어 있지 않습니다. npm install jsdom를 실행하세요.');
    process.exit(1);
  }

  const diffDataDir = path.join(__dirname, '..', 'training_data', 'diff_data');
  const mlOutputDir = path.join(__dirname, '..', 'training_data', 'ml_output');

  // 출력 디렉토리 확인
  if (!fs.existsSync(mlOutputDir)) {
    fs.mkdirSync(mlOutputDir, { recursive: true });
  }

  for (const fileInfo of FILES_TO_CONVERT) {
    console.log('─'.repeat(60));
    console.log(`파일: ${fileInfo.filename}`);
    console.log(`예상 날짜: ${fileInfo.date}, 예상 인원: ${fileInfo.totalExpected}명`);
    console.log('─'.repeat(60));

    const filePath = path.join(diffDataDir, fileInfo.filename);

    if (!fs.existsSync(filePath)) {
      console.error(`   파일을 찾을 수 없음: ${filePath}\n`);
      continue;
    }

    try {
      // 1. DOCX 파싱
      const parsedData = await parseDocx(filePath, fileInfo.date);
      console.log(`   파싱 결과: ${parsedData.totalMembers}명`);
      console.log(`   예배: ${parsedData.service}`);
      console.log(`   찬양: ${parsedData.anthem}`);
      console.log(`   파트별: S=${parsedData.breakdown.SOPRANO}, A=${parsedData.breakdown.ALTO}, T=${parsedData.breakdown.TENOR}, B=${parsedData.breakdown.BASS}`);

      if (parsedData.unmatchedNames.length > 0) {
        console.log(`   매칭 안된 이름 (${parsedData.unmatchedNames.length}): ${parsedData.unmatchedNames.join(', ')}`);
      }

      // 2. DB 저장
      const dbResult = await saveToDb(parsedData);
      if (!dbResult.success) {
        console.error(`   DB 저장 실패: ${dbResult.error}\n`);
        continue;
      }

      // 3. ML JSON 파일 저장
      const mlData = toMlFormat(parsedData);
      const mlFileName = `ml_${fileInfo.date}_${parsedData.service.replace(/\s+/g, '')}.json`;
      const mlFilePath = path.join(mlOutputDir, mlFileName);
      fs.writeFileSync(mlFilePath, JSON.stringify(mlData, null, 2), 'utf-8');
      console.log(`   ML JSON 저장: ${mlFileName}`);

      console.log(`   ✓ 완료!\n`);
    } catch (error) {
      console.error(`   오류: ${error}\n`);
    }
  }

  console.log('=== 변환 완료 ===');
}

main().catch(console.error);
