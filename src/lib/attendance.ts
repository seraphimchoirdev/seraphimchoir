import Papa from 'papaparse';

import type { TablesInsert } from '@/types/database.types';

/**
 * 파싱된 출석 데이터 타입
 */
export interface ParsedAttendance {
  member_id?: string;
  member_name?: string;
  date: string;
  is_available: boolean;
  notes?: string | null;
  valid: boolean;
  errors?: string[];
  rowIndex?: number; // 원본 CSV 행 번호 (디버깅용)
}

/**
 * CSV 검증 결과 타입
 */
export interface ValidationResult {
  valid: boolean;
  data: ParsedAttendance[];
  errors: Array<{ row: number; message: string }>;
}

/**
 * 회원 정보 타입 (검증용)
 */
export interface MemberInfo {
  id: string;
  name: string;
  part: string;
}

/**
 * CSV 파일을 파싱하여 출석 데이터 배열 반환
 * @param file - CSV 파일
 * @returns 파싱된 출석 데이터 배열
 */
export async function parseAttendanceCSV(file: File): Promise<ParsedAttendance[]> {
  return new Promise((resolve, reject) => {
    // 파일 크기 제한 (5MB)
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    if (file.size > MAX_FILE_SIZE) {
      reject(new Error('파일 크기는 5MB를 초과할 수 없습니다'));
      return;
    }

    // 파일 타입 검증
    if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
      reject(new Error('CSV 파일만 업로드 가능합니다'));
      return;
    }

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false, // 문자열로 파싱 (나중에 검증)
      complete: (results) => {
        const parsedData: ParsedAttendance[] = (results.data as Record<string, unknown>[]).map(
          (row, index: number) => {
            const errors: string[] = [];

            // member_id 또는 member_name 확인
            const memberId = (row.member_id as string | undefined)?.trim();
            const memberName = (row.member_name as string | undefined)?.trim();

            if (!memberId && !memberName) {
              errors.push('member_id 또는 member_name이 필요합니다');
            }

            // 날짜 확인 및 검증
            const date = (row.date as string | undefined)?.trim();
            if (!date) {
              errors.push('date가 필요합니다');
            } else if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
              errors.push('날짜 형식은 YYYY-MM-DD여야 합니다');
            }

            // is_available 확인 및 변환
            let isAvailable = true;
            const availableValue = (row.is_available as string | undefined)
              ?.toString()
              .toLowerCase()
              .trim();

            if (availableValue === undefined || availableValue === '') {
              errors.push('is_available이 필요합니다');
            } else if (
              availableValue === 'true' ||
              availableValue === '1' ||
              availableValue === 'yes' ||
              availableValue === 'y' ||
              availableValue === '참석' ||
              availableValue === 'o'
            ) {
              isAvailable = true;
            } else if (
              availableValue === 'false' ||
              availableValue === '0' ||
              availableValue === 'no' ||
              availableValue === 'n' ||
              availableValue === '불참' ||
              availableValue === 'x'
            ) {
              isAvailable = false;
            } else {
              errors.push(
                `is_available 값이 유효하지 않습니다: "${availableValue}". true/false, 참석/불참, o/x 등을 사용하세요`
              );
            }

            // notes (선택적)
            const notes = (row.notes as string | undefined)?.trim() || null;

            return {
              member_id: memberId || undefined,
              member_name: memberName || undefined,
              date: date || '',
              is_available: isAvailable,
              notes,
              valid: errors.length === 0,
              errors: errors.length > 0 ? errors : undefined,
              rowIndex: index + 2, // +2: 헤더 행 + 0-based index
            };
          }
        );

        resolve(parsedData);
      },
      error: (error) => {
        reject(new Error(`CSV 파싱 실패: ${error.message}`));
      },
    });
  });
}

/**
 * 파싱된 데이터의 유효성 검증
 * @param data - 파싱된 출석 데이터 배열
 * @param members - 전체 회원 목록 (검증용)
 * @returns 검증 결과
 */
export function validateAttendanceData(
  data: ParsedAttendance[],
  members: MemberInfo[]
): ValidationResult {
  const errors: Array<{ row: number; message: string }> = [];
  const validatedData: ParsedAttendance[] = [];

  // 회원 ID -> 회원 정보 맵 생성
  const memberIdMap = new Map(members.map((m) => [m.id, m]));
  const memberNameMap = new Map(members.map((m) => [m.name, m]));

  // 중복 체크용 Set (member_id + date 조합)
  const duplicateCheck = new Set<string>();

  data.forEach((item) => {
    const itemErrors: string[] = item.errors ? [...item.errors] : [];
    const validatedItem = { ...item };

    // 기본 필드 검증은 이미 parseAttendanceCSV에서 완료
    if (item.errors && item.errors.length > 0) {
      errors.push({
        row: item.rowIndex || 0,
        message: item.errors.join(', '),
      });
      validatedData.push({ ...validatedItem, valid: false });
      return;
    }

    // 회원 ID 검증 또는 이름으로 ID 찾기
    let memberId = item.member_id;

    if (!memberId && item.member_name) {
      // 이름으로 회원 찾기
      const member = memberNameMap.get(item.member_name);
      if (member) {
        memberId = member.id;
        validatedItem.member_id = member.id;
      } else {
        itemErrors.push(`회원을 찾을 수 없습니다: "${item.member_name}"`);
      }
    } else if (memberId) {
      // ID로 회원 확인
      if (!memberIdMap.has(memberId)) {
        itemErrors.push(`존재하지 않는 회원 ID: "${memberId}"`);
      }
    }

    // 중복 체크
    if (memberId && item.date) {
      const key = `${memberId}-${item.date}`;
      if (duplicateCheck.has(key)) {
        itemErrors.push(`중복된 출석 기록: ${item.member_name || memberId}, ${item.date}`);
      } else {
        duplicateCheck.add(key);
      }
    }

    // 날짜 유효성 추가 검증 (실제 날짜인지 확인)
    if (item.date) {
      const dateObj = new Date(item.date);
      if (isNaN(dateObj.getTime())) {
        itemErrors.push(`유효하지 않은 날짜: "${item.date}"`);
      }
    }

    // 검증 결과 적용
    if (itemErrors.length > 0) {
      errors.push({
        row: item.rowIndex || 0,
        message: itemErrors.join(', '),
      });
      validatedData.push({ ...validatedItem, valid: false, errors: itemErrors });
    } else {
      validatedData.push({ ...validatedItem, valid: true, errors: undefined });
    }
  });

  return {
    valid: errors.length === 0,
    data: validatedData,
    errors,
  };
}

/**
 * 회원 목록을 기반으로 CSV 템플릿 생성
 * @param members - 회원 목록
 * @param date - 기본 날짜 (선택적)
 * @returns CSV 문자열
 */
export function generateAttendanceTemplate(members: MemberInfo[], date?: string): string {
  const defaultDate = date || new Date().toISOString().split('T')[0];

  // CSV 헤더
  const headers = ['member_id', 'member_name', 'part', 'date', 'is_available', 'notes'];

  // CSV 행 생성
  const rows = members.map((member) => [
    member.id,
    member.name,
    member.part,
    defaultDate,
    'true', // 기본값: 참석
    '', // notes는 빈값
  ]);

  // CSV 문자열 생성
  const csvContent = [
    headers.join(','),
    ...rows.map((row) =>
      row
        .map((cell) => {
          // 쉼표나 따옴표가 포함된 경우 따옴표로 감싸기
          const cellStr = String(cell);
          if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
            return `"${cellStr.replace(/"/g, '""')}"`;
          }
          return cellStr;
        })
        .join(',')
    ),
  ].join('\n');

  return csvContent;
}

/**
 * CSV 파일 다운로드 트리거
 * @param content - CSV 문자열
 * @param filename - 파일명
 */
export function downloadCSV(content: string, filename: string): void {
  // BOM 추가 (Excel에서 한글 깨짐 방지)
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + content], { type: 'text/csv;charset=utf-8;' });

  // 다운로드 링크 생성
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // 메모리 해제
  URL.revokeObjectURL(url);
}

/**
 * ParsedAttendance를 TablesInsert<'attendances'>로 변환
 * @param parsedAttendances - 파싱된 출석 데이터 배열
 * @returns Supabase Insert 타입 배열
 */
export function convertToAttendanceInserts(
  parsedAttendances: ParsedAttendance[]
): TablesInsert<'attendances'>[] {
  return parsedAttendances
    .filter((item) => item.valid && item.member_id)
    .map((item) => ({
      member_id: item.member_id!,
      date: item.date,
      is_available: item.is_available,
      notes: item.notes || null,
    }));
}
