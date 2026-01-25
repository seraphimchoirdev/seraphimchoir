/**
 * PDF 파일에서 텍스트를 추출
 * - 텍스트 기반 PDF: 직접 텍스트 추출 (100% 정확도)
 * - 스캔 PDF: 이미지로 변환 후 Vision API OCR
 */
import { pdfToPng } from 'pdf-to-png-converter';
import { extractText, getDocumentProxy } from 'unpdf';

import { createLogger } from '@/lib/logger';

import type { ParseResult, ParsedSchedule } from './parseScheduleTable';
import { hasWeekdayInfo, normalizeDateString } from './parseScheduleTable';

const logger = createLogger({ prefix: 'PDFParser' });

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

// 절기/행사 키워드에서 예배 유형 추론
const SERVICE_TYPE_KEYWORDS: Record<string, string> = {
  성탄: '절기찬양예배',
  부활: '절기찬양예배',
  추수감사: '절기찬양예배',
  맥추: '절기찬양예배',
  종려: '절기찬양예배',
  사순: '절기찬양예배',
  부활절: '절기찬양예배',
  성탄절: '절기찬양예배',
  오순절: '절기찬양예배',
  대림절: '절기찬양예배',
  송구영신: '절기찬양예배',
  신년: '절기찬양예배',
  설날: '절기찬양예배',
  새해: '절기찬양예배',
  기도회: '기도회',
  새벽: '기도회',
};

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
 * 절기/행사 텍스트에서 예배 유형 추론
 */
function inferServiceType(notesText: string | null): string {
  if (!notesText) return '주일 2부 예배';

  for (const [keyword, serviceType] of Object.entries(SERVICE_TYPE_KEYWORDS)) {
    if (notesText.includes(keyword)) {
      return serviceType;
    }
  }

  return '주일 2부 예배';
}

/**
 * 후드 색상 추출
 */
function extractHoodColor(text: string): string | null {
  for (const color of HOOD_COLORS) {
    if (text.includes(color)) {
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
 * 텍스트 행을 컬럼으로 분리 (탭 또는 다중 공백 기준)
 */
function splitRowIntoColumns(line: string): string[] {
  // 먼저 탭으로 분리 시도
  if (line.includes('\t')) {
    return line.split('\t').map((col) => col.trim());
  }

  // 탭이 없으면 2개 이상의 연속 공백으로 분리
  return line
    .split(/\s{2,}/)
    .map((col) => col.trim())
    .filter((col) => col.length > 0);
}

/**
 * 날짜 패턴 감지
 */
function isDatePattern(text: string): boolean {
  const cleaned = text.replace(/\s/g, '');
  return /^\d{1,2}[\/\.\-]\d{1,2}(\([월화수목금토일]\))?$/.test(cleaned);
}

/**
 * PDF에서 추출된 텍스트를 파싱하여 예배 일정으로 변환
 */
export function parseScheduleFromPdfText(text: string, year: number): ParseResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const schedules: ParsedSchedule[] = [];

  const lines = text.split('\n').filter((line) => line.trim().length > 0);

  logger.debug('=== PDF 텍스트 파싱 ===');
  logger.debug('총 라인 수:', lines.length);
  logger.debug('처음 10개 라인:', lines.slice(0, 10));

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const columns = splitRowIntoColumns(line);

    if (columns.length < 3) continue;

    // 날짜가 있는 컬럼 찾기
    let dateColumnIndex = -1;
    let dateStr = '';

    for (let j = 0; j < Math.min(3, columns.length); j++) {
      if (isDatePattern(columns[j])) {
        dateColumnIndex = j;
        dateStr = columns[j];
        break;
      }
    }

    if (dateColumnIndex === -1) continue;

    const normalizedDate = normalizeDateString(dateStr, year);
    if (!normalizedDate) {
      warnings.push(`행 ${i + 1}: 날짜 형식을 인식할 수 없음 - "${dateStr}"`);
      continue;
    }

    // 오프셋 계산
    const offset = dateColumnIndex;

    // 각 필드 추출
    const hoodColorCol = columns[1 + offset] || '';
    const hymnNameCol = columns[2 + offset] || '';
    const composerCol = columns[3 + offset] || '';
    const musicSourceCol = columns[4 + offset] || '';
    const offertoryCol = columns[5 + offset] || '';
    const notesCol = columns[6 + offset] || columns[7 + offset] || '';

    // 요일이 포함된 날짜는 기도회로 추론
    const isWeekdayService = hasWeekdayInfo(dateStr);
    const notesText = normalizeEmptyValue(notesCol);
    let serviceType = inferServiceType(notesText);

    if (isWeekdayService && serviceType === '주일 2부 예배') {
      serviceType = '기도회';
    }

    const schedule: ParsedSchedule = {
      date: normalizedDate,
      hood_color: extractHoodColor(hoodColorCol) || normalizeEmptyValue(hoodColorCol),
      hymn_name: normalizeEmptyValue(hymnNameCol),
      composer: normalizeEmptyValue(composerCol),
      music_source: normalizeEmptyValue(musicSourceCol),
      offertory_performer: normalizeEmptyValue(offertoryCol),
      notes: notesText,
      service_type: serviceType,
    };

    schedules.push(schedule);
  }

  logger.debug('파싱된 스케줄 수:', schedules.length);

  return {
    success: schedules.length > 0,
    schedules,
    errors,
    warnings,
  };
}

/**
 * PDF 파일에서 텍스트 추출
 */
export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const { text } = await extractText(pdf, { mergePages: true });
  return text;
}

/**
 * PDF가 텍스트 기반인지 확인 (스캔된 이미지 PDF가 아닌지)
 */
export async function isPdfTextBased(buffer: Buffer): Promise<boolean> {
  try {
    const text = await extractTextFromPdf(buffer);
    // 텍스트가 일정량 이상 추출되면 텍스트 기반으로 판단
    return text.trim().length > 100;
  } catch {
    return false;
  }
}

/**
 * 스캔된 PDF를 이미지(Base64)로 변환
 * 첫 페이지만 변환 (선곡표는 보통 1페이지)
 */
export async function convertPdfToImage(buffer: Buffer): Promise<string> {
  // pdf-to-png-converter로 PDF를 PNG로 변환
  // Buffer를 ArrayBuffer로 변환 (타입 호환성)
  const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
  const pngPages = await pdfToPng(arrayBuffer, {
    viewportScale: 2.0, // 고해상도로 렌더링
    pagesToProcess: [1], // 첫 페이지만
  });

  const firstPage = pngPages[0];
  if (!firstPage?.content) {
    throw new Error('PDF를 이미지로 변환할 수 없습니다.');
  }

  // Buffer를 Base64로 변환
  const base64 = firstPage.content.toString('base64');
  return base64;
}
