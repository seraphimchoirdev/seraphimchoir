# 일괄 출석 입력 가이드

## 개요

찬양대원의 출석을 효율적으로 관리하기 위한 일괄 입력 기능입니다. 두 가지 방법으로 출석을 입력할 수 있습니다.

## 접근 방법

- URL: `/attendances/bulk`
- 권한: PART_LEADER, MANAGER, CONDUCTOR, ADMIN

## 입력 방법

### 1. 날짜별 일괄 입력 폼

특정 날짜의 출석을 한 번에 입력할 수 있습니다.

**사용 방법:**

1. 출석 날짜를 선택합니다
2. 파트별로 표시된 찬양대원 목록에서 출석 여부를 체크합니다
3. 불참하는 회원의 경우 불참 사유를 입력할 수 있습니다 (선택사항)
4. "제출" 버튼을 클릭하여 일괄 저장합니다

**편리한 기능:**

- "전체 선택" / "전체 해제" 버튼으로 모든 회원 선택 가능
- 파트별 "모두 선택" 버튼으로 파트 단위 선택 가능
- 선택된 인원이 실시간으로 표시됩니다

### 2. CSV 파일 업로드

여러 날짜의 출석 데이터를 CSV 파일로 한 번에 업로드할 수 있습니다.

**사용 방법:**

1. "CSV 템플릿 다운로드" 버튼을 클릭하여 기본 템플릿을 다운로드합니다
2. 다운로드한 CSV 파일을 Excel이나 Google Sheets로 열어 출석 정보를 입력합니다
3. 편집한 CSV 파일을 드래그 앤 드롭하거나 "파일 선택" 버튼으로 업로드합니다
4. 데이터 미리보기에서 오류가 없는지 확인합니다
5. "업로드" 버튼을 클릭하여 저장합니다

## CSV 파일 형식

### 필수 컬럼

- `member_id`: 찬양대원 고유 ID (UUID 형식)
- `member_name`: 찬양대원 이름
- `date`: 출석 날짜 (YYYY-MM-DD 형식, 예: 2024-01-15)
- `is_available`: 출석 여부 (참석/불참 또는 true/false)

### 선택 컬럼

- `notes`: 불참 사유 또는 기타 메모

### 예제 CSV

```csv
member_id,member_name,part,date,is_available,notes
550e8400-e29b-41d4-a716-446655440000,홍길동,SOPRANO,2024-01-15,true,
550e8400-e29b-41d4-a716-446655440001,김철수,TENOR,2024-01-15,false,개인 사정
550e8400-e29b-41d4-a716-446655440002,이영희,ALTO,2024-01-15,참석,
550e8400-e29b-41d4-a716-446655440003,박민수,BASS,2024-01-15,불참,출장
```

### is_available 허용 값

**참석 (true):**

- `true`, `1`, `yes`, `y`, `참석`, `o`

**불참 (false):**

- `false`, `0`, `no`, `n`, `불참`, `x`

## 데이터 검증

CSV 업로드 시 다음 항목들이 자동으로 검증됩니다:

1. **필수 필드 확인**
   - member_id 또는 member_name이 있는지 확인
   - date가 올바른 형식인지 확인
   - is_available 값이 유효한지 확인

2. **회원 존재 확인**
   - member_id 또는 member_name으로 실제 회원이 존재하는지 확인

3. **중복 확인**
   - 같은 회원의 같은 날짜 출석 기록이 중복되지 않는지 확인

4. **날짜 유효성**
   - 날짜가 실제로 존재하는 날짜인지 확인

## 처리 제한

- 한 번에 최대 100건씩 처리됩니다
- 100건 이상의 데이터는 자동으로 여러 번으로 나누어 처리됩니다
- CSV 파일 크기는 5MB로 제한됩니다

## 오류 처리

### 업로드 실패 시

- 실패한 항목의 목록이 표시됩니다
- 실패 원인이 함께 표시되어 수정할 수 있습니다
- 성공한 항목은 정상적으로 저장됩니다

### 부분 성공

- 일부 항목만 실패한 경우 성공/실패 통계가 표시됩니다
- 실패한 항목만 수정하여 다시 업로드할 수 있습니다

## 팁

### CSV 파일 편집 시

1. **Excel 사용 시**
   - CSV 파일을 열면 한글이 깨질 수 있습니다
   - "데이터 > 텍스트/CSV 가져오기"를 사용하여 UTF-8로 열어주세요

2. **Google Sheets 사용 시**
   - 파일 > 가져오기 > 업로드 > CSV를 선택하세요
   - 편집 후 "파일 > 다운로드 > CSV"로 저장하세요

3. **날짜 형식 주의**
   - Excel에서 날짜가 자동으로 변환될 수 있습니다
   - 셀 서식을 "텍스트"로 설정하면 YYYY-MM-DD 형식이 유지됩니다

### 대량 데이터 입력 시

1. 먼저 소량의 데이터로 테스트해보세요
2. 템플릿을 다운로드하여 정확한 형식을 확인하세요
3. 데이터 미리보기에서 오류를 확인하고 수정하세요

## 문제 해결

### "회원을 찾을 수 없습니다" 오류

- member_id가 정확한지 확인하세요
- member_name이 정확한지 확인하세요 (띄어쓰기, 오타 주의)
- 최신 템플릿을 다운로드하여 사용하세요

### "중복된 출석 기록" 오류

- 이미 해당 날짜에 출석 기록이 있는지 확인하세요
- CSV 파일 내에 같은 회원의 같은 날짜가 중복되어 있지 않은지 확인하세요

### "날짜 형식 오류"

- 날짜가 YYYY-MM-DD 형식인지 확인하세요
- 예: 2024-01-15 (O), 2024/01/15 (X), 01-15-2024 (X)

## API 엔드포인트

### POST /api/attendances/batch

일괄 출석 생성 API

**Request Body:**

```json
{
  "attendances": [
    {
      "member_id": "uuid",
      "date": "2024-01-15",
      "is_available": true,
      "notes": null
    }
  ]
}
```

**Response:**

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

## 관련 파일

- 페이지: `/src/app/attendances/bulk/page.tsx`
- 컴포넌트:
  - `/src/components/features/attendances/BulkAttendanceTabs.tsx`
  - `/src/components/features/attendances/BulkAttendanceForm.tsx`
  - `/src/components/features/attendances/AttendanceImporter.tsx`
- 유틸리티: `/src/lib/attendance.ts`
- API: `/src/app/api/attendances/batch/route.ts`
- 훅: `/src/hooks/useAttendances.ts`
