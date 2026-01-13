/**
 * ML 배치 이력 데이터를 ml_arrangement_history 테이블에 삽입하는 스크립트
 *
 * training_data/ml_output/*.json 파일들을 읽어서
 * ml_arrangement_history 테이블에 요약 정보를 삽입합니다.
 *
 * 실행: npx tsx scripts/import-ml-history.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';
import { randomUUID } from 'crypto';

// .env 파일 로드
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('SUPABASE 환경 변수가 설정되지 않았습니다.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
}

// 파트명 매핑 (한글 -> 영문)
const partMapping: Record<string, string> = {
  소프라노: 'SOPRANO',
  알토: 'ALTO',
  테너: 'TENOR',
  베이스: 'BASS',
};

function transformPartBreakdown(
  breakdown: Record<string, number>
): Record<string, number> {
  const result: Record<string, number> = {};
  for (const [key, value] of Object.entries(breakdown)) {
    const mappedKey = partMapping[key] || key;
    result[mappedKey] = value;
  }
  return result;
}

// arrangements 테이블에서 매칭되는 ID 조회
async function findArrangementId(
  date: string,
  serviceType: string
): Promise<string | null> {
  // service_info 매핑: JSON의 예배 유형 → DB의 service_info
  // "2부예배" → "주일 2부 예배", "오후찬양예배" → "오후찬양예배"
  let serviceInfoPattern = serviceType;

  if (
    serviceType === '2부예배' ||
    serviceType === '2부주일예배' ||
    serviceType.includes('2부예배')
  ) {
    serviceInfoPattern = '2부';
  }

  const { data, error } = await supabase
    .from('arrangements')
    .select('id, service_info')
    .eq('date', date)
    .ilike('service_info', `%${serviceInfoPattern}%`)
    .limit(1);

  if (error || !data || data.length === 0) {
    return null;
  }

  return data[0].id;
}

async function checkExistingHistory(
  date: string,
  serviceType: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('ml_arrangement_history')
    .select('id')
    .eq('date', date)
    .eq('service_type', serviceType)
    .limit(1);

  if (error) {
    console.error('기존 기록 확인 실패:', error.message);
    return false;
  }

  return (data?.length || 0) > 0;
}

async function importFile(filePath: string): Promise<boolean> {
  const content = fs.readFileSync(filePath, 'utf-8');
  const data: MLData = JSON.parse(content);

  const serviceType = data.metadata.service;

  // 중복 확인
  const exists = await checkExistingHistory(data.date, serviceType);
  if (exists) {
    console.log(`스킵 (이미 존재): ${data.date} ${serviceType}`);
    return true;
  }

  // arrangements 테이블에서 매칭되는 ID 찾기
  const arrangementId = await findArrangementId(data.date, serviceType);
  if (!arrangementId) {
    console.log(`스킵 (arrangement 없음): ${data.date} ${serviceType}`);
    return false;
  }

  // 파트별 breakdown 변환
  const partBreakdown = transformPartBreakdown(data.metadata.breakdown);

  // ml_arrangement_history 삽입
  const { error } = await supabase.from('ml_arrangement_history').insert({
    id: randomUUID(),
    arrangement_id: arrangementId,
    date: data.date,
    service_type: serviceType,
    total_members: data.metadata.total_members,
    part_breakdown: partBreakdown,
    grid_layout: data.grid_layout,
  });

  if (error) {
    console.error(`삽입 실패 (${data.date} ${serviceType}):`, error.message);
    return false;
  }

  console.log(
    `${data.date} ${serviceType}: ${data.metadata.total_members}명 (S:${partBreakdown.SOPRANO || 0}, A:${partBreakdown.ALTO || 0}, T:${partBreakdown.TENOR || 0}, B:${partBreakdown.BASS || 0})`
  );
  return true;
}

async function main() {
  console.log('ML 배치 이력 데이터 Import 시작...\n');

  // ml_output 디렉토리의 JSON 파일 목록
  const mlOutputDir = path.join(__dirname, '..', 'training_data', 'ml_output');
  const files = fs
    .readdirSync(mlOutputDir)
    .filter((f) => f.endsWith('.json'))
    .sort();

  console.log(`처리할 파일 수: ${files.length}개\n`);

  let success = 0;
  let failed = 0;

  for (const file of files) {
    const filePath = path.join(mlOutputDir, file);
    const result = await importFile(filePath);

    if (result) {
      success++;
    } else {
      failed++;
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('Import 완료');
  console.log('='.repeat(50));
  console.log(`성공: ${success}개`);
  console.log(`실패: ${failed}개`);

  // 확인 쿼리
  const { data: stats, error: statsError } = await supabase
    .from('ml_arrangement_history')
    .select('date, service_type, total_members')
    .order('date', { ascending: true })
    .limit(5);

  if (!statsError && stats) {
    console.log('\n최초 5개 레코드:');
    stats.forEach((s) => {
      console.log(`  ${s.date} ${s.service_type}: ${s.total_members}명`);
    });
  }
}

main().catch(console.error);
