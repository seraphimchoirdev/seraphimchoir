import Papa from 'papaparse';

import { NextRequest, NextResponse } from 'next/server';

import { createLogger } from '@/lib/logger';
import { createClient } from '@/lib/supabase/server';
import {
  type ExtractedWord as ClovaExtractedWord,
  extractWordsWithClovaOcr,
  isClovaOcrConfigured,
} from '@/lib/vision/clovaOcrClient';
import { extractTextFromPdf, isPdfTextBased } from '@/lib/vision/pdfParser';

const logger = createLogger({ prefix: 'PrayerParseFile' });

export const maxDuration = 60;

interface ParsedPrayerRow {
  date: string;
  prayer_names: string;
  gown_part: string;
  valid: boolean;
  errors: string[];
}

// 날짜 패턴 매칭
const DATE_PATTERNS = [
  // M/D, M월D일 형식
  /(\d{1,2})\s*[\/월.]\s*(\d{1,2})\s*일?/,
  // YYYY-MM-DD, YYYY/MM/DD
  /(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/,
];

const GOWN_PARTS = ['소프라노', '알토', '테너', '베이스'];
const GOWN_ALIASES: Record<string, string> = {
  S: '소프라노', 소프: '소프라노', soprano: '소프라노',
  A: '알토', alto: '알토',
  T: '테너', tenor: '테너',
  B: '베이스', bass: '베이스', 바스: '베이스',
};

function normalizeGownPart(text: string): string {
  const trimmed = text.trim();
  if (GOWN_PARTS.includes(trimmed)) return trimmed;
  return GOWN_ALIASES[trimmed] || GOWN_ALIASES[trimmed.toUpperCase()] || '';
}

function extractDate(text: string, year: number): string | null {
  // YYYY-MM-DD 형식 먼저 시도
  const fullMatch = text.match(/(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/);
  if (fullMatch) {
    const [, y, m, d] = fullMatch;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // M/D, M월D일 형식
  const shortMatch = text.match(/(\d{1,2})\s*[\/월.]\s*(\d{1,2})\s*일?/);
  if (shortMatch) {
    const [, m, d] = shortMatch;
    return `${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  return null;
}

// 행사/주석 키워드 — 이름이 아닌 텍스트를 제거하기 위한 패턴
const EVENT_KEYWORDS = [
  '신년예배', '신년새벽', '새벽기도', '저녁찬양', '오후찬양',
  '성탄예배', '부활절', '추수감사', '송구영신', '절기예배',
  '기도회', '특별예배', '연합예배', '새벽', '저녁',
];

/**
 * 줄에서 날짜 부분과 괄호 주석, 행사 키워드를 제거하고 이름 텍스트만 추출
 */
function extractNamesFromLine(line: string): string {
  let rest = line;
  // YYYY-MM-DD 제거
  rest = rest.replace(/\d{4}[-\/]\d{1,2}[-\/]\d{1,2}/, '').trim();
  // M/D 날짜 제거 (단, 이름 사이 슬래시와 구분하기 위해 줄 시작 부분만)
  rest = rest.replace(/^\s*\d{1,2}\s*\/\s*\d{1,2}\s*/, '').trim();
  // 괄호 안 주석 제거 (신년예배, 저녁찬양, 신년새벽 등)
  rest = rest.replace(/\([^)]*\)/g, '').trim();
  // 요일 단독 제거
  rest = rest.replace(/^[일월화수목금토]$/, '').trim();
  // 행사/주석 키워드 제거
  for (const kw of EVENT_KEYWORDS) {
    rest = rest.replace(new RegExp(kw, 'g'), '').trim();
  }

  return rest;
}

/**
 * 이름 텍스트를 정리하여 "이름/이름" 형식으로 반환
 */
function cleanPrayerNames(raw: string): string {
  let names = raw
    // 구분자 통일
    .replace(/[,;·•|]/g, '/');

  // 공백으로 된 한국 이름 구분 → 슬래시 (반복 적용하여 3명 이상도 처리)
  let prev = '';
  while (prev !== names) {
    prev = names;
    names = names.replace(/([가-힣]{2,4})\s+([가-힣]{2,4})/g, '$1/$2');
  }

  names = names
    // 연속 슬래시/공백 정리
    .replace(/\/+/g, '/')
    .replace(/^\s*\/|\/\s*$/g, '')
    .trim();

  return names;
}

/**
 * 텍스트를 날짜 패턴 기준으로 분할하여 [날짜, 이름텍스트] 쌍 배열로 변환.
 * PDF 추출 시 줄바꿈이 없이 한 줄로 합쳐지는 경우도 처리.
 *
 * 예: "1 /1 김택훈 1 /4 송혁진 김보미/" →
 *   [["1/1", "김택훈"], ["1/4", "송혁진 김보미/"]]
 */
function splitByDatePattern(text: string): Array<{ dateToken: string; rest: string }> {
  // 공백이 포함된 날짜 패턴 정규화: "1 /1" → "1/1", "2 /8" → "2/8"
  const normalized = text.replace(/(\d{1,2})\s*\/\s*(\d{1,2})/g, '$1/$2');

  // 날짜 패턴으로 분할: M/D 또는 YYYY-MM-DD 위치를 찾아 자름
  const dateRegex = /(?:\d{4}[-\/]\d{1,2}[-\/]\d{1,2}|\d{1,2}\/\d{1,2})/g;
  const matches: Array<{ index: number; token: string }> = [];
  let m: RegExpExecArray | null;
  while ((m = dateRegex.exec(normalized)) !== null) {
    matches.push({ index: m.index, token: m[0] });
  }

  if (matches.length === 0) return [];

  const segments: Array<{ dateToken: string; rest: string }> = [];
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index + matches[i].token.length;
    const end = i + 1 < matches.length ? matches[i + 1].index : normalized.length;
    segments.push({
      dateToken: matches[i].token,
      rest: normalized.substring(start, end).trim(),
    });
  }

  return segments;
}

/**
 * OCR 텍스트에서 기도 담당 행을 파싱.
 * 줄바꿈이 있는 경우와 없는 경우(한 줄로 합쳐진 PDF) 모두 처리.
 */
function parsePrayerText(text: string, year: number): ParsedPrayerRow[] {
  const lines = text.split('\n').filter(l => l.trim());
  const results: ParsedPrayerRow[] = [];

  // 여러 줄이면 줄 단위로 처리, 한 줄이면 날짜 패턴으로 분할
  const segments: Array<{ dateToken: string; rest: string }> = [];

  if (lines.length <= 2) {
    // 한 줄(또는 제목+본문)로 합쳐진 경우 → 날짜 패턴 기준 분할
    segments.push(...splitByDatePattern(text));
  } else {
    // 여러 줄인 경우: 줄 단위로 처리 (기존 로직)
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const date = extractDate(line, year);
      if (!date) continue;

      let nameText = extractNamesFromLine(line);

      // 이름이 없으면 다음 줄에서 가져옴
      if (!nameText && i + 1 < lines.length) {
        const nextLine = lines[i + 1];
        if (!extractDate(nextLine, year)) {
          nameText = extractNamesFromLine(nextLine);
          i++;
        }
      }

      // dateToken은 원본 날짜 텍스트가 아닌 추출된 날짜이므로 변환
      segments.push({ dateToken: date, rest: nameText });
    }
  }

  for (const seg of segments) {
    const date = extractDate(seg.dateToken, year);
    if (!date) continue;

    let nameText = extractNamesFromLine(seg.rest);

    // 가운 파트 추출
    let gownPart = '';
    for (const part of GOWN_PARTS) {
      if (nameText.includes(part)) {
        gownPart = part;
        nameText = nameText.replace(part, '').trim();
        break;
      }
    }
    if (!gownPart) {
      for (const [alias, part] of Object.entries(GOWN_ALIASES)) {
        const regex = new RegExp(`\\b${alias}\\b`, 'i');
        if (regex.test(nameText)) {
          gownPart = part;
          nameText = nameText.replace(regex, '').trim();
          break;
        }
      }
    }

    const prayerNames = cleanPrayerNames(nameText);

    const errors: string[] = [];
    if (!prayerNames) errors.push('기도자 이름을 인식할 수 없습니다');

    results.push({
      date,
      prayer_names: prayerNames,
      gown_part: gownPart,
      valid: errors.length === 0,
      errors,
    });
  }

  return results;
}

/**
 * OCR 단어 목록에서 기도 담당 행을 파싱 (이미지용)
 */
function parsePrayerFromWords(words: ClovaExtractedWord[], year: number): ParsedPrayerRow[] {
  // Y 좌표 기준으로 행 그룹화
  const sorted = [...words].sort((a, b) => a.top - b.top);
  const rows: ClovaExtractedWord[][] = [];
  let currentRow: ClovaExtractedWord[] = [];
  let currentY = -Infinity;

  for (const word of sorted) {
    const yCenter = (word.top + word.bottom) / 2;
    if (currentRow.length === 0 || Math.abs(yCenter - currentY) < (word.bottom - word.top) * 0.6) {
      currentRow.push(word);
      currentY = (currentY * (currentRow.length - 1) + yCenter) / currentRow.length;
    } else {
      rows.push(currentRow);
      currentRow = [word];
      currentY = yCenter;
    }
  }
  if (currentRow.length > 0) rows.push(currentRow);

  // 각 행을 왼→오른 정렬 후 텍스트로 합침
  const lines = rows.map(row => {
    const sortedRow = row.sort((a, b) => a.left - b.left);
    return sortedRow.map(w => w.text).join(' ');
  });

  return parsePrayerText(lines.join('\n'), year);
}

/**
 * CSV/Excel 데이터 파싱
 */
function parseSpreadsheetRows(rawData: Record<string, string>[], year: number, quarter: string): ParsedPrayerRow[] {
  return rawData.map(row => {
    const dateRaw = row['date'] || row['날짜'] || row['Date'] || '';
    const prayerNames = (row['prayer_names'] || row['기도자'] || row['기도담당'] || row['이름'] || '').trim();
    const gownPartRaw = (row['gown_part'] || row['가운파트'] || row['가운'] || row['파트'] || '').trim();

    const date = extractDate(dateRaw, year);
    const gownPart = normalizeGownPart(gownPartRaw);
    const errors: string[] = [];

    if (!date) errors.push(`날짜 인식 불가: ${dateRaw}`);
    if (!prayerNames) errors.push('기도자 이름이 비어있습니다');

    return {
      date: date || '',
      prayer_names: prayerNames,
      gown_part: gownPart,
      valid: errors.length === 0,
      errors,
    };
  });
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || !['ADMIN', 'SECRETARY'].includes(profile.role || '')) {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const yearStr = formData.get('year') as string | null;
    const quarterStr = formData.get('quarter') as string | null;

    if (!file) {
      return NextResponse.json({ error: '파일이 필요합니다.' }, { status: 400 });
    }

    const year = yearStr ? parseInt(yearStr, 10) : new Date().getFullYear();
    const quarter = quarterStr || `${year}-Q${Math.ceil((new Date().getMonth() + 1) / 3)}`;

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json({ error: '파일 크기는 10MB를 초과할 수 없습니다.' }, { status: 400 });
    }

    const ext = file.name.split('.').pop()?.toLowerCase();
    let results: ParsedPrayerRow[] = [];

    // CSV
    if (ext === 'csv') {
      const text = await file.text();
      const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
      results = parseSpreadsheetRows(parsed.data as Record<string, string>[], year, quarter);
    }
    // Excel
    else if (ext === 'xlsx' || ext === 'xls') {
      const XLSX = await import('xlsx');
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(sheet, { defval: '' });
      results = parseSpreadsheetRows(jsonData as Record<string, string>[], year, quarter);
    }
    // PDF
    else if (ext === 'pdf' || file.type === 'application/pdf') {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const isTextBased = await isPdfTextBased(buffer);
      if (isTextBased) {
        const pdfText = await extractTextFromPdf(buffer);
        logger.debug('PDF 텍스트 추출:', pdfText.substring(0, 500));
        results = parsePrayerText(pdfText, year);
      } else {
        return NextResponse.json(
          { error: '스캔된 PDF입니다. 이미지(PNG/JPG)로 변환 후 업로드해주세요.' },
          { status: 400 },
        );
      }
    }
    // 이미지 (Clova OCR)
    else if (['png', 'jpg', 'jpeg', 'webp'].includes(ext || '')) {
      if (!isClovaOcrConfigured()) {
        return NextResponse.json(
          { error: 'Clova OCR이 설정되지 않았습니다.' },
          { status: 400 },
        );
      }

      const arrayBuffer = await file.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString('base64');
      const imageFormat = file.type.includes('png') ? 'png' : 'jpg';

      const words = await extractWordsWithClovaOcr(base64, imageFormat);
      logger.debug(`OCR 단어 수: ${words.length}`);

      if (words.length === 0) {
        return NextResponse.json(
          { error: '이미지에서 텍스트를 찾을 수 없습니다.' },
          { status: 200 },
        );
      }

      results = parsePrayerFromWords(words, year);
    }
    else {
      return NextResponse.json(
        { error: 'CSV, Excel, PDF, 이미지(PNG, JPG) 파일만 지원합니다.' },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      data: results,
      total: results.length,
      valid: results.filter(r => r.valid).length,
      invalid: results.filter(r => !r.valid).length,
    });
  } catch (error) {
    logger.error('기도 담당 파일 파싱 오류:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '파일 파싱에 실패했습니다.' },
      { status: 500 },
    );
  }
}
