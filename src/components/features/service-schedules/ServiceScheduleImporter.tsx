'use client';

import { useState, useRef } from 'react';
import Papa from 'papaparse';
// xlsx는 동적 임포트로 변경 (312K 번들 분리)
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useBulkUpsertServiceSchedules } from '@/hooks/useServiceSchedules';
import {
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Image as ImageIcon,
} from 'lucide-react';

// 파싱된 예배 일정 타입
interface ParsedSchedule {
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
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
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
    const serviceType = (row['service_type'] || row['예배유형'] || row['Service Type'] || '주일2부예배').trim();

    // 찬양곡명
    const hymnName = (row['hymn_name'] || row['찬양곡명'] || row['Hymn Name'] || '').trim();

    // 봉헌송 연주자
    const offertoryPerformer = (row['offertory_performer'] || row['봉헌송연주자'] || row['Offertory Performer'] || '').trim();

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
    ['2025-01-05', '주일2부예배', '나 같은 죄인 살리신', '홍길동 (피아노)', '새해 첫 예배'],
    ['2025-01-12', '주일2부예배', '주 하나님 지으신 모든 세계', '', ''],
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
  open,
  onOpenChange,
  onSuccess,
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

    console.log('Clova OCR로 이미지 파싱 시작...');

    const response = await fetch('/api/vision/parse-schedule', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: '알 수 없는 오류' }));
      throw new Error(errorData.error || `API 오류: ${response.status}`);
    }

    const result = await response.json();
    console.log('Vision API 응답:', result);
    console.log('추출된 원본 스케줄:', result.rawSchedules);
    console.log('디버그 정보:', result.debug);

    if (!result.success) {
      console.error('파싱 실패:', result.errors, result.warnings);
      console.log('디버그 정보:', result.debug);

      // OCR은 성공했지만 일정 파싱이 안 된 경우
      if (result.debug?.wordCount > 0 && (!result.data || result.data.length === 0)) {
        throw new Error(
          `Clova OCR로 ${result.debug.wordCount}개의 텍스트를 추출했지만, 예배 일정 표 형식을 인식하지 못했습니다. ` +
          `날짜 컬럼이 포함된 표 형식의 이미지를 사용해주세요.`
        );
      }

      // 경고만 있고 에러가 없으면 rawSchedules라도 표시
      if (result.rawSchedules?.length > 0) {
        console.log('부분 파싱 결과:', result.rawSchedules);
      }
      throw new Error(result.error || result.errors?.join(', ') || '파일 파싱 실패');
    }

    // Vision API 결과를 ParsedSchedule 형식으로 변환
    return (result.data || []).map((schedule: Record<string, unknown>) => ({
      date: schedule.date as string || '',
      service_type: schedule.service_type as string || '주일2부예배',
      hymn_name: schedule.hymn_name as string || '',
      offertory_performer: schedule.offertory_performer as string || '',
      notes: schedule.notes as string || '',
      hood_color: schedule.hood_color as string || '',
      composer: schedule.composer as string || '',
      music_source: schedule.music_source as string || '',
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
          valid: data.every(d => d.valid),
          data,
          errors: data
            .filter(d => !d.valid)
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
      alert(`파일 파싱 실패: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
        alert('CSV, Excel, 이미지(PNG, JPG) 또는 PDF 파일만 업로드 가능합니다');
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

    const validData = parsedData.filter((d) => d.valid);
    if (validData.length === 0) {
      alert('업로드할 유효한 데이터가 없습니다.');
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
    setUploadResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // 다이얼로그 닫기
  const handleClose = () => {
    resetState();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            예배 일정 일괄 등록
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* 템플릿 다운로드 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">1. 템플릿 다운로드</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-[var(--color-text-secondary)] mb-3">
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
                className={`
                  border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer
                  ${isDragging
                    ? 'border-[var(--color-primary-500)] bg-[var(--color-primary-50)]'
                    : 'border-[var(--color-border-default)] bg-[var(--color-background-secondary)]'
                  }
                `}
                onClick={handleButtonClick}
              >
                <div className="flex justify-center gap-3 mb-3">
                  <Upload className="h-10 w-10 text-[var(--color-text-tertiary)]" />
                  <ImageIcon className="h-10 w-10 text-[var(--color-text-tertiary)]" />
                </div>
                <p className="text-sm font-medium text-[var(--color-text-primary)] mb-1">
                  파일을 드래그하거나 클릭하여 선택
                </p>
                <p className="text-xs text-[var(--color-text-tertiary)]">
                  CSV, Excel, <span className="text-[var(--color-primary-600)]">이미지</span>(PNG, JPG), <span className="text-[var(--color-primary-600)]">PDF</span> 지원
                </p>
              </div>

              {/* Clova OCR 안내 */}
              <div className="mt-4 p-3 bg-[var(--color-background-secondary)] rounded-lg border border-[var(--color-border-default)]">
                <p className="text-sm text-[var(--color-text-secondary)]">
                  <span className="font-medium text-[var(--color-text-primary)]">Clova OCR</span>을 사용하여 이미지/PDF에서 텍스트를 추출합니다.
                  <Badge variant="secondary" className="ml-2 text-xs">
                    한글 최적화
                  </Badge>
                </p>
              </div>

              {selectedFile && (
                <div className="mt-3 p-3 bg-[var(--color-primary-50)] border border-[var(--color-primary-200)] rounded-md">
                  <p className="text-sm text-[var(--color-primary-700)]">
                    선택된 파일: <strong>{selectedFile.name}</strong> ({(selectedFile.size / 1024).toFixed(2)} KB)
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 데이터 미리보기 */}
          {parsedData.length > 0 && validationResult && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center justify-between">
                  <span>3. 데이터 미리보기</span>
                  <div className="flex gap-2">
                    <Badge variant={validationResult.valid ? 'default' : 'secondary'} className="gap-1">
                      {validationResult.valid ? (
                        <CheckCircle className="h-3 w-3" />
                      ) : (
                        <AlertCircle className="h-3 w-3" />
                      )}
                      유효: {parsedData.filter((d) => d.valid).length}건
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
                      <p className="font-medium mb-1">오류 목록:</p>
                      <ul className="list-disc list-inside text-sm max-h-24 overflow-y-auto">
                        {validationResult.errors.slice(0, 5).map((error, idx) => (
                          <li key={idx}>행 {error.row}: {error.message}</li>
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

                {/* 테이블 */}
                <div className="border rounded-lg overflow-hidden max-h-64 overflow-y-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-[var(--color-surface)]">
                      <TableRow>
                        <TableHead className="w-12">상태</TableHead>
                        <TableHead>날짜</TableHead>
                        <TableHead>후드</TableHead>
                        <TableHead>찬양곡명</TableHead>
                        <TableHead>작곡가</TableHead>
                        <TableHead>악보</TableHead>
                        <TableHead>봉헌송</TableHead>
                        <TableHead>절기</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parsedData.slice(0, 50).map((item, idx) => (
                        <TableRow
                          key={idx}
                          className={item.valid ? '' : 'bg-red-50'}
                        >
                          <TableCell>
                            {item.valid ? (
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-600" />
                            )}
                          </TableCell>
                          <TableCell className="font-medium whitespace-nowrap">{item.date}</TableCell>
                          <TableCell>
                            {item.hood_color ? (
                              <Badge variant="outline" className="text-xs">
                                {item.hood_color}
                              </Badge>
                            ) : '-'}
                          </TableCell>
                          <TableCell className="max-w-24 truncate">{item.hymn_name || '-'}</TableCell>
                          <TableCell className="max-w-20 truncate text-xs">{item.composer || '-'}</TableCell>
                          <TableCell className="max-w-20 truncate text-xs">{item.music_source || '-'}</TableCell>
                          <TableCell className="max-w-20 truncate text-xs">{item.offertory_performer || '-'}</TableCell>
                          <TableCell className="max-w-20 truncate text-xs">{item.notes || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {parsedData.length > 50 && (
                  <p className="text-center text-sm text-[var(--color-text-tertiary)] mt-2">
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
                  전체: {uploadResult.total}건 / 성공: {uploadResult.succeeded}건 / 실패: {uploadResult.failed}건
                </p>
                {uploadResult.error && (
                  <p className="text-sm text-red-600 mt-1">{uploadResult.error}</p>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* 액션 버튼 */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={handleClose} disabled={isProcessing}>
              {uploadResult?.success ? '닫기' : '취소'}
            </Button>
            {parsedData.length > 0 && !uploadResult?.success && (
              <Button
                onClick={handleUpload}
                disabled={isProcessing || parsedData.filter((d) => d.valid).length === 0}
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
                    {parsedData.filter((d) => d.valid).length}건 업로드
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
