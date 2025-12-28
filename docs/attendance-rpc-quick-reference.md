# 출석 통계 RPC 함수 빠른 참조 카드

> 개발자를 위한 출석 통계 RPC 함수 빠른 참조 가이드

---

## 함수 목록

| 함수명 | 용도 | 반환 타입 |
|--------|------|-----------|
| `get_attendance_statistics` | 전체 출석 통계 | JSON |
| `get_part_attendance_statistics` | 파트별 출석 통계 | TABLE |
| `get_member_attendance_history` | 개별 회원 출석 이력 | TABLE |
| `get_attendance_summary_by_date` | 날짜별 요약 통계 | TABLE |

---

## 1. get_attendance_statistics

**전체 출석 통계 (JSON)**

```typescript
// React Query Hook
import { useAttendanceStatistics } from '@/hooks/useAttendanceStatistics';

const { data } = useAttendanceStatistics('2025-01-01', '2025-01-31');

// data 구조
{
  total_records: 100,
  available_count: 85,
  unavailable_count: 15,
  attendance_rate: 85.00
}
```

```typescript
// Supabase Client 직접 호출
const { data, error } = await supabase.rpc('get_attendance_statistics', {
  p_start_date: '2025-01-01',
  p_end_date: '2025-01-31'
});
```

---

## 2. get_part_attendance_statistics

**파트별 출석 통계 (배열)**

```typescript
// React Query Hook
import { usePartAttendanceStatistics } from '@/hooks/useAttendanceStatistics';

const { data } = usePartAttendanceStatistics('2025-01-01', '2025-03-31');

// data 구조 (배열)
[
  {
    part: 'SOPRANO',
    total_count: 30,
    available_count: 25,
    unavailable_count: 5,
    attendance_rate: 83.33
  },
  // ... 다른 파트들
]
```

```typescript
// Supabase Client 직접 호출
const { data, error } = await supabase.rpc('get_part_attendance_statistics', {
  p_start_date: '2025-01-01',
  p_end_date: '2025-03-31'
});
```

---

## 3. get_member_attendance_history

**개별 회원 출석 이력 (배열)**

```typescript
// React Query Hook
import { useMemberAttendanceHistory } from '@/hooks/useAttendanceStatistics';

// 전체 이력
const { data } = useMemberAttendanceHistory('uuid-here');

// 기간 지정
const { data } = useMemberAttendanceHistory('uuid-here', '2025-01-01', '2025-01-31');

// data 구조 (배열, 날짜 역순)
[
  {
    date: '2025-01-26',
    is_available: true,
    notes: null
  },
  {
    date: '2025-01-19',
    is_available: false,
    notes: '개인 사정'
  },
  // ... 이전 기록들
]
```

```typescript
// Supabase Client 직접 호출
const { data, error } = await supabase.rpc('get_member_attendance_history', {
  p_member_id: 'uuid-here',
  p_start_date: '2025-01-01', // 선택사항
  p_end_date: '2025-01-31'    // 선택사항
});
```

---

## 4. get_attendance_summary_by_date

**날짜별 요약 통계 (배열)**

```typescript
// React Query Hook
import { useAttendanceSummaryByDate } from '@/hooks/useAttendanceStatistics';

const { data } = useAttendanceSummaryByDate('2025-01-01', '2025-01-31');

// data 구조 (배열, 날짜 오름차순)
[
  {
    date: '2025-01-05',
    total_count: 45,
    available_count: 40,
    unavailable_count: 5,
    attendance_rate: 88.89
  },
  // ... 다른 날짜들
]
```

```typescript
// Supabase Client 직접 호출
const { data, error } = await supabase.rpc('get_attendance_summary_by_date', {
  p_start_date: '2025-01-01',
  p_end_date: '2025-01-31'
});
```

---

## 컴포넌트 예시

### 전체 통계 대시보드

```typescript
'use client';

import { useAttendanceStatistics, usePartAttendanceStatistics } from '@/hooks/useAttendanceStatistics';

export default function AttendanceDashboard() {
  const startDate = '2025-01-01';
  const endDate = '2025-01-31';

  const { data: stats, isLoading } = useAttendanceStatistics(startDate, endDate);
  const { data: partStats } = usePartAttendanceStatistics(startDate, endDate);

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      <h1>출석 통계</h1>
      <div>
        <p>총 기록: {stats?.total_records}</p>
        <p>출석 가능: {stats?.available_count}</p>
        <p>출석률: {stats?.attendance_rate}%</p>
      </div>

      <h2>파트별 통계</h2>
      <table>
        <thead>
          <tr>
            <th>파트</th>
            <th>출석률</th>
          </tr>
        </thead>
        <tbody>
          {partStats?.map(stat => (
            <tr key={stat.part}>
              <td>{stat.part}</td>
              <td>{stat.attendance_rate}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

### 회원 출석 이력

```typescript
'use client';

import { useMemberAttendanceHistory } from '@/hooks/useAttendanceStatistics';

export default function MemberAttendance({ memberId }: { memberId: string }) {
  const { data: history, isLoading } = useMemberAttendanceHistory(memberId);

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      <h2>출석 이력</h2>
      <ul>
        {history?.map((record, idx) => (
          <li key={idx}>
            {record.date}: {record.is_available ? '출석' : '결석'}
            {record.notes && ` - ${record.notes}`}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

---

## SQL 직접 호출

```sql
-- 전체 통계
SELECT * FROM get_attendance_statistics('2025-01-01', '2025-01-31');

-- 파트별 통계
SELECT * FROM get_part_attendance_statistics('2025-01-01', '2025-03-31');

-- 회원 이력 (전체)
SELECT * FROM get_member_attendance_history('uuid-here');

-- 회원 이력 (기간 지정)
SELECT * FROM get_member_attendance_history('uuid-here', '2025-01-01', '2025-01-31');

-- 날짜별 요약
SELECT * FROM get_attendance_summary_by_date('2025-01-01', '2025-01-31');
```

---

## 에러 처리

```typescript
const { data, error, isError } = useAttendanceStatistics('2025-01-01', '2025-01-31');

if (isError) {
  console.error('Error:', error.message);
  // 일반적인 에러:
  // - "시작 날짜는 종료 날짜보다 이전이어야 합니다."
  // - "시작 날짜와 종료 날짜는 필수 입력값입니다."
  // - "존재하지 않는 회원입니다."
}
```

---

## 유용한 패턴

### 1. 날짜 범위 동적 생성

```typescript
// 최근 1개월
const endDate = new Date().toISOString().split('T')[0];
const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  .toISOString()
  .split('T')[0];

const { data } = useAttendanceStatistics(startDate, endDate);
```

### 2. 조건부 렌더링

```typescript
const { data, isLoading, isError } = useAttendanceStatistics(start, end);

if (isLoading) return <Spinner />;
if (isError) return <ErrorMessage />;
if (!data) return <NoData />;

return <Dashboard data={data} />;
```

### 3. 캐싱 활용

```typescript
// React Query는 자동으로 캐싱합니다 (5분)
// 동일한 날짜 범위로 호출 시 캐시된 데이터 사용
const { data: jan } = useAttendanceStatistics('2025-01-01', '2025-01-31');
const { data: feb } = useAttendanceStatistics('2025-02-01', '2025-02-28');
```

---

## 성능 팁

1. **적절한 날짜 범위 사용**: 너무 긴 기간은 성능 저하 가능
2. **React Query 캐싱 활용**: 5분 동안 캐시 유지
3. **필요한 데이터만 조회**: 전체 이력보다는 기간 지정
4. **서버 컴포넌트 활용**: 초기 데이터는 SSR로 로드

---

## 참고 문서

- **상세 가이드**: `/docs/attendance-rpc-functions.md`
- **테스트 쿼리**: `/docs/attendance-rpc-test-queries.sql`
- **구현 요약**: `/docs/ATTENDANCE_RPC_IMPLEMENTATION_SUMMARY.md`
- **타입 정의**: `/src/types/attendance-stats.types.ts`
- **Hooks**: `/src/hooks/useAttendanceStatistics.ts`

---

**버전**: 1.0
**최종 업데이트**: 2025-11-20
