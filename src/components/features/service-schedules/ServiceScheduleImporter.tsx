'use client';

import { useState, useRef } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
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
} from 'lucide-react';

// 파싱된 예배 일정 타입
interface ParsedSchedule {
  date: string;
  service_type: string;
  hymn_name: string;
  offertory_performer: string;
  notes: string;
  valid: boolean;
  errors: string[];
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

  // 파일 파싱
  const parseFile = async (file: File): Promise<Record<string, string>[]> => {
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
        reader.onload = (e) => {
          try {
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
      throw new Error('지원하지 않는 파일 형식입니다. CSV 또는 Excel 파일만 업로드 가능합니다.');
    }
  };

  // 파일 선택 핸들러
  const handleFileSelect = async (file: File) => {
    setSelectedFile(file);
    setIsProcessing(true);
    setUploadResult(null);

    try {
      const rawData = await parseFile(file);
      const validation = parseAndValidateData(rawData);
      setParsedData(validation.data);
      setValidationResult(validation);
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
      if (['csv', 'xlsx', 'xls'].includes(ext || '')) {
        handleFileSelect(file);
      } else {
        alert('CSV 또는 Excel 파일만 업로드 가능합니다');
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
                accept=".csv,.xlsx,.xls"
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
                <Upload className="h-10 w-10 mx-auto text-[var(--color-text-tertiary)] mb-3" />
                <p className="text-sm font-medium text-[var(--color-text-primary)] mb-1">
                  파일을 드래그하거나 클릭하여 선택
                </p>
                <p className="text-xs text-[var(--color-text-tertiary)]">
                  CSV, Excel (.xlsx, .xls) 파일 지원
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
                        <TableHead>예배 유형</TableHead>
                        <TableHead>찬양곡명</TableHead>
                        <TableHead>봉헌송 연주자</TableHead>
                        <TableHead>비고</TableHead>
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
                          <TableCell className="font-medium">{item.date}</TableCell>
                          <TableCell>{item.service_type}</TableCell>
                          <TableCell>{item.hymn_name || '-'}</TableCell>
                          <TableCell>{item.offertory_performer || '-'}</TableCell>
                          <TableCell className="max-w-32 truncate">{item.notes || '-'}</TableCell>
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
