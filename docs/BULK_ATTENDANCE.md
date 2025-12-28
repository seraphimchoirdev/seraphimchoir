# 일괄 출석 입력 가이드

## 개요

일괄 출석 입력 기능은 찬양대원의 출석 정보를 효율적으로 입력할 수 있는 두 가지 방법을 제공합니다:

1. **날짜별 일괄 입력 폼**: 특정 날짜의 모든 찬양대원 출석을 한 화면에서 입력
2. **CSV 파일 업로드**: 여러 날짜의 출석 정보를 CSV 파일로 일괄 업로드

## 접근 경로

- URL: `/attendances/bulk`
- 필요 권한: `PART_LEADER` 이상 (ADMIN, CONDUCTOR, MANAGER, PART_LEADER)

## 기능 1: 날짜별 일괄 입력

### 사용 방법

1. 출석 날짜 선택
2. 각 파트별로 출석/불참 체크박스 선택
3. 불참 회원의 경우 불참 사유 입력 (선택)
4. 제출 버튼 클릭

### 주요 기능

- **전체 선택/해제**: 모든 찬양대원을 한 번에 선택/해제
- **파트별 선택**: 각 파트의 모든 회원을 한 번에 선택
- **실시간 통계**: 선택된 인원 카운트 표시
- **청크 처리**: 100건씩 자동 분할 처리
- **진행 상황 표시**: 처리 중 로딩 표시
- **결과 요약**: 성공/실패 건수 표시

### UI 구조

```
┌────────────────────────────────────────┐
│ 일괄 출석 입력                          │
├────────────────────────────────────────┤
│ 날짜: [2025-01-15] [선택]              │
│ 선택된 인원: 25 / 50명                  │
│                                        │
│ [✓ 전체 선택]  [ 전체 해제]            │
│                                        │
│ SOPRANO (12명) [모두 선택]              │
│ [✓] 홍길동         [               ]   │
│ [✓] 김영희         [               ]   │
│ [ ] 이철수         [ 개인 사정      ]   │
│                                        │
│ ALTO (13명) [모두 선택]                 │
│ ...                                    │
│                                        │
│ [제출]  [초기화]                       │
└────────────────────────────────────────┘
```

## 기능 2: CSV 파일 업로드

### CSV 템플릿

CSV 템플릿 다운로드 버튼을 클릭하여 현재 모든 찬양대원 정보가 포함된 템플릿을 받을 수 있습니다.

### CSV 형식

```csv
member_id,member_name,part,date,is_available,notes
uuid-1234,홍길동,SOPRANO,2025-01-15,true,
uuid-5678,김철수,ALTO,2025-01-15,false,개인 사정
```

#### 필수 컬럼

- `member_id` 또는 `member_name`: 찬양대원 식별 (둘 중 하나 필수)
- `date`: 출석 날짜 (YYYY-MM-DD 형식)
- `is_available`: 출석 여부

#### 선택 컬럼

- `notes`: 불참 사유 또는 메모
- `part`: 파트 정보 (템플릿 생성 시 포함, 검증에는 사용 안 함)

#### is_available 허용 값

**참석 (true)**:
- `true`, `1`, `yes`, `y`, `참석`, `o`

**불참 (false)**:
- `false`, `0`, `no`, `n`, `불참`, `x`

### 사용 방법

1. **CSV 템플릿 다운로드** 버튼 클릭
2. 다운로드된 CSV 파일을 엑셀이나 구글 시트에서 열기
3. `is_available` 컬럼 수정 (참석은 true/o, 불참은 false/x)
4. 불참자의 경우 `notes` 컬럼에 사유 입력
5. CSV로 저장 (UTF-8 인코딩 권장)
6. 파일을 드래그 앤 드롭하거나 파일 선택 버튼으로 업로드
7. 미리보기에서 데이터 확인
8. 업로드 버튼 클릭

### 데이터 검증

시스템은 다음 항목을 자동으로 검증합니다:

- ✓ 필수 컬럼 존재 여부
- ✓ 날짜 형식 (YYYY-MM-DD)
- ✓ 회원 ID/이름이 실제로 존재하는지 확인
- ✓ 중복 기록 확인 (동일 회원, 동일 날짜)
- ✓ 날짜 유효성 (실제 달력 날짜인지)

### 미리보기 화면

업로드한 CSV 파일은 테이블 형태로 미리보기됩니다:

- 🟢 **초록색 체크**: 유효한 데이터
- 🔴 **빨간색 X**: 오류가 있는 데이터
- 오류가 있는 행은 빨간 배경으로 표시
- 각 오류 항목의 상세 메시지 표시

### 제한사항

- 파일 크기: 최대 5MB
- 파일 형식: CSV만 허용
- 동시 처리: 최대 100건씩 청크 단위로 처리
- 중복 기록: 동일 회원의 동일 날짜 출석은 중복 불가

## API 엔드포인트

### POST /api/attendances/batch

일괄 출석 기록 생성

**요청 본문:**
```json
{
  "attendances": [
    {
      "member_id": "uuid",
      "date": "2024-01-01",
      "is_available": true,
      "notes": null
    },
    {
      "member_id": "uuid",
      "date": "2024-01-01",
      "is_available": false,
      "notes": "개인 사정"
    }
  ]
}
```

**응답:**
```json
{
  "success": true,
  "data": [...],
  "summary": {
    "total": 10,
    "succeeded": 8,
    "failed": 2
  },
  "errors": [...]
}
```

## 에러 처리

### 일반적인 오류

1. **CSV 파싱 실패**
   - 원인: 잘못된 CSV 형식
   - 해결: CSV 파일 형식 확인

2. **필수 컬럼 누락**
   - 원인: member_id/member_name, date, is_available 중 누락
   - 해결: 템플릿 사용 권장

3. **회원을 찾을 수 없음**
   - 원인: member_id가 잘못되었거나 member_name이 정확하지 않음
   - 해결: 템플릿의 회원 정보 사용

4. **중복 기록**
   - 원인: 이미 해당 날짜에 출석 기록이 존재
   - 해결: 기존 기록 확인 후 필요시 수정 API 사용

5. **날짜 형식 오류**
   - 원인: YYYY-MM-DD 형식이 아님
   - 해결: 날짜 형식 확인 (예: 2025-01-15)

### 부분 실패 처리

- 일부 데이터만 실패한 경우에도 성공한 데이터는 저장됨
- 실패한 항목은 결과 화면에 목록으로 표시됨
- 실패한 항목만 수정하여 다시 업로드 가능

## 성능 최적화

- **청크 처리**: 100건씩 분할하여 서버 부하 최소화
- **클라이언트 검증**: 서버 요청 전 클라이언트에서 1차 검증
- **React Query 캐싱**: 회원 목록 등 자주 사용되는 데이터 캐싱
- **프로그레스 표시**: 사용자에게 진행 상황 실시간 피드백

## 보안

- 권한 확인: PART_LEADER 이상만 접근 가능
- 파일 크기 제한: 5MB 이하
- 파일 타입 검증: CSV만 허용
- SQL 인젝션 방지: Supabase 파라미터 바인딩 사용
- XSS 방지: CSV 내용 sanitization

## 개발자 참고

### 주요 파일

- `/src/app/attendances/bulk/page.tsx` - 페이지 컴포넌트 (서버)
- `/src/components/features/attendances/BulkAttendanceTabs.tsx` - 탭 UI
- `/src/components/features/attendances/BulkAttendanceForm.tsx` - 날짜별 입력 폼
- `/src/components/features/attendances/AttendanceImporter.tsx` - CSV 업로드
- `/src/lib/attendance.ts` - CSV 처리 유틸리티
- `/src/hooks/useAttendances.ts` - React Query 훅

### 사용된 라이브러리

- `papaparse`: CSV 파싱
- `@tanstack/react-query`: 서버 상태 관리
- `zustand`: 클라이언트 상태 관리 (선택적)

### 타입 정의

```typescript
interface BulkAttendanceInput {
  member_id: string;
  date: string; // YYYY-MM-DD
  is_available: boolean;
  notes?: string | null;
}

interface ParsedAttendance extends BulkAttendanceInput {
  member_name?: string;
  valid: boolean;
  errors?: string[];
  rowIndex?: number;
}

interface ValidationResult {
  valid: boolean;
  data: ParsedAttendance[];
  errors: Array<{ row: number; message: string }>;
}
```

## 향후 개선 사항

- [ ] Excel 파일 지원 (.xlsx)
- [ ] 출석 기록 일괄 수정 기능
- [ ] 출석 기록 일괄 삭제 기능
- [ ] CSV 다운로드 (기존 출석 데이터)
- [ ] 날짜 범위 선택 (여러 날짜 한 번에)
- [ ] 파트별 필터링
- [ ] 출석률 자동 계산 및 표시
- [ ] 이메일 알림 (출석 입력 완료 시)

## 문의

문제가 발생하거나 개선 사항이 있으면 GitHub Issues에 등록해 주세요.
