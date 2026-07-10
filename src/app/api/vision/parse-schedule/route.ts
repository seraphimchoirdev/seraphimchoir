import { NextRequest, NextResponse } from 'next/server';

import { createLogger } from '@/lib/logger';
import { createClient } from '@/lib/supabase/server';
import {
  calculateDynamicYThreshold,
  detectColumnBoundaries,
  groupRowIntoColumns,
  groupWordsIntoRows,
  parseScheduleFromWords,
  toServiceScheduleInsert,
} from '@/lib/vision';
import {
  type ExtractedWord as ClovaExtractedWord,
  extractWordsWithClovaOcr,
  isClovaOcrConfigured,
} from '@/lib/vision/clovaOcrClient';
import { convertPdfToImage } from '@/lib/vision/pdfParser';

const logger = createLogger({ prefix: 'ParseScheduleAPI' });

// PDF → PNG 변환(pdf-to-png-converter)에 Node.js 런타임 필요 (Edge 불가)
export const runtime = 'nodejs';
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
      return NextResponse.json({ success: false, error: '인증이 필요합니다.' }, { status: 401 });
    }

    // 권한 확인 (ADMIN, CONDUCTOR, MANAGER, PART_LEADER)
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const allowedRoles = ['ADMIN', 'CONDUCTOR', 'MANAGER', 'PART_LEADER'];
    if (!profile?.role || !allowedRoles.includes(profile.role)) {
      return NextResponse.json({ success: false, error: '권한이 없습니다.' }, { status: 403 });
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
      return NextResponse.json({ success: false, error: '파일이 필요합니다.' }, { status: 400 });
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

    // OCR에 넘길 base64 이미지와 포맷 결정
    let base64: string;
    let imageFormat: 'jpg' | 'png';
    const isPdf = pdfTypes.includes(file.type);

    if (isPdf) {
      // PDF 처리: 텍스트/스캔 구분 없이 이미지로 변환 후 Clova OCR 좌표 파서로 통일.
      // unpdf 텍스트 추출은 표의 컬럼 좌표를 잃어버려(한 줄로 합쳐짐) 파싱이 불가능하므로
      // PDF를 PNG로 렌더링해 이미지 파일과 동일한 OCR 파이프라인을 태운다.
      logger.debug('=== PDF 파일 처리 (이미지 변환 → OCR) ===');
      try {
        base64 = await convertPdfToImage(buffer);
        imageFormat = 'png';
        logger.debug('PDF → PNG 변환 성공');
      } catch (conversionError) {
        // 일부 서버리스 환경에서 PDF 렌더링 네이티브 의존성이 없을 수 있음 → 안내 폴백
        logger.error('PDF 이미지 변환 실패:', conversionError);
        return NextResponse.json(
          {
            success: false,
            error:
              'PDF를 처리할 수 없습니다. PDF 파일을 열어 스크린샷을 찍거나 이미지(PNG/JPG)로 내보내기 후 업로드해주세요.',
            data: [],
            errors: ['PDF 변환에 실패했습니다. 이미지 파일로 업로드해주세요.'],
            warnings: [],
          },
          { status: 400 }
        );
      }
    } else {
      // 이미지 파일 처리
      base64 = buffer.toString('base64');
      imageFormat = file.type.includes('png')
        ? 'png'
        : file.type.includes('webp')
          ? 'png' // webp는 png로 처리
          : 'jpg';
    }

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
        source: isPdf ? 'pdf-image-ocr' : 'clova-ocr',
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

    const message = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';

    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
