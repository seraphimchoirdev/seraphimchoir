import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createLogger } from '@/lib/logger';

const logger = createLogger({ prefix: 'ParseScheduleAPI' });
import {
  parseScheduleFromWords,
  toServiceScheduleInsert,
  groupWordsIntoRows,
  groupRowIntoColumns,
  detectColumnBoundaries,
  calculateDynamicYThreshold,
} from '@/lib/vision';
import {
  extractTextFromPdf,
  isPdfTextBased,
  parseScheduleFromPdfText,
} from '@/lib/vision/pdfParser';
import {
  isClovaOcrConfigured,
  extractWordsWithClovaOcr,
  type ExtractedWord as ClovaExtractedWord,
} from '@/lib/vision/clovaOcrClient';

export const maxDuration = 60; // 60초 타임아웃

/**
 * POST /api/vision/parse-schedule
 *
 * 이미지 또는 PDF 파일을 받아 Clova OCR로 텍스트를 추출하고,
 * 파싱하여 예배 일정 데이터로 반환합니다.
 *
 * OCR 엔진: Naver Clova OCR (한글 인식 최적화, ICDAR2019 1위)
 *
 * PDF 파일:
 * - 텍스트 기반 PDF: 직접 텍스트 추출 (100% 정확도)
 * - 스캔 PDF: 이미지로 변환 후 업로드 안내
 *
 * Request Body (FormData):
 * - file: 이미지/PDF 파일 (PNG, JPG, JPEG, WebP, PDF)
 * - year: 연도 (optional, 기본값: 현재 연도)
 *
 * Response:
 * - success: boolean
 * - data: ParsedSchedule[] (추출된 일정 목록)
 * - errors: string[] (에러 메시지)
 * - warnings: string[] (경고 메시지)
 */
export async function POST(request: NextRequest) {
  try {
    // 인증 확인
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    // 권한 확인 (ADMIN, CONDUCTOR, MANAGER, PART_LEADER)
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const allowedRoles = ['ADMIN', 'CONDUCTOR', 'MANAGER', 'PART_LEADER'];
    if (!profile?.role || !allowedRoles.includes(profile.role)) {
      return NextResponse.json(
        { success: false, error: '권한이 없습니다.' },
        { status: 403 }
      );
    }

    // FormData 파싱
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const yearStr = formData.get('year') as string | null;

    // Clova OCR 설정 확인
    if (!isClovaOcrConfigured()) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Clova OCR이 설정되지 않았습니다. CLOVA_OCR_INVOKE_URL과 CLOVA_OCR_SECRET_KEY 환경변수를 설정해주세요.',
        },
        { status: 400 }
      );
    }

    if (!file) {
      return NextResponse.json(
        { success: false, error: '파일이 필요합니다.' },
        { status: 400 }
      );
    }

    // 파일 타입 확인 (이미지 + PDF)
    const imageTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    const pdfTypes = ['application/pdf'];
    const allowedTypes = [...imageTypes, ...pdfTypes];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        {
          success: false,
          error: `지원하지 않는 파일 형식입니다. (지원: PNG, JPG, JPEG, WebP, PDF)`,
        },
        { status: 400 }
      );
    }

    // 파일 크기 확인 (10MB 제한)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, error: '파일 크기는 10MB를 초과할 수 없습니다.' },
        { status: 400 }
      );
    }

    // 연도 파싱 (기본값: 현재 연도)
    const year = yearStr ? parseInt(yearStr, 10) : new Date().getFullYear();
    if (isNaN(year) || year < 2000 || year > 2100) {
      return NextResponse.json(
        { success: false, error: '유효하지 않은 연도입니다.' },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // PDF 파일 처리
    if (pdfTypes.includes(file.type)) {
      logger.debug('=== PDF 파일 처리 ===');

      // 텍스트 기반 PDF인지 확인
      const isTextBased = await isPdfTextBased(buffer);
      logger.debug('텍스트 기반 PDF:', isTextBased);

      if (isTextBased) {
        // 텍스트 직접 추출 (OCR 불필요, 100% 정확도)
        const pdfText = await extractTextFromPdf(buffer);
        logger.debug('추출된 텍스트 (처음 1000자):', pdfText.substring(0, 1000));

        const parseResult = parseScheduleFromPdfText(pdfText, year);
        const schedules = parseResult.schedules.map(toServiceScheduleInsert);

        return NextResponse.json({
          success: parseResult.success,
          data: schedules,
          rawSchedules: parseResult.schedules,
          errors: parseResult.errors,
          warnings: parseResult.warnings,
          debug: {
            source: 'pdf-text',
            year,
            textLength: pdfText.length,
          },
        });
      } else {
        // 스캔된 PDF - 이미지로 변환 필요
        // PDF 이미지 변환 라이브러리가 Next.js 환경과 호환성 문제가 있어 비활성화
        logger.debug('스캔된 PDF 감지 - 이미지 변환 안내');
        return NextResponse.json(
          {
            success: false,
            error:
              '스캔된 PDF 파일입니다. PDF 파일을 열어 스크린샷을 찍거나 "미리보기" 앱에서 이미지로 내보내기 후 PNG/JPG 파일로 업로드해주세요.',
            data: [],
            errors: ['스캔된 PDF는 이미지로 변환 후 업로드해주세요.'],
            warnings: [],
          },
          { status: 400 }
        );
      }
    }

    // 이미지 파일 처리
    const base64 = buffer.toString('base64');

    // 이미지 포맷 결정
    const imageFormat = file.type.includes('png')
      ? 'png'
      : file.type.includes('webp')
        ? 'png' // webp는 png로 처리
        : 'jpg';

    logger.debug('=== Clova OCR 처리 ===');

    // Clova OCR로 단어 추출
    // centerX, centerY 포함 - groupWordsIntoRows()에서 사용
    logger.debug('Clova OCR API 호출...');
    const clovaWords = await extractWordsWithClovaOcr(base64, imageFormat);
    const words = clovaWords.map((w: ClovaExtractedWord) => ({
      text: w.text,
      left: w.left,
      top: w.top,
      right: w.right,
      bottom: w.bottom,
      centerX: w.centerX,
      centerY: w.centerY,
    }));
    logger.debug(`Clova OCR 추출 단어 수: ${words.length}`);

    if (words.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: '이미지에서 텍스트를 찾을 수 없습니다.',
          data: [],
          errors: ['이미지에서 텍스트를 추출할 수 없습니다.'],
          warnings: [],
        },
        { status: 200 }
      );
    }

    // 이미지 크기 추정
    const maxX = Math.max(...words.map((w) => w.right));
    const imageWidth = Math.max(maxX + 100, 1500);

    // 동적 Y 임계값 계산 (OCR 프로바이더 스케일에 자동 적응)
    const dynamicYThreshold = calculateDynamicYThreshold(words);
    logger.debug(`동적 Y 임계값: ${dynamicYThreshold.toFixed(1)}px`);

    // 디버깅: 행과 컬럼 추출 결과 확인
    // 동적 임계값 사용 (yThreshold 파라미터 생략)
    const rows = groupWordsIntoRows(words);
    const columnBoundaries = detectColumnBoundaries(rows, imageWidth);

    // 첫 10개 행의 컬럼 데이터 로깅
    const sampleRows = rows.slice(0, 10).map((row, idx) => {
      const columns = groupRowIntoColumns(row, columnBoundaries);
      return {
        rowIndex: idx,
        columns,
        rawWords: row.map((w) => w.text).join(' | '),
      };
    });

    logger.debug('이미지 너비:', imageWidth);
    logger.debug('행 수:', rows.length);
    logger.debug('컬럼 경계:', columnBoundaries);
    logger.debug('샘플 행 데이터:', JSON.stringify(sampleRows, null, 2));

    // 파싱
    const parseResult = parseScheduleFromWords(words, year, imageWidth);

    // ServiceScheduleInsert 형식으로 변환
    const schedules = parseResult.schedules.map(toServiceScheduleInsert);

    return NextResponse.json({
      success: parseResult.success,
      data: schedules,
      rawSchedules: parseResult.schedules,
      errors: parseResult.errors,
      warnings: parseResult.warnings,
      debug: {
        source: 'clova-ocr',
        ocrProvider: 'clova',
        wordCount: words.length,
        imageWidth,
        year,
        dynamicYThreshold: Math.round(dynamicYThreshold * 10) / 10,
        rowCount: rows.length,
        columnBoundaries,
        sampleRows,
      },
    });
  } catch (error) {
    logger.error('파일 처리 오류:', error);

    const message =
      error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
