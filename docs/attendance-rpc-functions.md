# 출석 통계 RPC 함수 사용 가이드

이 문서는 Supabase에 구현된 출석 통계 RPC 함수들의 사용 방법을 설명합니다.

## 목차

1. [함수 개요](#함수-개요)
2. [함수 상세 설명](#함수-상세-설명)
3. [TypeScript 타입 정의](#typescript-타입-정의)
4. [API 통합 예시](#api-통합-예시)
5. [성능 최적화](#성능-최적화)
6. [에러 처리](#에러-처리)

---

## 함수 개요

| 함수명 | 용도 | 반환 타입 | 필수 파라미터 |
|--------|------|-----------|--------------|
| `get_attendance_statistics` | 전체 출석 통계 | JSON | start_date, end_date |
| `get_part_attendance_statistics` | 파트별 출석 통계 | TABLE | start_date, end_date |
| `get_member_attendance_history` | 개별 회원 출석 이력 | TABLE | member_id |
| `get_attendance_summary_by_date` | 날짜별 요약 통계 | TABLE | start_date, end_date |

---

## 함수 상세 설명

### 1. get_attendance_statistics

전체 출석 통계를 JSON 형태로 반환합니다.

**파라미터:**
- `p_start_date` (DATE, 필수): 시작 날짜
- `p_end_date` (DATE, 필수): 종료 날짜

**반환값 (JSON):**
```json
{
  "total_records": 100,
  "available_count": 85,
  "unavailable_count": 15,
  "attendance_rate": 85.00
}
```

**SQL 사용 예시:**
```sql
SELECT * FROM get_attendance_statistics('2025-01-01', '2025-01-31');
```

**Supabase Client 사용 예시:**
```typescript
const { data, error } = await supabase.rpc('get_attendance_statistics', {
  p_start_date: '2025-01-01',
  p_end_date: '2025-01-31'
});

if (error) {
  console.error('Error:', error);
} else {
  console.log('Total records:', data.total_records);
  console.log('Attendance rate:', data.attendance_rate + '%');
}
```

---

### 2. get_part_attendance_statistics

파트별 출석 통계를 테이블 형태로 반환합니다.

**파라미터:**
- `p_start_date` (DATE, 필수): 시작 날짜
- `p_end_date` (DATE, 필수): 종료 날짜

**반환값 (TABLE):**
| part | total_count | available_count | unavailable_count | attendance_rate |
|------|-------------|-----------------|-------------------|-----------------|
| SOPRANO | 30 | 25 | 5 | 83.33 |
| ALTO | 25 | 22 | 3 | 88.00 |
| TENOR | 28 | 24 | 4 | 85.71 |
| BASS | 17 | 14 | 3 | 82.35 |

**SQL 사용 예시:**
```sql
SELECT * FROM get_part_attendance_statistics('2025-01-01', '2025-03-31');
```

**Supabase Client 사용 예시:**
```typescript
const { data, error } = await supabase.rpc('get_part_attendance_statistics', {
  p_start_date: '2025-01-01',
  p_end_date: '2025-03-31'
});

if (error) {
  console.error('Error:', error);
} else {
  data?.forEach(stat => {
    console.log(`${stat.part}: ${stat.attendance_rate}%`);
  });
}
```

---

### 3. get_member_attendance_history

특정 회원의 출석 이력을 날짜 역순으로 반환합니다.

**파라미터:**
- `p_member_id` (UUID, 필수): 회원 ID
- `p_start_date` (DATE, 선택): 시작 날짜 (NULL이면 전체 조회)
- `p_end_date` (DATE, 선택): 종료 날짜 (NULL이면 전체 조회)

**반환값 (TABLE):**
| date | is_available | notes |
|------|--------------|-------|
| 2025-01-22 | true | NULL |
| 2025-01-15 | false | 개인 사정 |
| 2025-01-08 | true | NULL |

**SQL 사용 예시:**
```sql
-- 전체 이력 조회
SELECT * FROM get_member_attendance_history('uuid-here');

-- 기간 지정 조회
SELECT * FROM get_member_attendance_history('uuid-here', '2025-01-01', '2025-01-31');
```

**Supabase Client 사용 예시:**
```typescript
// 전체 이력 조회
const { data, error } = await supabase.rpc('get_member_attendance_history', {
  p_member_id: 'uuid-here'
});

// 기간 지정 조회
const { data, error } = await supabase.rpc('get_member_attendance_history', {
  p_member_id: 'uuid-here',
  p_start_date: '2025-01-01',
  p_end_date: '2025-01-31'
});

if (error) {
  console.error('Error:', error);
} else {
  data?.forEach(record => {
    console.log(`${record.date}: ${record.is_available ? '출석' : '결석'}`);
    if (record.notes) console.log(`  메모: ${record.notes}`);
  });
}
```

---

### 4. get_attendance_summary_by_date

날짜별 출석 요약 통계를 반환합니다.

**파라미터:**
- `p_start_date` (DATE, 필수): 시작 날짜
- `p_end_date` (DATE, 필수): 종료 날짜

**반환값 (TABLE):**
| date | total_count | available_count | unavailable_count | attendance_rate |
|------|-------------|-----------------|-------------------|-----------------|
| 2025-01-08 | 45 | 40 | 5 | 88.89 |
| 2025-01-15 | 42 | 38 | 4 | 90.48 |
| 2025-01-22 | 44 | 39 | 5 | 88.64 |

**SQL 사용 예시:**
```sql
SELECT * FROM get_attendance_summary_by_date('2025-01-01', '2025-01-31');
```

**Supabase Client 사용 예시:**
```typescript
const { data, error } = await supabase.rpc('get_attendance_summary_by_date', {
  p_start_date: '2025-01-01',
  p_end_date: '2025-01-31'
});

if (error) {
  console.error('Error:', error);
} else {
  data?.forEach(summary => {
    console.log(`${summary.date}: ${summary.available_count}/${summary.total_count} (${summary.attendance_rate}%)`);
  });
}
```

---

## TypeScript 타입 정의

`src/types/attendance-stats.types.ts`에 다음 타입을 정의하세요:

```typescript
// 전체 출석 통계
export interface AttendanceStatistics {
  total_records: number;
  available_count: number;
  unavailable_count: number;
  attendance_rate: number;
}

// 파트별 출석 통계
export interface PartAttendanceStatistics {
  part: 'SOPRANO' | 'ALTO' | 'TENOR' | 'BASS' | 'SPECIAL';
  total_count: number;
  available_count: number;
  unavailable_count: number;
  attendance_rate: number;
}

// 회원 출석 이력
export interface MemberAttendanceHistory {
  date: string; // ISO 8601 date format (YYYY-MM-DD)
  is_available: boolean;
  notes: string | null;
}

// 날짜별 요약 통계
export interface AttendanceSummaryByDate {
  date: string; // ISO 8601 date format (YYYY-MM-DD)
  total_count: number;
  available_count: number;
  unavailable_count: number;
  attendance_rate: number;
}
```

---

## API 통합 예시

### Next.js API Route 예시

`src/app/api/attendances/statistics/route.ts`:

```typescript
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import type { AttendanceStatistics } from '@/types/attendance-stats.types';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get('start_date');
  const endDate = searchParams.get('end_date');

  if (!startDate || !endDate) {
    return NextResponse.json(
      { error: '시작 날짜와 종료 날짜는 필수입니다.' },
      { status: 400 }
    );
  }

  const supabase = await createClient();

  const { data, error } = await supabase.rpc('get_attendance_statistics', {
    p_start_date: startDate,
    p_end_date: endDate
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data as AttendanceStatistics);
}
```

### React Query Hook 예시

`src/hooks/useAttendanceStatistics.ts`:

```typescript
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { AttendanceStatistics, PartAttendanceStatistics } from '@/types/attendance-stats.types';

// 전체 출석 통계
export function useAttendanceStatistics(startDate: string, endDate: string) {
  const supabase = createClient();

  return useQuery({
    queryKey: ['attendance-statistics', startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_attendance_statistics', {
        p_start_date: startDate,
        p_end_date: endDate
      });

      if (error) throw error;
      return data as AttendanceStatistics;
    },
    enabled: !!startDate && !!endDate
  });
}

// 파트별 출석 통계
export function usePartAttendanceStatistics(startDate: string, endDate: string) {
  const supabase = createClient();

  return useQuery({
    queryKey: ['part-attendance-statistics', startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_part_attendance_statistics', {
        p_start_date: startDate,
        p_end_date: endDate
      });

      if (error) throw error;
      return data as PartAttendanceStatistics[];
    },
    enabled: !!startDate && !!endDate
  });
}

// 회원 출석 이력
export function useMemberAttendanceHistory(
  memberId: string,
  startDate?: string,
  endDate?: string
) {
  const supabase = createClient();

  return useQuery({
    queryKey: ['member-attendance-history', memberId, startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_member_attendance_history', {
        p_member_id: memberId,
        p_start_date: startDate || null,
        p_end_date: endDate || null
      });

      if (error) throw error;
      return data as MemberAttendanceHistory[];
    },
    enabled: !!memberId
  });
}

// 날짜별 요약 통계
export function useAttendanceSummaryByDate(startDate: string, endDate: string) {
  const supabase = createClient();

  return useQuery({
    queryKey: ['attendance-summary-by-date', startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_attendance_summary_by_date', {
        p_start_date: startDate,
        p_end_date: endDate
      });

      if (error) throw error;
      return data as AttendanceSummaryByDate[];
    },
    enabled: !!startDate && !!endDate
  });
}
```

### 컴포넌트에서 사용 예시

```typescript
'use client';

import { useAttendanceStatistics, usePartAttendanceStatistics } from '@/hooks/useAttendanceStatistics';

export default function AttendanceDashboard() {
  const startDate = '2025-01-01';
  const endDate = '2025-01-31';

  const { data: overallStats, isLoading: isLoadingOverall } = useAttendanceStatistics(startDate, endDate);
  const { data: partStats, isLoading: isLoadingPart } = usePartAttendanceStatistics(startDate, endDate);

  if (isLoadingOverall || isLoadingPart) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h1>출석 통계 대시보드</h1>

      {/* 전체 통계 */}
      <section>
        <h2>전체 출석 통계</h2>
        <p>총 기록: {overallStats?.total_records}</p>
        <p>출석 가능: {overallStats?.available_count}</p>
        <p>출석률: {overallStats?.attendance_rate}%</p>
      </section>

      {/* 파트별 통계 */}
      <section>
        <h2>파트별 출석 통계</h2>
        <table>
          <thead>
            <tr>
              <th>파트</th>
              <th>총 인원</th>
              <th>출석률</th>
            </tr>
          </thead>
          <tbody>
            {partStats?.map(stat => (
              <tr key={stat.part}>
                <td>{stat.part}</td>
                <td>{stat.total_count}</td>
                <td>{stat.attendance_rate}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
```

---

## 성능 최적화

### 인덱스 활용

모든 RPC 함수는 기존 인덱스를 활용하여 최적화되어 있습니다:

- `idx_attendances_date`: 날짜 범위 필터링
- `idx_attendances_is_available`: 출석 상태 필터링
- `idx_attendances_member_id`: 회원별 조회
- `idx_members_part`: 파트별 조인

### 쿼리 성능 확인

다음 명령어로 쿼리 성능을 확인할 수 있습니다:

```sql
-- 전체 통계
EXPLAIN ANALYZE SELECT * FROM get_attendance_statistics('2025-01-01', '2025-12-31');

-- 파트별 통계
EXPLAIN ANALYZE SELECT * FROM get_part_attendance_statistics('2025-01-01', '2025-12-31');

-- 회원 이력
EXPLAIN ANALYZE SELECT * FROM get_member_attendance_history('uuid-here', '2025-01-01', '2025-12-31');

-- 날짜별 요약
EXPLAIN ANALYZE SELECT * FROM get_attendance_summary_by_date('2025-01-01', '2025-12-31');
```

### 추가 최적화 고려사항

데이터가 대량으로 증가하는 경우 다음 복합 인덱스를 고려할 수 있습니다:

```sql
-- 날짜와 출석 상태의 복합 인덱스
CREATE INDEX idx_attendances_date_available ON attendances(date, is_available);

-- 회원 ID와 날짜의 복합 인덱스 (역순 정렬 최적화)
CREATE INDEX idx_attendances_member_date ON attendances(member_id, date DESC);
```

---

## 에러 처리

### 일반적인 에러 시나리오

1. **잘못된 날짜 범위**
   ```typescript
   // 시작 날짜 > 종료 날짜
   const { error } = await supabase.rpc('get_attendance_statistics', {
     p_start_date: '2025-12-31',
     p_end_date: '2025-01-01'
   });
   // Error: 시작 날짜는 종료 날짜보다 이전이어야 합니다.
   ```

2. **NULL 파라미터**
   ```typescript
   const { error } = await supabase.rpc('get_attendance_statistics', {
     p_start_date: null,
     p_end_date: '2025-01-31'
   });
   // Error: 시작 날짜와 종료 날짜는 필수 입력값입니다.
   ```

3. **존재하지 않는 회원**
   ```typescript
   const { error } = await supabase.rpc('get_member_attendance_history', {
     p_member_id: 'invalid-uuid'
   });
   // Error: 존재하지 않는 회원입니다.
   ```

### 에러 처리 패턴

```typescript
async function fetchAttendanceStats(startDate: string, endDate: string) {
  try {
    const supabase = createClient();

    const { data, error } = await supabase.rpc('get_attendance_statistics', {
      p_start_date: startDate,
      p_end_date: endDate
    });

    if (error) {
      // Supabase 에러 처리
      console.error('Supabase error:', error.message);
      throw new Error(`통계 조회 실패: ${error.message}`);
    }

    return data;
  } catch (error) {
    // 일반 에러 처리
    console.error('Unexpected error:', error);
    throw error;
  }
}
```

---

## 보안 및 권한

### Row Level Security (RLS)

모든 RPC 함수는 `SECURITY DEFINER`로 설정되어 있으며, `authenticated` 역할을 가진 사용자만 실행할 수 있습니다.

```sql
-- 함수 실행 권한 확인
SELECT routine_name, security_type
FROM information_schema.routines
WHERE routine_name LIKE 'get_attendance%';
```

### 권한 관리

- **조회 권한**: 모든 인증된 사용자
- **데이터 수정**: PART_LEADER 이상 (attendances 테이블의 RLS 정책 참조)
- **RPC 함수 실행**: authenticated 역할

---

## 마이그레이션 적용

### 로컬 환경

```bash
# 마이그레이션 적용
npx supabase db reset

# 또는 특정 마이그레이션만 실행
npx supabase migration up
```

### 프로덕션 환경

```bash
# Supabase 프로젝트와 연결
npx supabase link --project-ref <project-id>

# 마이그레이션 푸시
npx supabase db push
```

---

## 참고 자료

- [Supabase RPC 문서](https://supabase.com/docs/guides/database/functions)
- [PostgreSQL 함수 문서](https://www.postgresql.org/docs/current/sql-createfunction.html)
- [프로젝트 데이터베이스 스키마](/supabase/migrations/20250118000000_initial_schema.sql)
