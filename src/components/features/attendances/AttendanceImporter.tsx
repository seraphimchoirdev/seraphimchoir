'use client';

import { useRef, useState } from 'react';

import { useBulkCreateAttendances } from '@/hooks/useAttendances';
import { useMembers } from '@/hooks/useMembers';

import {
  type ParsedAttendance,
  type ValidationResult,
  convertToAttendanceInserts,
  downloadCSV,
  generateAttendanceTemplate,
  parseAttendanceCSV,
  validateAttendanceData,
} from '@/lib/attendance';
import { showError, showWarning } from '@/lib/toast';

/**
 * CSV 파일 업로드를 통한 출석 데이터 일괄 입력 컴포넌트
 */
export default function AttendanceImporter() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedAttendance[]>([]);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadResult, setUploadResult] = useState<{
    success: boolean;
    total: number;
    succeeded: number;
    failed: number;
    errors?: Array<{ chunk?: number; error?: string; message?: string }>;
  } | null>(null);

  // 회원 목록 조회
  const { data: membersResponse } = useMembers({ limit: 1000 });
  const members = membersResponse?.data || [];

  // 일괄 출석 생성 훅
  const bulkCreateMutation = useBulkCreateAttendances();

  // CSV 템플릿 다운로드
  const handleDownloadTemplate = () => {
    const today = new Date().toISOString().split('T')[0];
    const memberInfos = members.map((m) => ({
      id: m.id,
      name: m.name,
      part: m.part,
    }));

    const csv = generateAttendanceTemplate(memberInfos, today);
    downloadCSV(csv, `attendance_template_${today}.csv`);
  };

  // 파일 선택 핸들러
  const handleFileSelect = async (file: File) => {
    setSelectedFile(file);
    setIsProcessing(true);
    setUploadResult(null);

    try {
      // CSV 파싱
      const parsed = await parseAttendanceCSV(file);
      setParsedData(parsed);

      // 유효성 검증
      const memberInfos = members.map((m) => ({
        id: m.id,
        name: m.name,
        part: m.part,
      }));
      const validation = validateAttendanceData(parsed, memberInfos);
      setValidationResult(validation);
    } catch (error) {
      showError(`파일 파싱 실패: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setSelectedFile(null);
      setParsedData([]);
      setValidationResult(null);
    } finally {
      setIsProcessing(false);
    }
  };

  // 파일 입력 변경 이벤트
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  // 드래그 앤 드롭 이벤트
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
      if (file.name.endsWith('.csv') || file.type === 'text/csv') {
        handleFileSelect(file);
      } else {
        showWarning('CSV 파일만 업로드 가능합니다');
      }
    }
  };

  // 파일 선택 버튼 클릭
  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  // 업로드 실행
  const handleUpload = async () => {
    if (!validationResult || !validationResult.valid) {
      showWarning('유효하지 않은 데이터가 있습니다. 오류를 수정해주세요.');
      return;
    }

    setIsProcessing(true);
    setUploadResult(null);

    try {
      // 유효한 데이터만 변환
      const attendances = convertToAttendanceInserts(validationResult.data);

      if (attendances.length === 0) {
        showWarning('업로드할 데이터가 없습니다.');
        setIsProcessing(false);
        return;
      }

      // 청크로 나누기 (100개씩)
      const chunkSize = 100;
      const chunks = [];
      for (let i = 0; i < attendances.length; i += chunkSize) {
        chunks.push(attendances.slice(i, i + chunkSize));
      }

      // 각 청크별로 요청
      let totalSucceeded = 0;
      let totalFailed = 0;
      const allErrors: Array<{ chunk?: number; error?: string; message?: string }> = [];

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        try {
          const result = await bulkCreateMutation.mutateAsync(chunk);
          totalSucceeded += result.summary.succeeded;
          totalFailed += result.summary.failed;

          if (result.errors) {
            allErrors.push(...result.errors);
          }
        } catch (error) {
          totalFailed += chunk.length;
          allErrors.push({
            chunk: i,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      setUploadResult({
        success: totalFailed === 0,
        total: attendances.length,
        succeeded: totalSucceeded,
        failed: totalFailed,
        errors: allErrors.length > 0 ? allErrors : undefined,
      });

      // 성공 시 파일 초기화
      if (totalFailed === 0) {
        setSelectedFile(null);
        setParsedData([]);
        setValidationResult(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    } catch (error) {
      setUploadResult({
        success: false,
        total: parsedData.length,
        succeeded: 0,
        failed: parsedData.length,
        errors: [{ message: error instanceof Error ? error.message : 'Unknown error' }],
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // 취소
  const handleCancel = () => {
    setSelectedFile(null);
    setParsedData([]);
    setValidationResult(null);
    setUploadResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* CSV 템플릿 다운로드 */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h3 className="mb-3 text-lg font-semibold text-gray-900">CSV 템플릿 다운로드</h3>
        <p className="mb-4 text-sm text-gray-600">
          현재 등록된 모든 찬양대원 목록이 포함된 CSV 템플릿을 다운로드합니다. 템플릿을 수정하여
          출석 정보를 입력한 후 업로드하세요.
        </p>
        <button
          onClick={handleDownloadTemplate}
          disabled={members.length === 0}
          className="rounded-md bg-green-600 px-4 py-2 text-white hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
        >
          📥 CSV 템플릿 다운로드
        </button>
      </div>

      {/* 파일 업로드 영역 */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">CSV 파일 업로드</h3>

        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileInputChange}
          className="hidden"
        />

        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`rounded-lg border-2 border-dashed p-12 text-center transition-colors ${
            isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-gray-50'
          }`}
        >
          <div className="space-y-4">
            <div className="text-6xl">📄</div>
            <div>
              <p className="mb-2 text-lg font-medium text-gray-900">파일을 여기에 드래그하거나</p>
              <button
                onClick={handleButtonClick}
                className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
              >
                파일 선택
              </button>
            </div>
            <p className="text-sm text-gray-500">CSV 파일만 업로드 가능 (최대 5MB)</p>
          </div>
        </div>

        {selectedFile && (
          <div className="mt-4 rounded-md border border-blue-200 bg-blue-50 p-3">
            <p className="text-sm text-blue-900">
              선택된 파일: <strong>{selectedFile.name}</strong> (
              {(selectedFile.size / 1024).toFixed(2)} KB)
            </p>
          </div>
        )}
      </div>

      {/* 미리보기 테이블 */}
      {parsedData.length > 0 && validationResult && (
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">데이터 미리보기</h3>

          {/* 검증 결과 요약 */}
          <div
            className={`mb-4 rounded-lg p-4 ${
              validationResult.valid
                ? 'border border-green-200 bg-green-50'
                : 'border border-yellow-200 bg-yellow-50'
            }`}
          >
            <p
              className={`font-medium ${
                validationResult.valid ? 'text-green-900' : 'text-yellow-900'
              }`}
            >
              {validationResult.valid ? '✓' : '⚠'} 유효: {parsedData.filter((d) => d.valid).length}
              건, 오류: {validationResult.errors.length}건
            </p>
            {validationResult.errors.length > 0 && (
              <div className="mt-2">
                <p className="mb-1 text-sm font-medium text-red-700">오류 목록:</p>
                <ul className="max-h-40 list-inside list-disc space-y-1 overflow-y-auto text-sm text-red-600">
                  {validationResult.errors.slice(0, 10).map((error, idx) => (
                    <li key={idx}>
                      행 {error.row}: {error.message}
                    </li>
                  ))}
                  {validationResult.errors.length > 10 && (
                    <li className="text-gray-600">
                      ... 외 {validationResult.errors.length - 10}건
                    </li>
                  )}
                </ul>
              </div>
            )}
          </div>

          {/* 테이블 */}
          <div className="max-h-96 overflow-x-auto overflow-y-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="sticky top-0 bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                    상태
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                    이름
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                    날짜
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                    출석
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                    비고
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {parsedData.slice(0, 100).map((item, idx) => (
                  <tr key={idx} className={item.valid ? '' : 'bg-red-50'}>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {item.valid ? (
                        <span className="font-bold text-green-600">✓</span>
                      ) : (
                        <span className="font-bold text-red-600">✗</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm whitespace-nowrap text-gray-900">
                      {item.member_name || item.member_id?.substring(0, 8)}
                    </td>
                    <td className="px-4 py-3 text-sm whitespace-nowrap text-gray-900">
                      {item.date}
                    </td>
                    <td className="px-4 py-3 text-sm whitespace-nowrap">
                      <span
                        className={`rounded-full px-2 py-1 ${
                          item.is_available
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {item.is_available ? '참석' : '불참'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {item.notes || '-'}
                      {item.errors && (
                        <div className="mt-1 text-xs text-red-600">{item.errors.join(', ')}</div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {parsedData.length > 100 && (
              <p className="mt-4 text-center text-sm text-gray-500">
                ... 외 {parsedData.length - 100}건 (처음 100건만 표시)
              </p>
            )}
          </div>
        </div>
      )}

      {/* 업로드 결과 */}
      {uploadResult && (
        <div
          className={`rounded-lg p-6 ${
            uploadResult.success
              ? 'border border-green-200 bg-green-50'
              : 'border border-yellow-200 bg-yellow-50'
          }`}
        >
          <h4
            className={`mb-2 text-lg font-semibold ${
              uploadResult.success ? 'text-green-900' : 'text-yellow-900'
            }`}
          >
            {uploadResult.success ? '✓ 업로드 완료' : '⚠ 부분 성공'}
          </h4>
          <div className="space-y-1 text-sm">
            <p className="text-gray-700">
              전체: {uploadResult.total}건 / 성공: {uploadResult.succeeded}건 / 실패:{' '}
              {uploadResult.failed}건
            </p>
            {uploadResult.errors && uploadResult.errors.length > 0 && (
              <div className="mt-3">
                <p className="font-medium text-red-700">실패 항목:</p>
                <ul className="mt-1 max-h-40 list-inside list-disc overflow-y-auto text-red-600">
                  {uploadResult.errors.map((error, idx) => (
                    <li key={idx}>{error.error || error.message}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 액션 버튼 */}
      {parsedData.length > 0 && (
        <div className="flex gap-4">
          <button
            onClick={handleUpload}
            disabled={
              isProcessing ||
              !validationResult?.valid ||
              parsedData.filter((d) => d.valid).length === 0
            }
            className="flex-1 rounded-md bg-blue-600 px-6 py-3 text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isProcessing ? (
              <span className="flex items-center justify-center">
                <svg
                  className="mr-3 -ml-1 h-5 w-5 animate-spin text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                처리 중...
              </span>
            ) : (
              '업로드'
            )}
          </button>
          <button
            onClick={handleCancel}
            disabled={isProcessing}
            className="rounded-md bg-gray-600 px-6 py-3 text-white hover:bg-gray-700 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
          >
            취소
          </button>
        </div>
      )}
    </div>
  );
}
