// 유틸리티 함수 (OCR 결과 처리용)
export {
  groupWordsIntoRows,
  groupRowIntoColumns,
  calculateDynamicYThreshold,
  type ExtractedWord,
} from './visionClient';

// 일정 파싱
export {
  parseScheduleFromWords,
  toServiceScheduleInsert,
  normalizeDateString,
  detectColumnBoundaries,
  type ParsedSchedule,
  type ParseResult,
} from './parseScheduleTable';

// Clova OCR (한글 최적화)
export {
  isClovaOcrConfigured,
  extractTextWithClovaOcr,
  extractWordsWithClovaOcr,
  convertClovaResponseToWords,
  type ClovaOcrResponse,
  type ClovaOcrWord,
  type ClovaOcrField,
  type ExtractedWord as ClovaExtractedWord,
} from './clovaOcrClient';
