/**
 * Naver Clova OCR API 클라이언트
 *
 * Clova OCR은 한글 인식에 최적화된 OCR 서비스입니다.
 * ICDAR2019 글로벌 OCR 챌린지 4개 부문 1위 달성.
 *
 * 환경변수:
 * - CLOVA_OCR_INVOKE_URL: OCR 도메인 Invoke URL
 * - CLOVA_OCR_SECRET_KEY: OCR Secret Key
 *
 * 참고: https://api.ncloud-docs.com/docs/ai-application-service-ocr
 */

export interface ClovaOcrWord {
  text: string;
  boundingPoly: {
    vertices: Array<{ x: number; y: number }>;
  };
  inferConfidence: number;
}

export interface ClovaOcrField {
  inferText: string;
  inferConfidence: number;
  boundingPoly: {
    vertices: Array<{ x: number; y: number }>;
  };
  lineBreak: boolean;
}

export interface ClovaOcrImage {
  uid: string;
  name: string;
  inferResult: 'SUCCESS' | 'FAILURE' | 'ERROR';
  message: string;
  validationResult?: {
    result: string;
  };
  fields?: ClovaOcrField[];
}

export interface ClovaOcrResponse {
  version: string;
  requestId: string;
  timestamp: number;
  images: ClovaOcrImage[];
}

/**
 * Clova OCR API 설정 확인
 */
export function isClovaOcrConfigured(): boolean {
  return !!(process.env.CLOVA_OCR_INVOKE_URL && process.env.CLOVA_OCR_SECRET_KEY);
}

/**
 * Clova OCR API로 이미지에서 텍스트 추출
 *
 * @param base64Image - Base64 인코딩된 이미지 데이터
 * @param format - 이미지 포맷 (jpg, png, pdf, tiff)
 * @returns Clova OCR 응답
 */
export async function extractTextWithClovaOcr(
  base64Image: string,
  format: 'jpg' | 'png' | 'pdf' | 'tiff' = 'png'
): Promise<ClovaOcrResponse> {
  const invokeUrl = process.env.CLOVA_OCR_INVOKE_URL;
  const secretKey = process.env.CLOVA_OCR_SECRET_KEY;

  if (!invokeUrl || !secretKey) {
    throw new Error(
      'Clova OCR 환경변수가 설정되지 않았습니다. CLOVA_OCR_INVOKE_URL과 CLOVA_OCR_SECRET_KEY를 설정해주세요.'
    );
  }

  const requestBody = {
    version: 'V2',
    requestId: `req-${Date.now()}`,
    timestamp: Date.now(),
    lang: 'ko', // 한국어 우선
    images: [
      {
        format: format,
        name: 'schedule-image',
        data: base64Image,
      },
    ],
  };

  const response = await fetch(invokeUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-OCR-SECRET': secretKey,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Clova OCR API 오류: ${response.status} - ${errorText}`);
  }

  const result: ClovaOcrResponse = await response.json();

  // 결과 검증
  if (result.images.length === 0) {
    throw new Error('Clova OCR: 이미지 처리 결과가 없습니다.');
  }

  const imageResult = result.images[0];
  if (imageResult.inferResult !== 'SUCCESS') {
    throw new Error(`Clova OCR 인식 실패: ${imageResult.message || '알 수 없는 오류'}`);
  }

  return result;
}

/**
 * Clova OCR 응답에서 ExtractedWord 형식으로 변환
 * (기존 Vision API 파싱 로직과 호환)
 *
 * centerX, centerY 추가: groupWordsIntoRows() 함수에서 필요
 */
export interface ExtractedWord {
  text: string;
  left: number;
  top: number;
  right: number;
  bottom: number;
  centerX: number;
  centerY: number;
  confidence: number;
}

export function convertClovaResponseToWords(response: ClovaOcrResponse): ExtractedWord[] {
  const words: ExtractedWord[] = [];

  for (const image of response.images) {
    if (image.inferResult !== 'SUCCESS' || !image.fields) continue;

    for (const field of image.fields) {
      const vertices = field.boundingPoly.vertices;

      // vertices: [topLeft, topRight, bottomRight, bottomLeft]
      const xs = vertices.map((v) => v.x);
      const ys = vertices.map((v) => v.y);

      const left = Math.min(...xs);
      const top = Math.min(...ys);
      const right = Math.max(...xs);
      const bottom = Math.max(...ys);

      words.push({
        text: field.inferText,
        left,
        top,
        right,
        bottom,
        centerX: (left + right) / 2,
        centerY: (top + bottom) / 2,
        confidence: field.inferConfidence,
      });
    }
  }

  return words;
}

/**
 * Clova OCR로 이미지에서 단어 추출 (통합 함수)
 */
export async function extractWordsWithClovaOcr(
  base64Image: string,
  format: 'jpg' | 'png' | 'pdf' | 'tiff' = 'png'
): Promise<ExtractedWord[]> {
  const response = await extractTextWithClovaOcr(base64Image, format);
  return convertClovaResponseToWords(response);
}
