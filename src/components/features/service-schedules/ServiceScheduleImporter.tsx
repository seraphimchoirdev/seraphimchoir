'use client';

import {
  AlertCircle,
  CheckCircle,
  Download,
  Image as ImageIcon,
  Loader2,
  Pencil,
  Trash2,
  Upload,
  XCircle,
} from 'lucide-react';
import Papa from 'papaparse';

import { Fragment, useEffect, useMemo, useRef, useState } from 'react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
// xlsx는 동적 임포트로 변경 (312K 번들 분리)
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { useBulkUpsertServiceSchedules } from '@/hooks/useServiceSchedules';

import { createLogger } from '@/lib/logger';
import {
  CUSTOM_SERVICE_TYPE,
  SERVICE_TYPE_OPTIONS,
  isPresetServiceType,
} from '@/lib/service-time';
import { showError, showWarning } from '@/lib/toast';

const logger = createLogger({ prefix: 'ScheduleImporter' });

/** 업로드 결과를 읽을 시간을 준 뒤 목록으로 되돌아가기까지의 대기 시간 */
const AUTO_EXIT_DELAY_MS = 2000;

/**
 * 행의 안정적인 식별자를 만든다.
 *
 * 배열 인덱스는 위치일 뿐 정체성이 아니다. 행을 삭제하면 뒤쪽 행들의 인덱스가
 * 모두 한 칸씩 당겨지므로, 인덱스로 "편집 중인 행"을 가리키면 삭제 한 번에
 * 엉뚱한 행이 열린다. 파싱 시점에 한 번 부여하고 그 뒤로 바뀌지 않는 값을 쓴다.
 *
 * crypto.randomUUID는 보안 컨텍스트(https·localhost)에서만 있으므로 폴백을 둔다.
 * 여기서 필요한 건 암호학적 강도가 아니라 한 화면 안에서의 유일성뿐이다.
 */
let rowIdCounter = 0;
function createRowId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  rowIdCounter += 1;
  return `row-${Date.now()}-${rowIdCounter}`;
}

// 파싱된 예배 일정 타입
interface ParsedSchedule {
  /** 행의 안정적 식별자. 삭제·정렬로 위치가 바뀌어도 유지된다. */
  id: string;
  date: string;
  service_type: string;
  hymn_name: string;
  offertory_performer: string;
  notes: string;
  // 신규 필드 (이미지 파싱용)
  hood_color?: string;
  composer?: string;
  music_source?: string;
  valid: boolean;
  errors: string[];
}

/**
 * 저장 가능한 행인지 판정한다.
 *
 * ParsedSchedule.valid는 파싱 시점에 한 번 계산되어 그대로 굳는다. 인라인 편집으로
 * 날짜를 지우거나 예배 유형을 비워도 그 플래그는 true로 남아 있어서, 화면의 초록
 * 체크와 실제 저장 가능 여부가 어긋난다.
 *
 * 특히 예배 유형은 '기타'를 고르면 의도적으로 빈 문자열이 된다(직접 입력을 받기
 * 위해서다). 사용자가 입력칸을 채우지 않고 저장하면 예배 유형 없는 일정이
 * 만들어지는데, date+service_type이 중복 판정 키라 이후 upsert 동작까지 어그러진다.
 *
 * 저장 직전에 현재 값으로 다시 판정해서 그 경로를 막는다.
 */
function getRowErrors(item: ParsedSchedule): string[] {
  const errors: string[] = [];
  if (!item.date) {
    errors.push('날짜가 비어있습니다');
  } else if (!isValidDate(item.date)) {
    errors.push(`잘못된 날짜 형식: ${item.date}`);
  }
  if (!item.service_type.trim()) {
    errors.push('예배 유형을 입력해주세요');
  }
  return errors;
}

// 이미지 파일인지 확인
function isImageFile(file: File): boolean {
  const imageTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
  return imageTypes.includes(file.type);
}

// PDF 파일인지 확인
function isPdfFile(file: File): boolean {
  return file.type === 'application/pdf';
}

// Vision API로 처리해야 하는 파일인지 확인 (이미지 또는 PDF)
function isVisionFile(file: File): boolean {
  return isImageFile(file) || isPdfFile(file);
}

// 검증 결과 타입
interface ValidationResult {
  valid: boolean;
  data: ParsedSchedule[];
  errors: Array<{ row: number; message: string }>;
}

interface ServiceScheduleImporterProps {
  /** 업로드가 성공했을 때. 호출부가 목록 갱신·화면 이동 등 다음 동작을 정한다. */
  onSuccess?: () => void;
  /** 사용자가 작업을 그만둘 때(취소·닫기). 페이지에서는 목록으로 되돌아간다. */
  onCancel?: () => void;
}

/**
 * 날짜 형식 검증 (YYYY-MM-DD)
 */
function isValidDate(dateStr: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const date = new Date(dateStr);
  return !isNaN(date.getTime());
}

/**
 * 날짜 형식 정규화 (여러 형식 지원)
 */
function normalizeDate(dateStr: string): string {
  if (!dateStr) return '';

  // 이미 YYYY-MM-DD 형식인 경우
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;

  // YYYY/MM/DD 형식
  if (/^\d{4}\/\d{2}\/\d{2}$/.test(dateStr)) {
    return dateStr.replace(/\//g, '-');
  }

  // MM/DD/YYYY 형식 (미국식)
  const usMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (usMatch) {
    const [, month, day, year] = usMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  // Excel 숫자 날짜 (시리얼 날짜)
  if (/^\d+$/.test(dateStr)) {
    const excelDate = parseInt(dateStr);
    const date = new Date((excelDate - 25569) * 86400 * 1000);
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  return dateStr;
}

/**
 * CSV/Excel 데이터 파싱 및 검증
 */
function parseAndValidateData(rawData: Record<string, string>[]): ValidationResult {
  const errors: Array<{ row: number; message: string }> = [];
  const data: ParsedSchedule[] = [];

  rawData.forEach((row, index) => {
    const rowNumber = index + 2; // 헤더 제외
    const rowErrors: string[] = [];

    // 날짜 정규화
    const dateRaw = row['date'] || row['날짜'] || row['Date'] || '';
    const date = normalizeDate(dateRaw.trim());

    // 예배 유형
    const serviceType = (
      row['service_type'] ||
      row['예배유형'] ||
      row['Service Type'] ||
      '주일 2부 예배'
    ).trim();

    // 찬양곡명
    const hymnName = (row['hymn_name'] || row['찬양곡명'] || row['Hymn Name'] || '').trim();

    // 봉헌송 연주자
    const offertoryPerformer = (
      row['offertory_performer'] ||
      row['봉헌송연주자'] ||
      row['Offertory Performer'] ||
      ''
    ).trim();

    // 비고
    const notes = (row['notes'] || row['비고'] || row['Notes'] || '').trim();

    // 검증
    if (!date) {
      rowErrors.push('날짜가 비어있습니다');
    } else if (!isValidDate(date)) {
      rowErrors.push(`잘못된 날짜 형식: ${dateRaw}`);
    }

    const isValid = rowErrors.length === 0;
    if (!isValid) {
      errors.push({ row: rowNumber, message: rowErrors.join(', ') });
    }

    data.push({
      id: createRowId(),
      date,
      service_type: serviceType,
      hymn_name: hymnName,
      offertory_performer: offertoryPerformer,
      notes,
      valid: isValid,
      errors: rowErrors,
    });
  });

  return {
    valid: errors.length === 0,
    data,
    errors,
  };
}

/**
 * CSV 템플릿 생성
 */
function generateTemplate(): string {
  const headers = ['날짜', '예배유형', '찬양곡명', '봉헌송연주자', '비고'];
  const exampleRows = [
    ['2025-01-05', '주일 2부 예배', '나 같은 죄인 살리신', '홍길동 (피아노)', '새해 첫 예배'],
    ['2025-01-12', '주일 2부 예배', '주 하나님 지으신 모든 세계', '', ''],
    ['2025-01-15', '새벽기도회', '새벽기도회 찬양', '', '특별새벽기도회'],
  ];

  const csvContent = [headers, ...exampleRows]
    .map((row) => row.map((cell) => `"${cell}"`).join(','))
    .join('\n');

  return '\uFEFF' + csvContent; // BOM for Excel compatibility
}

/**
 * 파일 다운로드
 */
function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function ServiceScheduleImporter({
  onSuccess,
  onCancel,
}: ServiceScheduleImporterProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedSchedule[]>([]);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadResult, setUploadResult] = useState<{
    success: boolean;
    total: number;
    succeeded: number;
    failed: number;
    error?: string;
  } | null>(null);

  const bulkUpsertMutation = useBulkUpsertServiceSchedules();

  /**
   * 지금 편집 패널이 열려 있는 행의 id.
   *
   * OCR 결과는 대부분 맞고 실제로 고치는 건 2~5행뿐이라, 모든 칸을 입력칸으로
   * 깔아두면 입력칸들이 가로 폭을 나눠 갖느라 정작 확인해야 할 값이 잘려 보인다.
   * 평소에는 텍스트로 넓게 읽히게 두고, 고를 때만 편집칸을 연다.
   *
   * 인덱스가 아니라 id로 가리키는 이유는 행 삭제 때문이다. 인덱스는 위치일 뿐이라
   * 앞쪽 행이 지워지면 뒤쪽이 한 칸씩 당겨지고, 편집 패널이 조용히 다른 행을
   * 가리키게 된다. id는 그런 재매핑이 필요 없다.
   */
  const [editingId, setEditingId] = useState<string | null>(null);

  // 인라인 편집 핸들러
  const updateParsedItem = (id: string, field: keyof ParsedSchedule, value: string) => {
    setParsedData(prev => prev.map((item) =>
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  // 행 삭제 핸들러
  const removeParsedItem = (id: string) => {
    setParsedData(prev => prev.filter((item) => item.id !== id));
    // 편집 중이던 행이 사라지면 패널도 닫는다. id 기반이라 다른 행으로
    // 잘못 옮겨갈 일은 없지만, 존재하지 않는 행을 가리킨 채 두지는 않는다.
    setEditingId(prev => (prev === id ? null : prev));
  };

  // 행별 검증 결과 (현재 값 기준)
  //
  // ParsedSchedule.valid는 파싱 시점의 스냅샷이라 인라인 편집을 따라오지 않는다.
  // 화면과 저장이 서로 다른 기준을 보면 "3건 업로드"라고 표시하고 2건만 올리는
  // 조용한 누락이 생기므로, 파생값 하나를 만들어 양쪽이 같은 것을 보게 한다.
  // 인덱스가 아니라 id로 찾는다 — 행 삭제로 위치가 밀려도 같은 행의 오류를 가리킨다.
  const rowErrorsById = useMemo(
    () => new Map(parsedData.map((item) => [item.id, getRowErrors(item)])),
    [parsedData]
  );
  const validCount = useMemo(
    () => [...rowErrorsById.values()].filter((e) => e.length === 0).length,
    [rowErrorsById]
  );

  // 중복 키 감지 (date|service_type)
  const duplicateKeys = useMemo(() => {
    const counts = new Map<string, number>();
    parsedData.forEach(item => {
      const key = `${item.date}|${item.service_type}`;
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    const dupes = new Set<string>();
    counts.forEach((count, key) => {
      if (count > 1) dupes.add(key);
    });
    return dupes;
  }, [parsedData]);

  // CSV 템플릿 다운로드
  const handleDownloadTemplate = () => {
    const csv = generateTemplate();
    downloadFile(csv, 'service_schedule_template.csv', 'text/csv;charset=utf-8');
  };

  // CSV/Excel 파일 파싱
  const parseSpreadsheetFile = async (file: File): Promise<Record<string, string>[]> => {
    const extension = file.name.split('.').pop()?.toLowerCase();

    if (extension === 'csv') {
      return new Promise((resolve, reject) => {
        Papa.parse(file, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            resolve(results.data as Record<string, string>[]);
          },
          error: (error) => {
            reject(new Error(`CSV 파싱 오류: ${error.message}`));
          },
        });
      });
    } else if (extension === 'xlsx' || extension === 'xls') {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            // xlsx 동적 임포트 (312K 번들 분리)
            const XLSX = await import('xlsx');
            const data = e.target?.result;
            const workbook = XLSX.read(data, { type: 'binary' });
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(sheet, { defval: '' });
            resolve(jsonData as Record<string, string>[]);
          } catch (error) {
            reject(new Error(`Excel 파싱 오류: ${error}`));
          }
        };
        reader.onerror = () => reject(new Error('파일 읽기 오류'));
        reader.readAsBinaryString(file);
      });
    } else {
      throw new Error('지원하지 않는 파일 형식입니다.');
    }
  };

  // 이미지/PDF 파일 파싱 (Clova OCR 또는 PDF 텍스트 추출)
  const parseImageFile = async (file: File): Promise<ParsedSchedule[]> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('year', new Date().getFullYear().toString());

    logger.debug('Clova OCR로 이미지 파싱 시작...');

    const response = await fetch('/api/vision/parse-schedule', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: '알 수 없는 오류' }));
      throw new Error(errorData.error || `API 오류: ${response.status}`);
    }

    const result = await response.json();
    logger.debug('Vision API 응답:', result);
    logger.debug('추출된 원본 스케줄:', result.rawSchedules);
    logger.debug('디버그 정보:', result.debug);

    if (!result.success) {
      logger.error('파싱 실패:', result.errors, result.warnings);
      logger.debug('디버그 정보:', result.debug);

      // OCR은 성공했지만 일정 파싱이 안 된 경우
      if (result.debug?.wordCount > 0 && (!result.data || result.data.length === 0)) {
        throw new Error(
          `Clova OCR로 ${result.debug.wordCount}개의 텍스트를 추출했지만, 예배 일정 표 형식을 인식하지 못했습니다. ` +
            `날짜 컬럼이 포함된 표 형식의 이미지를 사용해주세요.`
        );
      }

      // 경고만 있고 에러가 없으면 rawSchedules라도 표시
      if (result.rawSchedules?.length > 0) {
        logger.debug('부분 파싱 결과:', result.rawSchedules);
      }
      throw new Error(result.error || result.errors?.join(', ') || '파일 파싱 실패');
    }

    // Vision API 결과를 ParsedSchedule 형식으로 변환
    return (result.data || []).map((schedule: Record<string, unknown>) => ({
      id: createRowId(),
      date: (schedule.date as string) || '',
      service_type: (schedule.service_type as string) || '주일 2부 예배',
      hymn_name: (schedule.hymn_name as string) || '',
      offertory_performer: (schedule.offertory_performer as string) || '',
      notes: (schedule.notes as string) || '',
      hood_color: (schedule.hood_color as string) || '',
      composer: (schedule.composer as string) || '',
      music_source: (schedule.music_source as string) || '',
      valid: !!(schedule.date as string),
      errors: (schedule.date as string) ? [] : ['날짜를 인식할 수 없습니다'],
    }));
  };

  // 파일 선택 핸들러
  const handleFileSelect = async (file: File) => {
    setSelectedFile(file);
    setIsProcessing(true);
    setUploadResult(null);

    try {
      let data: ParsedSchedule[];

      if (isVisionFile(file)) {
        // 이미지/PDF 파일: Vision API 또는 PDF 텍스트 추출
        data = await parseImageFile(file);
        setParsedData(data);
        setValidationResult({
          valid: data.every((d) => d.valid),
          data,
          errors: data
            .filter((d) => !d.valid)
            .map((d, idx) => ({ row: idx + 1, message: d.errors.join(', ') })),
        });
      } else {
        // CSV/Excel 파일: 기존 로직
        const rawData = await parseSpreadsheetFile(file);
        const validation = parseAndValidateData(rawData);
        setParsedData(validation.data);
        setValidationResult(validation);
      }
    } catch (error) {
      showError(`파일 파싱 실패: ${error instanceof Error ? error.message : 'Unknown error'}`);
      resetState();
    } finally {
      setIsProcessing(false);
    }
  };

  // 파일 입력 변경
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  // 드래그 앤 드롭
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      const ext = file.name.split('.').pop()?.toLowerCase();
      const supportedExts = ['csv', 'xlsx', 'xls', 'png', 'jpg', 'jpeg', 'webp', 'pdf'];
      if (supportedExts.includes(ext || '') || isVisionFile(file)) {
        handleFileSelect(file);
      } else {
        showWarning('CSV, Excel, 이미지(PNG, JPG) 또는 PDF 파일만 업로드 가능합니다');
      }
    }
  };

  // 파일 선택 버튼 클릭
  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  // 업로드 실행
  const handleUpload = async () => {
    if (!validationResult || parsedData.length === 0) return;

    // 파싱 시점의 valid 플래그가 아니라 현재 값으로 다시 판정한다.
    // 인라인 편집으로 값이 바뀌어도 그 플래그는 갱신되지 않기 때문이다.
    //
    // 오류 행이 있어도 나머지는 그대로 올린다 — 버튼이 "N건 업로드"라고 명시하고
    // 오류 건수를 따로 보여주는 화면이라, 부분 업로드가 원래 설계된 동작이다.
    const validData = parsedData.filter((d) => getRowErrors(d).length === 0);
    if (validData.length === 0) {
      showWarning('업로드할 유효한 데이터가 없습니다.');
      return;
    }

    setIsProcessing(true);
    setUploadResult(null);

    try {
      const schedules = validData.map((d) => ({
        date: d.date,
        service_type: d.service_type,
        hymn_name: d.hymn_name || null,
        offertory_performer: d.offertory_performer || null,
        notes: d.notes || null,
        // 신규 필드
        hood_color: d.hood_color || null,
        composer: d.composer || null,
        music_source: d.music_source || null,
      }));

      const result = await bulkUpsertMutation.mutateAsync(schedules);

      setUploadResult({
        success: true,
        total: validData.length,
        succeeded: result.count,
        failed: validData.length - result.count,
      });

      // 성공 시 콜백 호출
      onSuccess?.();
    } catch (error) {
      setUploadResult({
        success: false,
        total: validData.length,
        succeeded: 0,
        failed: validData.length,
        error: error instanceof Error ? error.message : '업로드 실패',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // 상태 초기화
  const resetState = () => {
    setSelectedFile(null);
    setParsedData([]);
    setValidationResult(null);
    setEditingId(null);
    setUploadResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // 작업 중단 (취소·완료 후 나가기)
  const handleCancel = () => {
    resetState();
    onCancel?.();
  };

  // 자동 이동 타이머가 호출할 대상.
  //
  // ref에 담는 이유는 아래 effect의 의존성을 '성공 여부'로만 좁히기 위해서다.
  // handleCancel은 렌더마다 새로 만들어지므로 의존성에 직접 넣으면 타이머가
  // 매 렌더 재시작되어 이동이 영영 일어나지 않는다.
  // 할당을 effect에 두는 이유: 렌더 중 ref 수정은 React 19에서 금지된다.
  // 컴파일러가 렌더를 재실행하거나 건너뛸 수 있어 렌더 중 부수효과는 신뢰할 수 없다.
  const onExitRef = useRef(handleCancel);
  useEffect(() => {
    onExitRef.current = handleCancel;
  });

  // 업로드 성공 후 자동으로 목록으로 되돌아간다.
  //
  // 즉시 이동하면 몇 건이 성공/실패했는지 볼 수 없고, 그렇다고 사용자가 버튼을
  // 누를 때까지 기다리면 대부분의 경우 불필요한 클릭이 하나 생긴다. 결과를 잠깐
  // 보여준 뒤 이동하는 절충안이다.
  //
  // 타이머 정리가 중요하다. '계속 등록하기'를 누르면 uploadResult가 null이 되어
  // 이 effect가 다시 돌면서 이전 타이머를 지운다 — 정리하지 않으면 새 파일을
  // 고르는 중에 목록으로 튕겨나간다. 언마운트 시에도 같은 이유로 필요하다.
  useEffect(() => {
    if (!uploadResult?.success) return;

    const timer = setTimeout(() => {
      onExitRef.current();
    }, AUTO_EXIT_DELAY_MS);

    return () => clearTimeout(timer);
  }, [uploadResult?.success]);

  return (
    <div className="space-y-6">
          {/* 템플릿 다운로드 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">1. 템플릿 다운로드</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-3 text-sm text-[var(--color-text-secondary)]">
                예시가 포함된 CSV 템플릿을 다운로드하여 양식에 맞게 데이터를 입력하세요.
              </p>
              <Button variant="outline" onClick={handleDownloadTemplate} className="gap-2">
                <Download className="h-4 w-4" />
                CSV 템플릿 다운로드
              </Button>
            </CardContent>
          </Card>

          {/* 파일 업로드 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">2. 파일 업로드</CardTitle>
            </CardHeader>
            <CardContent>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls,.png,.jpg,.jpeg,.webp,.pdf"
                onChange={handleFileInputChange}
                className="hidden"
              />

              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
                  isDragging
                    ? 'border-[var(--color-primary-500)] bg-[var(--color-primary-50)]'
                    : 'border-[var(--color-border-default)] bg-[var(--color-background-secondary)]'
                } `}
                onClick={handleButtonClick}
              >
                <div className="mb-3 flex justify-center gap-3">
                  <Upload className="h-10 w-10 text-[var(--color-text-tertiary)]" />
                  <ImageIcon className="h-10 w-10 text-[var(--color-text-tertiary)]" />
                </div>
                <p className="mb-1 text-sm font-medium text-[var(--color-text-primary)]">
                  파일을 드래그하거나 클릭하여 선택
                </p>
                <p className="text-xs text-[var(--color-text-tertiary)]">
                  CSV, Excel, <span className="text-[var(--color-primary-600)]">이미지</span>(PNG,
                  JPG), <span className="text-[var(--color-primary-600)]">PDF</span> 지원
                </p>
              </div>

              {/* Clova OCR 안내 */}
              <div className="mt-4 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-background-secondary)] p-3">
                <span className="text-sm text-[var(--color-text-secondary)]">
                  <span className="font-medium text-[var(--color-text-primary)]">Clova OCR</span>을
                  사용하여 이미지/PDF에서 텍스트를 추출합니다.
                  <Badge variant="secondary" className="ml-2 text-xs">
                    한글 최적화
                  </Badge>
                </span>
              </div>

              {selectedFile && (
                <div className="mt-3 rounded-md border border-[var(--color-primary-200)] bg-[var(--color-primary-50)] p-3">
                  <p className="text-sm text-[var(--color-primary-700)]">
                    선택된 파일: <strong>{selectedFile.name}</strong> (
                    {(selectedFile.size / 1024).toFixed(2)} KB)
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 데이터 미리보기 */}
          {parsedData.length > 0 && validationResult && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-base">
                  <span>3. 데이터 미리보기</span>
                  <div className="flex gap-2">
                    <Badge
                      variant={validationResult.valid ? 'default' : 'secondary'}
                      className="gap-1"
                    >
                      {validationResult.valid ? (
                        <CheckCircle className="h-3 w-3" />
                      ) : (
                        <AlertCircle className="h-3 w-3" />
                      )}
                      유효: {validCount}건
                    </Badge>
                    {validationResult.errors.length > 0 && (
                      <Badge variant="destructive" className="gap-1">
                        <XCircle className="h-3 w-3" />
                        오류: {validationResult.errors.length}건
                      </Badge>
                    )}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* 오류 목록 */}
                {validationResult.errors.length > 0 && (
                  <Alert variant="error" className="mb-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <p className="mb-1 font-medium">오류 목록:</p>
                      <ul className="max-h-24 list-inside list-disc overflow-y-auto text-sm">
                        {validationResult.errors.slice(0, 5).map((error, idx) => (
                          <li key={idx}>
                            행 {error.row}: {error.message}
                          </li>
                        ))}
                        {validationResult.errors.length > 5 && (
                          <li className="text-[var(--color-text-tertiary)]">
                            ... 외 {validationResult.errors.length - 5}건
                          </li>
                        )}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}

                {/* 중복 키 경고 */}
                {duplicateKeys.size > 0 && (
                  <Alert variant="error" className="mb-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <p className="font-medium">
                        같은 날짜 + 예배 유형 조합이 {duplicateKeys.size}건 중복됩니다.
                      </p>
                      <p className="text-sm">
                        예배 유형을 변경하거나 중복 행을 삭제해주세요.
                        수정하지 않으면 마지막 항목만 저장됩니다.
                      </p>
                    </AlertDescription>
                  </Alert>
                )}

                {/*
                  읽기 중심 테이블.

                  실제 수정은 18행 중 2~5행뿐인데 모든 칸을 입력칸으로 깔면, 입력칸의
                  padding·border·min-width가 가로 폭을 나눠 먹어 "오랫동안 기다리…",
                  "Arr. B. Kro…"처럼 값이 잘린다. 편집 UI인데 정작 무엇이 들어있는지
                  읽을 수 없는 상태였다. 평소에는 텍스트로 넓게 보여주고, ✎를 누른
                  행만 아래 편집 패널을 펼친다.

                  높이도 max-h-80(320px, 5행)에서 늘렸다. 전용 페이지로 옮긴 이유가
                  세로 공간을 쓰려던 것이었는데 정작 표가 그 공간을 안 쓰고 있었다.
                */}
                <div className="max-h-[60vh] overflow-y-auto rounded-lg border">
                  <Table>
                    <TableHeader className="sticky top-0 z-10 bg-[var(--color-surface)]">
                      <TableRow>
                        <TableHead className="w-10">상태</TableHead>
                        <TableHead className="whitespace-nowrap">날짜</TableHead>
                        <TableHead className="whitespace-nowrap">예배 유형</TableHead>
                        <TableHead>후드</TableHead>
                        <TableHead>찬양곡명</TableHead>
                        <TableHead>작곡가</TableHead>
                        <TableHead>봉헌송</TableHead>
                        <TableHead>절기/비고</TableHead>
                        <TableHead className="w-20 text-right">편집</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parsedData.slice(0, 50).map((item) => {
                        const isDuplicate = duplicateKeys.has(`${item.date}|${item.service_type}`);
                        // 굳은 item.valid 대신 현재 값 기준 판정을 쓴다 — 편집한 행의
                        // 상태 표시가 실제 저장 여부와 어긋나지 않게 한다.
                        const errors = rowErrorsById.get(item.id) ?? [];
                        const isValid = errors.length === 0;
                        const isEditing = editingId === item.id;
                        // '기타'를 고르면 service_type이 빈 문자열이 된다. 읽기 행에서는
                        // 빈 칸이 "값이 사라졌다"로 보이므로 무엇을 해야 하는지 적어준다.
                        const isCustomType = !isPresetServiceType(item.service_type);

                        return (
                          <Fragment key={item.id}>
                            <TableRow
                              className={
                                !isValid
                                  ? 'bg-[var(--color-error-50)]'
                                  : isDuplicate
                                    ? 'bg-amber-50'
                                    : isEditing
                                      ? 'bg-[var(--color-primary-50)]'
                                      : ''
                              }
                            >
                              <TableCell>
                                {isValid ? (
                                  <CheckCircle className="h-4 w-4 text-[var(--color-success-600)]" />
                                ) : (
                                  // 아이콘만으로는 무엇을 고쳐야 할지 알 수 없어 사유를 붙인다.
                                  <XCircle className="h-4 w-4 text-[var(--color-error-600)]">
                                    <title>{errors.join(', ')}</title>
                                  </XCircle>
                                )}
                              </TableCell>
                              <TableCell className="font-medium whitespace-nowrap">
                                {item.date || (
                                  <span className="text-[var(--color-error-600)]">날짜 없음</span>
                                )}
                              </TableCell>
                              <TableCell className="whitespace-nowrap">
                                <div className="flex items-center gap-1.5">
                                  {item.service_type ? (
                                    <span>{item.service_type}</span>
                                  ) : (
                                    <span className="text-[var(--color-error-600)]">
                                      직접 입력 필요
                                    </span>
                                  )}
                                  {isDuplicate && (
                                    <Badge
                                      variant="destructive"
                                      className="shrink-0 px-1 text-[10px]"
                                    >
                                      중복
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                {item.hood_color ? (
                                  <Badge variant="outline" className="text-xs">
                                    {item.hood_color}
                                  </Badge>
                                ) : (
                                  <span className="text-[var(--color-text-tertiary)]">-</span>
                                )}
                              </TableCell>
                              <TableCell>{item.hymn_name || <span className="text-[var(--color-text-tertiary)]">-</span>}</TableCell>
                              <TableCell>{item.composer || <span className="text-[var(--color-text-tertiary)]">-</span>}</TableCell>
                              <TableCell>{item.offertory_performer || <span className="text-[var(--color-text-tertiary)]">-</span>}</TableCell>
                              <TableCell>{item.notes || <span className="text-[var(--color-text-tertiary)]">-</span>}</TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-0.5">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    aria-expanded={isEditing}
                                    aria-label={`${item.date || '이 행'} 편집`}
                                    onClick={() => setEditingId(isEditing ? null : item.id)}
                                  >
                                    <Pencil
                                      className={
                                        isEditing
                                          ? 'h-3.5 w-3.5 text-[var(--color-primary-600)]'
                                          : 'h-3.5 w-3.5 text-[var(--color-text-tertiary)]'
                                      }
                                    />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-[var(--color-text-tertiary)] hover:text-[var(--color-error-600)]"
                                    aria-label={`${item.date || '이 행'} 삭제`}
                                    onClick={() => removeParsedItem(item.id)}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>

                            {/*
                              편집 패널. 표의 한 행을 통째로 써서 가로 폭 전체를 쓴다 —
                              칸을 쪼개 쓰던 때와 달리 라벨과 값이 잘리지 않는다.
                            */}
                            {isEditing && (
                              <TableRow className="bg-[var(--color-primary-50)] hover:bg-[var(--color-primary-50)]">
                                <TableCell colSpan={9} className="p-4">
                                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                    <label className="flex flex-col gap-1 text-xs">
                                      <span className="font-medium">날짜</span>
                                      <Input
                                        type="date"
                                        className="h-9"
                                        value={item.date}
                                        onChange={(e) =>
                                          updateParsedItem(item.id, 'date', e.target.value)
                                        }
                                      />
                                    </label>

                                    <label className="flex flex-col gap-1 text-xs">
                                      <span className="font-medium">예배 유형</span>
                                      {/*
                                        프리셋에 없는 값(OCR이 뽑아온 '추수감사주일 찬양예배' 등)이면
                                        드롭다운은 '기타'를 표시하고 아래 입력칸에 원본을 그대로 둔다.
                                        이 판정을 별도 state로 두지 않고 값에서 파생시킨다.
                                      */}
                                      <Select
                                        value={
                                          isPresetServiceType(item.service_type)
                                            ? item.service_type
                                            : CUSTOM_SERVICE_TYPE
                                        }
                                        onValueChange={(value) =>
                                          // '기타'를 고르면 빈 값으로 비워 입력칸을 띄운다.
                                          // '기타' 자체가 저장되면 실제 예배 종류가 아닌 값이
                                          // DB에 남으므로 절대 그대로 넣지 않는다.
                                          updateParsedItem(
                                            item.id,
                                            'service_type',
                                            value === CUSTOM_SERVICE_TYPE ? '' : value
                                          )
                                        }
                                      >
                                        <SelectTrigger className="h-9">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {SERVICE_TYPE_OPTIONS.map((option) => (
                                            <SelectItem key={option.value} value={option.value}>
                                              {option.label}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                      {isCustomType && (
                                        <Input
                                          className="mt-1 h-9"
                                          value={item.service_type}
                                          onChange={(e) =>
                                            updateParsedItem(
                                              item.id,
                                              'service_type',
                                              e.target.value
                                            )
                                          }
                                          placeholder="예배 유형 직접 입력"
                                        />
                                      )}
                                    </label>

                                    <label className="flex flex-col gap-1 text-xs">
                                      <span className="font-medium">찬양곡명</span>
                                      <Input
                                        className="h-9"
                                        value={item.hymn_name || ''}
                                        onChange={(e) =>
                                          updateParsedItem(item.id, 'hymn_name', e.target.value)
                                        }
                                        placeholder="-"
                                      />
                                    </label>

                                    <label className="flex flex-col gap-1 text-xs">
                                      <span className="font-medium">작곡가</span>
                                      <Input
                                        className="h-9"
                                        value={item.composer || ''}
                                        onChange={(e) =>
                                          updateParsedItem(item.id, 'composer', e.target.value)
                                        }
                                        placeholder="-"
                                      />
                                    </label>

                                    <label className="flex flex-col gap-1 text-xs">
                                      <span className="font-medium">봉헌송 연주자</span>
                                      <Input
                                        className="h-9"
                                        value={item.offertory_performer || ''}
                                        onChange={(e) =>
                                          updateParsedItem(
                                            item.id,
                                            'offertory_performer',
                                            e.target.value
                                          )
                                        }
                                        placeholder="-"
                                      />
                                    </label>

                                    <label className="flex flex-col gap-1 text-xs">
                                      <span className="font-medium">절기/비고</span>
                                      <Input
                                        className="h-9"
                                        value={item.notes || ''}
                                        onChange={(e) =>
                                          updateParsedItem(item.id, 'notes', e.target.value)
                                        }
                                        placeholder="-"
                                      />
                                    </label>
                                  </div>

                                  <div className="mt-3 flex items-center justify-between gap-2">
                                    <p className="text-xs text-[var(--color-text-tertiary)]">
                                      {errors.length > 0
                                        ? errors.join(', ')
                                        : '수정한 내용은 바로 반영됩니다.'}
                                    </p>
                                    <Button
                                      variant="secondary"
                                      size="sm"
                                      onClick={() => setEditingId(null)}
                                    >
                                      완료
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            )}
                          </Fragment>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
                {parsedData.length > 50 && (
                  <p className="mt-2 text-center text-sm text-[var(--color-text-tertiary)]">
                    ... 외 {parsedData.length - 50}건 (처음 50건만 표시)
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* 업로드 결과 */}
          {uploadResult && (
            <Alert variant={uploadResult.success ? 'default' : 'error'}>
              {uploadResult.success ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              <AlertDescription>
                <p className="font-medium">
                  {uploadResult.success ? '업로드 완료!' : '업로드 실패'}
                </p>
                <p className="text-sm">
                  전체: {uploadResult.total}건 / 성공: {uploadResult.succeeded}건 / 실패:{' '}
                  {uploadResult.failed}건
                </p>
                {uploadResult.error && (
                  <p className="mt-1 text-sm text-[var(--color-error-600)]">{uploadResult.error}</p>
                )}
                {uploadResult.success && (
                  <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                    잠시 후 일정 목록으로 이동합니다...
                  </p>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* 액션 버튼 */}
          <div className="flex justify-end gap-3">
            {uploadResult?.success ? (
              <>
                {/*
                  자동 이동을 기다리지 않고 바로 나가거나, 이동을 취소하고 다음 파일을
                  올릴 수 있게 둘 다 제공한다. '계속 등록하기'는 resetState만 하므로
                  아래 useEffect의 타이머가 정리되어 이동이 취소된다.
                */}
                <Button variant="outline" onClick={resetState}>
                  계속 등록하기
                </Button>
                <Button onClick={handleCancel} className="gap-2">
                  일정 목록으로
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={handleCancel} disabled={isProcessing}>
                  취소
                </Button>
                {parsedData.length > 0 && (
                  <Button
                    onClick={handleUpload}
                    disabled={isProcessing || validCount === 0}
                    className="gap-2"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        처리 중...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4" />
                        {validCount}건 업로드
                      </>
                    )}
                  </Button>
                )}
              </>
            )}
          </div>
    </div>
  );
}
