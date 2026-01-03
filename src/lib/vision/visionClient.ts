/**
 * Google Cloud Vision API 클라이언트
 * 이미지/PDF에서 텍스트를 추출합니다.
 */

export interface VisionTextAnnotation {
  description: string;
  boundingPoly: {
    vertices: Array<{ x: number; y: number }>;
  };
}

export interface VisionResponse {
  textAnnotations?: VisionTextAnnotation[];
  fullTextAnnotation?: {
    text: string;
    pages: Array<{
      blocks: Array<{
        paragraphs: Array<{
          words: Array<{
            symbols: Array<{
              text: string;
              boundingBox: {
                vertices: Array<{ x: number; y: number }>;
              };
            }>;
            boundingBox: {
              vertices: Array<{ x: number; y: number }>;
            };
          }>;
          boundingBox: {
            vertices: Array<{ x: number; y: number }>;
          };
        }>;
        boundingBox: {
          vertices: Array<{ x: number; y: number }>;
        };
      }>;
    }>;
  };
  error?: {
    code: number;
    message: string;
  };
}

export interface ExtractedWord {
  text: string;
  centerX: number;
  centerY: number;
  top: number;
  bottom: number;
  left: number;
  right: number;
}

/**
 * Google Cloud Vision API로 이미지에서 텍스트 추출
 */
export async function extractTextFromImage(
  imageBase64: string
): Promise<VisionResponse> {
  const apiKey = process.env.GOOGLE_CLOUD_VISION_API_KEY;

  if (!apiKey) {
    throw new Error('GOOGLE_CLOUD_VISION_API_KEY 환경변수가 설정되지 않았습니다.');
  }

  const response = await fetch(
    `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: [
          {
            image: {
              content: imageBase64,
            },
            features: [
              {
                type: 'DOCUMENT_TEXT_DETECTION',
                maxResults: 1,
              },
            ],
            imageContext: {
              languageHints: ['ko', 'en'],
            },
          },
        ],
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Vision API 오류: ${response.status} - ${errorText}`);
  }

  const data = await response.json();

  if (data.responses?.[0]?.error) {
    throw new Error(`Vision API 오류: ${data.responses[0].error.message}`);
  }

  return data.responses[0] || {};
}

/**
 * VisionResponse에서 단어별 위치 정보 추출
 */
export function extractWordsWithPositions(
  response: VisionResponse
): ExtractedWord[] {
  const words: ExtractedWord[] = [];

  // textAnnotations 사용 (첫 번째 항목은 전체 텍스트)
  const annotations = response.textAnnotations?.slice(1) || [];

  for (const annotation of annotations) {
    const vertices = annotation.boundingPoly.vertices;

    if (vertices.length >= 4) {
      const xs = vertices.map(v => v.x || 0);
      const ys = vertices.map(v => v.y || 0);

      const left = Math.min(...xs);
      const right = Math.max(...xs);
      const top = Math.min(...ys);
      const bottom = Math.max(...ys);

      words.push({
        text: annotation.description,
        centerX: (left + right) / 2,
        centerY: (top + bottom) / 2,
        top,
        bottom,
        left,
        right,
      });
    }
  }

  return words;
}

/**
 * 단어들의 평균 높이를 계산하여 동적 Y 임계값을 반환
 * OCR 프로바이더(Google Vision, Clova)에 따라 좌표 스케일이 다르므로
 * 고정 임계값 대신 텍스트 높이 기반 동적 계산이 필요함
 */
export function calculateDynamicYThreshold(words: ExtractedWord[]): number {
  if (words.length === 0) return 15; // 기본값

  // 각 단어의 높이 계산
  const heights = words
    .map((w) => w.bottom - w.top)
    .filter((h) => h > 0 && h < 500); // 비정상적인 값 제외

  if (heights.length === 0) return 15;

  // 평균 높이 계산
  const avgHeight = heights.reduce((sum, h) => sum + h, 0) / heights.length;

  // 중간값(median) 계산 (이상치에 더 강건함)
  const sortedHeights = [...heights].sort((a, b) => a - b);
  const medianHeight = sortedHeights[Math.floor(sortedHeights.length / 2)];

  // 더 작은 값 사용 (보수적 접근)
  const baseHeight = Math.min(avgHeight, medianHeight);

  // 임계값 = 텍스트 높이의 50~70% (같은 행 내 Y 변동 허용)
  // 최소 10px, 최대 100px로 제한
  const threshold = Math.max(10, Math.min(100, baseHeight * 0.6));

  return threshold;
}

/**
 * 단어들을 행(row)으로 그룹화
 * Y좌표 기준으로 같은 행에 있는 단어들을 묶음
 *
 * yThreshold가 제공되지 않으면 단어 높이 기반으로 동적 계산
 * (Google Vision, Clova OCR 등 다양한 좌표 스케일 지원)
 */
export function groupWordsIntoRows(
  words: ExtractedWord[],
  yThreshold?: number
): ExtractedWord[][] {
  if (words.length === 0) return [];

  // 동적 임계값 계산 (제공되지 않은 경우)
  const effectiveThreshold = yThreshold ?? calculateDynamicYThreshold(words);

  // Y좌표 기준 정렬
  const sorted = [...words].sort((a, b) => a.centerY - b.centerY);

  const rows: ExtractedWord[][] = [];
  let currentRow: ExtractedWord[] = [sorted[0]];
  let currentRowY = sorted[0].centerY;

  for (let i = 1; i < sorted.length; i++) {
    const word = sorted[i];

    // 현재 행과 Y좌표 차이가 threshold 이내면 같은 행
    if (Math.abs(word.centerY - currentRowY) <= effectiveThreshold) {
      currentRow.push(word);
    } else {
      // 새로운 행 시작
      // 현재 행을 X좌표 기준으로 정렬 후 저장
      currentRow.sort((a, b) => a.centerX - b.centerX);
      rows.push(currentRow);
      currentRow = [word];
      currentRowY = word.centerY;
    }
  }

  // 마지막 행 추가
  currentRow.sort((a, b) => a.centerX - b.centerX);
  rows.push(currentRow);

  return rows;
}

/**
 * 행의 단어들을 컬럼별로 그룹화
 * X좌표 경계를 기준으로 분리
 */
export function groupRowIntoColumns(
  rowWords: ExtractedWord[],
  columnBoundaries: number[]
): string[] {
  const columns: string[] = [];

  for (let i = 0; i < columnBoundaries.length - 1; i++) {
    const left = columnBoundaries[i];
    const right = columnBoundaries[i + 1];

    // 해당 컬럼 범위에 있는 단어들 필터
    const wordsInColumn = rowWords.filter(
      w => w.centerX >= left && w.centerX < right
    );

    // X좌표 순으로 정렬 후 합치기
    wordsInColumn.sort((a, b) => a.centerX - b.centerX);
    const text = wordsInColumn.map(w => w.text).join(' ').trim();
    columns.push(text);
  }

  return columns;
}
