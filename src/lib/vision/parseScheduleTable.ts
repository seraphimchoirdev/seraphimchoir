/**
 * 선곡표 이미지에서 추출한 텍스트를 파싱하여 예배 일정 데이터로 변환
 *
 * 선곡표 컬럼 구조:
 * 1. 날짜 (M/D 또는 MM/DD)
 * 2. 후드 색상 (백, 녹, 보라, 적 등)
 * 3. 찬양곡명
 * 4. 작곡가/편곡자
 * 5. 악보 출처 (악보책명 + 페이지)
 * 6. 봉헌송 연주자
 * 7. 절기/행사 정보
 */
import { createLogger } from '@/lib/logger';

import type { Database } from '@/types/database.types';

import { ExtractedWord, groupRowIntoColumns, groupWordsIntoRows } from './visionClient';

const logger = createLogger({ prefix: 'ParseScheduleTable' });

type ServiceScheduleInsert = Database['public']['Tables']['service_schedules']['Insert'];

export interface ParsedSchedule {
  date: string;
  hood_color: string | null;
  hymn_name: string | null;
  composer: string | null;
  music_source: string | null;
  offertory_performer: string | null;
  service_type: string;
  notes: string | null;
}

export interface ParseResult {
  success: boolean;
  schedules: ParsedSchedule[];
  errors: string[];
  warnings: string[];
}

// 후드 색상 목록
const HOOD_COLORS = [
  '백',
  '녹',
  '보라',
  '적',
  '검정',
  '흰',
  '녹색',
  '보라색',
  '흰색',
  '검정색',
  '빨강',
];

/**
 * 찬양대가 담당하는 절기찬양예배 (정확한 매칭)
 * - 성금요 촛불음악예배
 * - 부활절 찬양예배 (부활주일)
 * - 창립기념주일 찬양예배
 * - 추수감사주일 찬양예배
 * - 성탄전야 촛불음악예배
 * - 송구영신예배
 */
const CHOIR_SPECIAL_SERVICES = [
  '성금요', // 성금요 촛불음악예배
  '부활주일', // 부활절 찬양예배
  '창립기념', // 창립기념주일 찬양예배
  '추수감사', // 추수감사주일 찬양예배
  '성탄전야', // 성탄전야 촛불음악예배
  '송구영신', // 송구영신예배
];

// 기도회로 분류되는 키워드
const PRAYER_MEETING_KEYWORDS = [
  '기도회',
  '새벽',
  '부흥사경회',
  '사경회',
  '구국', // 구국기도회
];

/**
 * 날짜 문자열에서 요일 정보가 있는지 확인
 * @param dateStr 날짜 문자열 (예: 1/7(수), 3/12(목), 1/7 ( 수 ))
 * @returns 요일이 포함되어 있으면 true
 */
export function hasWeekdayInfo(dateStr: string): boolean {
  // 공백 제거 후 요일 확인
  const cleaned = dateStr.replace(/\s/g, '');
  return /\([월화수목금토일]\)/.test(cleaned);
}

/**
 * 날짜 문자열을 YYYY-MM-DD 형식으로 정규화
 * @param dateStr M/D 또는 MM/DD 형식 (선택적으로 요일 포함: 1/7(수), 3/12(목))
 * @param year 연도
 */
export function normalizeDateString(dateStr: string, year: number): string | null {
  // 다양한 날짜 형식 처리
  // 1/5, 01/05, 1.5, 01.05, 1/7(수), 3/12(목) 등
  const cleanedDate = dateStr.replace(/\s/g, '').trim();

  // M/D 또는 MM/DD 패턴 (선택적으로 뒤에 요일 정보 포함: 1/7(수), 3/12(목))
  const slashMatch = cleanedDate.match(/^(\d{1,2})\/(\d{1,2})(?:\([^)]*\))?$/);
  if (slashMatch) {
    const month = parseInt(slashMatch[1], 10);
    const day = parseInt(slashMatch[2], 10);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  // M.D 또는 MM.DD 패턴 (선택적으로 뒤에 요일 정보 포함)
  const dotMatch = cleanedDate.match(/^(\d{1,2})\.(\d{1,2})(?:\([^)]*\))?$/);
  if (dotMatch) {
    const month = parseInt(dotMatch[1], 10);
    const day = parseInt(dotMatch[2], 10);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  // M-D 또는 MM-DD 패턴 (선택적으로 뒤에 요일 정보 포함)
  const dashMatch = cleanedDate.match(/^(\d{1,2})-(\d{1,2})(?:\([^)]*\))?$/);
  if (dashMatch) {
    const month = parseInt(dashMatch[1], 10);
    const day = parseInt(dashMatch[2], 10);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  return null;
}

/**
 * "XXX" 또는 빈 값을 null로 변환
 */
function normalizeEmptyValue(value: string | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (
    trimmed === '' ||
    trimmed === 'XXX' ||
    trimmed === 'xxx' ||
    trimmed === 'X' ||
    trimmed === 'x' ||
    trimmed === '-'
  ) {
    return null;
  }
  return trimmed;
}

/**
 * 예배 유형 추론
 *
 * 분류 우선순위:
 * 1. 찬양대 절기찬양예배 (6가지 특별예배)
 * 2. 기도회 (새벽기도회, 부흥사경회 등)
 * 3. 주일 2부 예배 (기본값)
 *
 * @param notesText 비고/절기 텍스트
 * @param isSunday 주일 여부
 */
function inferServiceType(notesText: string | null, isSunday: boolean = true): string {
  if (!notesText) return isSunday ? '주일 2부 예배' : '기도회';

  // 1. 찬양대 담당 절기찬양예배 체크
  for (const keyword of CHOIR_SPECIAL_SERVICES) {
    if (notesText.includes(keyword)) {
      return '절기찬양예배';
    }
  }

  // 2. 기도회 체크
  for (const keyword of PRAYER_MEETING_KEYWORDS) {
    if (notesText.includes(keyword)) {
      return '기도회';
    }
  }

  // 3. 기본값: 주일이면 주일 2부 예배, 평일이면 기도회
  return isSunday ? '주일 2부 예배' : '기도회';
}

/**
 * 후드 색상 추출 (첫 번째 매칭되는 색상 반환)
 */
function extractHoodColor(text: string): string | null {
  for (const color of HOOD_COLORS) {
    if (text.includes(color)) {
      // 정규화된 색상 이름 반환
      if (color.includes('백') || color.includes('흰')) return '백';
      if (color.includes('녹')) return '녹';
      if (color.includes('보라')) return '보라';
      if (color.includes('적') || color.includes('빨')) return '적';
      if (color.includes('검')) return '검정';
      return color;
    }
  }
  return null;
}

/**
 * 행의 모든 단어에서 후드 색상 검색
 * Vision API가 좁은 컬럼의 텍스트를 놓칠 수 있어서 전체 행을 검색
 */
function findHoodColorInRow(rowWords: ExtractedWord[]): string | null {
  // 각 단어에서 후드 색상 검색
  for (const word of rowWords) {
    const color = extractHoodColor(word.text);
    if (color) return color;
  }
  return null;
}

/**
 * 행 데이터가 날짜를 포함하는 데이터 행인지 확인
 */
function isDataRowWithDate(columns: string[]): boolean {
  if (columns.length < 3) return false;

  // 첫 번째, 두 번째, 세 번째 컬럼에 날짜 패턴이 있는지 확인
  // 1/7, 3/12(목), 4/1(수) 등의 형식 지원
  // 왼쪽 여백으로 인해 컬럼이 밀릴 수 있음
  const datePattern = /\d{1,2}[\/\.\-]\d{1,2}/;
  return (
    datePattern.test(columns[0] || '') ||
    datePattern.test(columns[1] || '') ||
    datePattern.test(columns[2] || '')
  );
}

/**
 * 셀 병합된 행인지 확인 (날짜 없이 찬양곡 정보만 있는 행)
 * 예: 2/8 주일 2부 예배 + 오후찬양예배 중 두 번째 행
 */
function isMergedCellRow(columns: string[], offset: number): boolean {
  if (columns.length < 3) return false;

  // 날짜가 없고, 찬양곡명(3번째 컬럼)에 유의미한 값이 있는지 확인
  const datePattern = /\d{1,2}[\/\.\-]\d{1,2}/;
  const hasDate =
    datePattern.test(columns[0] || '') ||
    datePattern.test(columns[1] || '') ||
    datePattern.test(columns[2] || '');

  if (hasDate) return false;

  // 찬양곡명 컬럼 확인 (offset 고려)
  const hymnColumn = columns[2 + offset] || columns[2] || '';
  const hymnText = hymnColumn.trim();

  // 찬양곡명이 있고 "XXX"만 있는 것이 아니면 데이터 행
  // (XXX(추후공지) 같은 경우도 있으니 별도 예배로 인식)
  if (hymnText && hymnText !== '-' && hymnText !== '') {
    return true;
  }

  // 비고(notes) 컬럼에 유의미한 값이 있는지 확인
  const notesColumn = columns[7 + offset] || columns[6 + offset] || columns[6] || '';
  const notesText = notesColumn.trim();

  // 오후찬양예배, 찬양대연합 등의 키워드가 있으면 데이터 행
  if (
    notesText &&
    (notesText.includes('오후') ||
      notesText.includes('찬양대연합') ||
      notesText.includes('연합') ||
      notesText.includes('특별'))
  ) {
    return true;
  }

  return false;
}

/**
 * 컬럼 경계 자동 감지
 * 모든 행에서 공통적으로 나타나는 빈 공간을 컬럼 경계로 인식
 */
export function detectColumnBoundaries(
  rows: ExtractedWord[][],
  imageWidth: number = 2000
): number[] {
  if (rows.length === 0) return [0, imageWidth];

  // 모든 단어의 X좌표 수집
  const allWords = rows.flat();
  if (allWords.length === 0) return [0, imageWidth];

  // X좌표 히스토그램 생성 (빈 공간 찾기)
  const binSize = 10;
  const bins: number[] = new Array(Math.ceil(imageWidth / binSize)).fill(0);

  for (const word of allWords) {
    const startBin = Math.floor(word.left / binSize);
    const endBin = Math.floor(word.right / binSize);
    for (let i = startBin; i <= endBin && i < bins.length; i++) {
      bins[i]++;
    }
  }

  // 빈 공간(값이 낮은 구간)을 컬럼 경계로 사용
  const boundaries: number[] = [0];
  let inGap = false;
  let gapStart = 0;

  const threshold = rows.length * 0.3; // 30% 미만의 행에 단어가 있으면 gap

  for (let i = 0; i < bins.length; i++) {
    if (bins[i] < threshold && !inGap) {
      inGap = true;
      gapStart = i;
    } else if (bins[i] >= threshold && inGap) {
      inGap = false;
      // gap의 중간 지점을 경계로
      const gapMid = ((gapStart + i) / 2) * binSize;
      if (gapMid > boundaries[boundaries.length - 1] + 50) {
        // 최소 50px 간격
        boundaries.push(gapMid);
      }
    }
  }

  boundaries.push(imageWidth);

  // 7개 컬럼이 되도록 조정 (날짜, 후드색, 곡명, 작곡가, 출처, 봉헌송, 절기)
  if (boundaries.length < 8) {
    // 컬럼이 부족하면 균등 분할 추가
    const expectedColumns = 7;
    const newBoundaries = [0];
    const step = imageWidth / expectedColumns;
    for (let i = 1; i < expectedColumns; i++) {
      newBoundaries.push(i * step);
    }
    newBoundaries.push(imageWidth);
    return newBoundaries;
  }

  return boundaries;
}

/**
 * 선곡표 이미지에서 추출된 단어들을 파싱하여 예배 일정 데이터로 변환
 *
 * 셀 병합 처리:
 * - 같은 날짜에 여러 예배(주일 2부 예배 + 오후찬양예배)가 있는 경우
 * - 날짜와 후드 색상이 셀 병합되어 첫 번째 행에만 있음
 * - 두 번째 행은 날짜 없이 찬양곡 정보만 있음
 * - 이전 행의 날짜/후드를 상속하여 별도 레코드로 저장
 */
export function parseScheduleFromWords(
  words: ExtractedWord[],
  year: number,
  imageWidth: number = 2000
): ParseResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const schedules: ParsedSchedule[] = [];

  if (words.length === 0) {
    return {
      success: false,
      schedules: [],
      errors: ['이미지에서 텍스트를 추출할 수 없습니다.'],
      warnings: [],
    };
  }

  // 단어들을 행으로 그룹화
  const rows = groupWordsIntoRows(words, 20);

  // 컬럼 경계 감지
  const columnBoundaries = detectColumnBoundaries(rows, imageWidth);

  // 이전 행의 날짜/후드 정보 (셀 병합 처리용)
  let lastDate: string | null = null;
  let lastHoodColor: string | null = null;
  let lastOffset = 0;
  let lastIsSunday = true;

  // 각 행을 파싱
  for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex];
    const columns = groupRowIntoColumns(row, columnBoundaries);

    // 날짜가 있는 데이터 행인지 확인
    const hasDateRow = isDataRowWithDate(columns);

    // 날짜 컬럼 찾기 (첫 번째 비어있지 않은 날짜 패턴 컬럼)
    let dateColumnIndex = 0;
    let dateStr = columns[0]?.trim();

    // 컬럼 0이 비어있거나 날짜가 아니면 컬럼 1 시도
    if (!dateStr || !normalizeDateString(dateStr, year)) {
      dateStr = columns[1]?.trim();
      dateColumnIndex = 1;
    }

    // 데이터 컬럼 오프셋 계산
    const offset = hasDateRow ? dateColumnIndex : lastOffset;

    // 날짜가 있는 행 처리
    if (hasDateRow) {
      const normalizedDate = normalizeDateString(dateStr || '', year);

      if (!normalizedDate) {
        warnings.push(`행 ${rowIndex + 1}: 날짜 형식을 인식할 수 없음 - "${dateStr}"`);
        continue;
      }

      // 주일 여부 판단
      const hasWeekday = hasWeekdayInfo(dateStr || '');
      let isSunday = false;

      if (hasWeekday) {
        isSunday = (dateStr || '').includes('(일)');
      } else {
        const dateObj = new Date(normalizedDate);
        isSunday = dateObj.getDay() === 0;
      }

      // 후드 색상 추출
      let hoodColor = extractHoodColor(columns[1 + offset] || '');
      if (!hoodColor) {
        hoodColor = findHoodColorInRow(row);
      }
      if (!hoodColor) {
        hoodColor = normalizeEmptyValue(columns[1 + offset]);
      }

      // 이전 행 정보 저장 (다음 셀 병합 행을 위해)
      lastDate = normalizedDate;
      lastHoodColor = hoodColor;
      lastOffset = offset;
      lastIsSunday = isSunday;

      // 각 필드 추출
      const notesText = normalizeEmptyValue(columns[7 + offset] || columns[6 + offset]);
      const serviceType = inferServiceType(notesText, isSunday);

      const schedule: ParsedSchedule = {
        date: normalizedDate,
        hood_color: hoodColor,
        hymn_name: normalizeEmptyValue(columns[2 + offset]),
        composer: normalizeEmptyValue(columns[3 + offset]),
        music_source: normalizeEmptyValue(columns[4 + offset]),
        offertory_performer: normalizeEmptyValue(columns[5 + offset]),
        notes: notesText,
        service_type: serviceType,
      };

      schedules.push(schedule);
    }
    // 셀 병합된 행 처리 (날짜 없이 찬양곡 정보만 있는 행)
    else if (lastDate && isMergedCellRow(columns, offset)) {
      // 비고 필드에서 service_type 추론
      const notesText = normalizeEmptyValue(
        columns[7 + offset] || columns[6 + offset] || columns[6]
      );

      // 오후찬양예배, 찬양대연합 등 별도 예배 유형 판단
      let serviceType = '오후찬양예배'; // 기본값: 오후찬양예배

      if (notesText) {
        if (notesText.includes('찬양대연합')) {
          serviceType = '찬양대연합예배';
        } else if (notesText.includes('오후')) {
          serviceType = '오후찬양예배';
        } else {
          // 비고에서 service_type 추론
          serviceType = inferServiceType(notesText, lastIsSunday);
        }
      }

      const schedule: ParsedSchedule = {
        date: lastDate, // 이전 행의 날짜 상속
        hood_color: lastHoodColor, // 이전 행의 후드 색상 상속
        hymn_name: normalizeEmptyValue(columns[2 + offset] || columns[2]),
        composer: normalizeEmptyValue(columns[3 + offset] || columns[3]),
        music_source: normalizeEmptyValue(columns[4 + offset] || columns[4]),
        offertory_performer: normalizeEmptyValue(columns[5 + offset] || columns[5]),
        notes: notesText,
        service_type: serviceType,
      };

      schedules.push(schedule);

      logger.debug(`셀 병합 행 감지: ${lastDate} - ${serviceType} - ${schedule.hymn_name}`);
    }
  }

  return {
    success: schedules.length > 0,
    schedules,
    errors,
    warnings,
  };
}

/**
 * ParsedSchedule을 ServiceScheduleInsert 형식으로 변환
 *
 * 예배 유형별 연습 설정:
 * - 주일 2부 예배: 예배 전 연습 + 예배 후 연습
 * - 오후찬양예배: 예배 전 연습만 (예배 후 연습 없음)
 * - 기도회: 예배 전 연습만
 * - 절기찬양예배: 예배 전 연습 + 예배 후 연습
 * - 찬양대연합예배: 예배 전 연습만
 */
export function toServiceScheduleInsert(parsed: ParsedSchedule): ServiceScheduleInsert {
  // 예배 후 연습이 있는 예배 유형
  const hasPostPracticeTypes = ['주일 2부 예배', '절기찬양예배'];
  const hasPostPractice = hasPostPracticeTypes.includes(parsed.service_type);

  return {
    date: parsed.date,
    service_type: parsed.service_type,
    hymn_name: parsed.hymn_name,
    composer: parsed.composer,
    hood_color: parsed.hood_color,
    music_source: parsed.music_source,
    offertory_performer: parsed.offertory_performer,
    notes: parsed.notes,
    // 예배 유형별 연습 설정
    has_post_practice: hasPostPractice,
    has_pre_practice: true,
    pre_practice_minutes_before: 60,
    post_practice_start_time: hasPostPractice ? '07:30' : null,
    post_practice_duration: hasPostPractice ? 60 : null,
    pre_practice_location: '2층 1찬양대실',
    post_practice_location: hasPostPractice ? '7층 2찬양대실' : null,
  };
}
