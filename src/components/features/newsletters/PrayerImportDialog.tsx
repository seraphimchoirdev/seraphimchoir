'use client';

import {
  AlertCircle,
  CheckCircle,
  FileSpreadsheet,
  Loader2,
  Upload,
  XCircle,
} from 'lucide-react';

import { useRef, useState } from 'react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { showError, showSuccess, showWarning } from '@/lib/toast';

interface ParsedPrayerRow {
  date: string;
  prayer_names: string;
  gown_part: string;
  valid: boolean;
  errors: string[];
}

interface PrayerImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  year: number;
  quarter: string;
  /** 파싱 결과를 rows에 병합하는 콜백 */
  onImport: (rows: Array<{ date: string; prayer_names: string; gown_part: string }>) => void;
}

const SUPPORTED_EXTS = ['csv', 'xlsx', 'xls', 'png', 'jpg', 'jpeg', 'webp', 'pdf'];

export default function PrayerImportDialog({
  open,
  onOpenChange,
  year,
  quarter,
  onImport,
}: PrayerImportDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedPrayerRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileSelect = async (file: File) => {
    setSelectedFile(file);
    setIsProcessing(true);
    setParsedData([]);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('year', year.toString());
      formData.append('quarter', quarter);

      const response = await fetch('/api/prayers/parse-file', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || '파일 파싱에 실패했습니다.');
      }

      if (!result.data || result.data.length === 0) {
        showWarning('파일에서 기도 담당 데이터를 찾을 수 없습니다.');
        return;
      }

      setParsedData(result.data);
    } catch (error) {
      showError(error instanceof Error ? error.message : '파일 파싱에 실패했습니다.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  };

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
    if (!file) return;
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (SUPPORTED_EXTS.includes(ext || '')) {
      handleFileSelect(file);
    } else {
      showWarning('CSV, Excel, 이미지(PNG, JPG) 또는 PDF 파일만 지원합니다.');
    }
  };

  const handleImport = () => {
    const validRows = parsedData.filter(r => r.valid);
    if (validRows.length === 0) {
      showWarning('가져올 유효한 데이터가 없습니다.');
      return;
    }

    onImport(validRows.map(r => ({
      date: r.date,
      prayer_names: r.prayer_names,
      gown_part: r.gown_part,
    })));

    showSuccess(`${validRows.length}건이 가져오기되었습니다. "일괄 저장"으로 DB에 반영하세요.`);
    handleClose();
  };

  const handleClose = () => {
    setSelectedFile(null);
    setParsedData([]);
    setIsProcessing(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
    onOpenChange(false);
  };

  const validCount = parsedData.filter(r => r.valid).length;
  const invalidCount = parsedData.filter(r => !r.valid).length;

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    const month = d.getMonth() + 1;
    const day = d.getDate();
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    return `${month}/${day} (${dayNames[d.getDay()]})`;
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            기도 담당 파일 가져오기
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* 파일 업로드 영역 */}
          <div>
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
              onClick={() => fileInputRef.current?.click()}
              className={`cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
                isDragging
                  ? 'border-[var(--color-primary-500)] bg-[var(--color-primary-50)]'
                  : 'border-[var(--color-border-default)] bg-[var(--color-background-secondary)]'
              }`}
            >
              <Upload className="mx-auto mb-2 h-8 w-8 text-[var(--color-text-tertiary)]" />
              <p className="text-sm font-medium text-[var(--color-text-primary)]">
                파일을 드래그하거나 클릭하여 선택
              </p>
              <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">
                CSV, Excel, 이미지(PNG, JPG), PDF 지원
              </p>
            </div>

            {selectedFile && (
              <div className="mt-2 rounded-md border border-[var(--color-primary-200)] bg-[var(--color-primary-50)] p-2">
                <p className="text-sm text-[var(--color-primary-700)]">
                  {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                </p>
              </div>
            )}
          </div>

          {/* 로딩 */}
          {isProcessing && (
            <div className="flex items-center justify-center gap-2 py-6">
              <Loader2 className="h-5 w-5 animate-spin text-[var(--color-primary)]" />
              <span className="text-sm text-[var(--color-text-secondary)]">파일 분석 중...</span>
            </div>
          )}

          {/* 미리보기 */}
          {parsedData.length > 0 && (
            <div>
              <div className="mb-2 flex items-center gap-2">
                <span className="text-sm font-medium">미리보기</span>
                <Badge variant="default" className="gap-1">
                  <CheckCircle className="h-3 w-3" />
                  유효 {validCount}건
                </Badge>
                {invalidCount > 0 && (
                  <Badge variant="destructive" className="gap-1">
                    <XCircle className="h-3 w-3" />
                    오류 {invalidCount}건
                  </Badge>
                )}
              </div>

              {/* 오류 목록 */}
              {invalidCount > 0 && (
                <Alert variant="error" className="mb-3">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <ul className="list-inside list-disc text-sm">
                      {parsedData
                        .filter(r => !r.valid)
                        .slice(0, 5)
                        .map((r, i) => (
                          <li key={i}>{r.date || '?'}: {r.errors.join(', ')}</li>
                        ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              <div className="max-h-60 overflow-y-auto rounded-lg border">
                <Table>
                  <TableHeader className="sticky top-0 bg-[var(--color-surface)]">
                    <TableRow>
                      <TableHead className="w-10">상태</TableHead>
                      <TableHead>날짜</TableHead>
                      <TableHead>기도자</TableHead>
                      <TableHead>가운 파트</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedData.map((row, idx) => (
                      <TableRow
                        key={idx}
                        className={row.valid ? '' : 'bg-[var(--color-error-50)]'}
                      >
                        <TableCell>
                          {row.valid ? (
                            <CheckCircle className="h-4 w-4 text-[var(--color-success-600)]" />
                          ) : (
                            <XCircle className="h-4 w-4 text-[var(--color-error-600)]" />
                          )}
                        </TableCell>
                        <TableCell className="whitespace-nowrap font-medium">
                          {row.date ? formatDate(row.date) : '-'}
                        </TableCell>
                        <TableCell>{row.prayer_names || '-'}</TableCell>
                        <TableCell>
                          {row.gown_part ? (
                            <Badge variant="outline" className="text-xs">{row.gown_part}</Badge>
                          ) : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* 액션 */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={handleClose} disabled={isProcessing}>
              취소
            </Button>
            {parsedData.length > 0 && validCount > 0 && (
              <Button onClick={handleImport} disabled={isProcessing} className="gap-2">
                <Upload className="h-4 w-4" />
                {validCount}건 가져오기
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
