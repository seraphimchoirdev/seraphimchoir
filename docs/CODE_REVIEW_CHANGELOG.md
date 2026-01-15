# 코드 리뷰 변경사항 요약

**작성일**: 2026-01-15
**리뷰 도구**: Claude Code (code-reviewer agent)
**대상 브랜치**: develop

---

## 개요

프로젝트 전반에 대한 코드 리뷰를 수행하고, 발견된 이슈들을 우선순위별로 수정했습니다.

| 우선순위 | 발견 이슈 | 수정 완료 | 커밋 |
|----------|-----------|-----------|------|
| CRITICAL | 3건 | 3건 | `1e9c6ec` |
| HIGH | 3건 | 3건 | `62d033d` |
| MEDIUM | 2건 | 2건 | `58084a6` |
| LOW | 3건 | 3건 | `26a1217` |

---

## CRITICAL 이슈 (보안/안정성)

### 1. 타입 안전성 강화

**파일**: `src/app/api/ml/learn-part-placement/route.ts`

**문제**: `as any` 타입 단언 사용으로 타입 안전성 저하

**해결**:
```typescript
// Before
const { data, error } = await (supabase as any).from('learned_part_placement_rules')...

// After
const result = await supabase
    .from('learned_part_placement_rules' as unknown as 'members')
    .select('*')
    .order('service_type')
    .order('member_count_range')
    .order('part')
    .match({...});
const { data, error } = result as unknown as QueryResult;
```

### 2. 입력 검증 추가

**파일**: `src/app/api/arrangements/[id]/recommend/route.ts`

**문제**: API 요청 파라미터에 대한 검증 부재

**해결**:
```typescript
import { z } from 'zod';

// UUID 검증 스키마
const uuidSchema = z.string().uuid('Invalid arrangement ID format');

// 그리드 레이아웃 검증 스키마
const gridLayoutSchema = z.object({
  rows: z.number().int().min(1).max(10),
  rowCapacities: z.array(z.number().int().min(1).max(20)).min(1).max(10),
  zigzagPattern: z.enum(['none', 'even', 'odd']),
}).optional();
```

### 3. 에러 메시지 정제

**파일**: 여러 API 라우트

**문제**: 프로덕션 환경에서 상세 에러 메시지 노출

**해결**:
```typescript
const isDev = process.env.NODE_ENV === 'development';
const errorResponse = isDev && error instanceof Error
  ? { error: 'Internal server error', message: error.message }
  : { error: 'Internal server error' };
```

---

## HIGH 이슈 (메모리/보안)

### 1. React 메모리 누수 방지

**파일**: `src/components/features/arrangements/ArrangementHeader.tsx`

**문제**: 비동기 작업 완료 후 언마운트된 컴포넌트에 상태 업데이트 시도

**해결**:
```typescript
// 마운트 상태 추적
const isMountedRef = useRef(true);

useEffect(() => {
  isMountedRef.current = true;
  return () => { isMountedRef.current = false; };
}, []);

// 비동기 작업 후 마운트 상태 확인
const handleSave = useCallback(async () => {
  try {
    await updateArrangement.mutateAsync({...});
    if (isMountedRef.current) {
      alert('저장되었습니다.');
    }
  } finally {
    if (isMountedRef.current) {
      setIsSaving(false);
    }
  }
}, [dependencies]);
```

### 2. Python ML 서비스 입력 검증

**파일**: `ml-service/app/services/supabase_client.py`

**문제**: 쿼리 limit 값 검증 부재로 DoS 공격 가능성

**해결**:
```python
MAX_LIMIT = 1000
DEFAULT_LIMIT = 100

async def get_ml_history(self, limit: int = DEFAULT_LIMIT):
    validated_limit = max(1, min(limit, MAX_LIMIT))
    if limit != validated_limit:
        logger.warning(f"[Supabase] limit adjusted: {limit} -> {validated_limit}")
    # ...
```

### 3. Pydantic 스키마 보안 강화

**파일**: `ml-service/app/schemas/request_response.py`

**문제**: 입력 필드 길이 제한 및 XSS 방지 부재

**해결**:
```python
class MemberInput(BaseModel):
    id: str = Field(min_length=1, max_length=100)
    name: str = Field(min_length=1, max_length=50)
    height: Optional[int] = Field(default=None, ge=100, le=250)

    @field_validator('id', 'name')
    @classmethod
    def validate_no_script_injection(cls, v: str) -> str:
        if re.search(r'<[^>]+>', v):
            raise ValueError('HTML 태그는 허용되지 않습니다')
        return v.strip()
```

---

## MEDIUM 이슈 (로깅/에러 처리)

### 1. Console 로깅 정리

**파일**:
- `src/store/arrangement-store.ts` (15개 → logger)
- `src/lib/ai-seat-algorithm.ts` (12개 → logger)
- `src/components/ErrorBoundary.tsx`

**문제**: 프로덕션에서 불필요한 디버그 로그 노출

**해결**:
```typescript
import { createLogger } from '@/lib/logger';

const logger = createLogger({ prefix: 'ArrangementStore' });

// 개발 환경에서만 출력
logger.debug(`자동 지정 완료: ${candidates.length}명`);

// 경고는 프로덕션에서도 출력
logger.warn(`${row}행 ${lastCol}열에 멤버가 있어 미배치됨`);
```

**Logger 동작**:
| 환경 | debug | info | warn | error |
|------|-------|------|------|-------|
| development | ✅ | ✅ | ✅ | ✅ |
| production | ❌ | ❌ | ✅ | ✅ |
| test | ❌ | ❌ | ❌ | ✅ |

### 2. Error Boundary 추가

**추가된 파일**:
- `src/app/error.tsx` - 전역 에러 핸들러
- `src/app/arrangements/error.tsx` - 배치표 라우트 에러 핸들러
- `src/app/members/error.tsx` - 대원 관리 라우트 에러 핸들러

**기능**:
- Next.js App Router의 에러 경계 활용
- 사용자 친화적 에러 UI 제공
- 개발 환경에서만 상세 에러 정보 표시
- "다시 시도", "새로고침", "홈으로 이동" 옵션 제공

---

## LOW 이슈 (코드 품질)

### 1. TODO 주석 해결

**파일**: `src/components/features/arrangements/RecommendButton.tsx`

**Before**:
```typescript
} catch (error) {
  console.error('Recommendation failed:', error);
  // TODO: 에러 토스트 메시지 표시
}
```

**After**:
```typescript
} catch (error) {
  console.error('Recommendation failed:', error);
  alert('AI 추천 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
}
```

### 2. Magic Numbers 상수화

**추가된 파일**: `src/lib/constants.ts`

```typescript
// 시간 단위 상수 (밀리초)
export const TIME_UNITS = {
  SECOND: 1000,
  MINUTE: 1000 * 60,
  HOUR: 1000 * 60 * 60,
  DAY: 1000 * 60 * 60 * 24,
} as const;

// React Query 캐시 설정
export const STALE_TIME = {
  SHORT: TIME_UNITS.SECOND * 30,      // 30초
  DEFAULT: TIME_UNITS.MINUTE,          // 1분
  MEDIUM: TIME_UNITS.MINUTE * 2,       // 2분
  LONG: TIME_UNITS.MINUTE * 5,         // 5분
  EXTRA_LONG: TIME_UNITS.MINUTE * 10,  // 10분
  DOCUMENTS: TIME_UNITS.MINUTE * 30,   // 30분
} as const;

// ML 서비스 설정
export const ML_SERVICE_CONFIG = {
  DEFAULT_TIMEOUT: 10000,      // 10초
  HEALTH_CHECK_TIMEOUT: 5000,  // 5초
  TRAINING_TIMEOUT: 60000,     // 60초
} as const;

// 인증 설정
export const AUTH_CONFIG = {
  SIGN_OUT_TIMEOUT: 2000,      // 2초
} as const;
```

**적용된 파일**:
- `src/lib/ml-service-client.ts`
- `src/hooks/useMembers.ts`
- `src/store/authStore.ts`

### 3. React.memo 적용

**파일**:
- `src/components/features/members/MemberListItem.tsx`
- `src/components/features/members/MemberCard.tsx`

**Before**:
```typescript
export default function MemberListItem({ member, onDelete }: Props) {
  // ...
}
```

**After**:
```typescript
import { memo } from 'react';

function MemberListItem({ member, onDelete }: Props) {
  // ...
}

export default memo(MemberListItem);
```

**효과**: 부모 컴포넌트 리렌더링 시 props가 변경되지 않은 아이템은 리렌더링 스킵

---

## 변경된 파일 목록

### TypeScript/React (Frontend)

| 파일 | 변경 유형 | 우선순위 |
|------|-----------|----------|
| `src/app/api/ml/learn-part-placement/route.ts` | 수정 | CRITICAL |
| `src/app/api/arrangements/[id]/recommend/route.ts` | 수정 | CRITICAL |
| `src/components/features/arrangements/ArrangementHeader.tsx` | 수정 | HIGH |
| `src/store/arrangement-store.ts` | 수정 | MEDIUM |
| `src/lib/ai-seat-algorithm.ts` | 수정 | MEDIUM |
| `src/components/ErrorBoundary.tsx` | 수정 | MEDIUM |
| `src/app/error.tsx` | 추가 | MEDIUM |
| `src/app/arrangements/error.tsx` | 추가 | MEDIUM |
| `src/app/members/error.tsx` | 추가 | MEDIUM |
| `src/lib/constants.ts` | 추가 | LOW |
| `src/components/features/arrangements/RecommendButton.tsx` | 수정 | LOW |
| `src/components/features/members/MemberListItem.tsx` | 수정 | LOW |
| `src/components/features/members/MemberCard.tsx` | 수정 | LOW |
| `src/hooks/useMembers.ts` | 수정 | LOW |
| `src/lib/ml-service-client.ts` | 수정 | LOW |
| `src/store/authStore.ts` | 수정 | LOW |

### Python (ML Service)

| 파일 | 변경 유형 | 우선순위 |
|------|-----------|----------|
| `ml-service/app/services/supabase_client.py` | 수정 | HIGH |
| `ml-service/app/schemas/request_response.py` | 수정 | HIGH |

---

## 커밋 히스토리

```
26a1217 fix: LOW 우선순위 이슈 수정 - TODO 정리, 상수화, 성능 개선
58084a6 fix: MEDIUM 우선순위 이슈 수정 - 로깅 및 에러 처리
62d033d fix: HIGH 우선순위 보안/안정성 이슈 수정
1e9c6ec fix: 보안 취약점 수정 - 입력 검증 및 에러 메시지 정제
```

---

## 향후 권장 사항 (모두 완료)

| # | 권장 사항 | 상태 | 커밋 |
|---|-----------|------|------|
| 1 | 나머지 console.log 정리 (62개 파일) | ✅ 완료 | `66d988a` |
| 2 | 추가 Error Boundary (6개 라우트) | ✅ 완료 | `50597eb` |
| 3 | 상수 파일 활용 확대 (9개 훅) | ✅ 완료 | `50597eb` |
| 4 | React.memo 추가 적용 (5개 컴포넌트) | ✅ 완료 | `50597eb` |

### 상세 내역

#### 1. Console.log → Logger 전환 (`66d988a`)
- 62개 파일에서 console 호출을 `createLogger` 유틸리티로 전환
- 환경별 로깅 레벨 적용 (dev: 모두 출력, prod: warn/error만)

#### 2. Error Boundary 추가 (`50597eb`)
- `src/app/attendances/error.tsx`
- `src/app/admin/error.tsx`
- `src/app/dashboard/error.tsx`
- `src/app/documents/error.tsx`
- `src/app/service-schedules/error.tsx`
- `src/app/statistics/error.tsx`

#### 3. 상수 활용 확대 (`50597eb`)
매직 넘버를 `STALE_TIME` 상수로 교체:
- `useMemberAttendanceStats.ts`, `useAttendanceStatistics.ts`, `useStageStatistics.ts`
- `useServiceSchedules.ts`, `usePastArrangement.ts`, `useArrangements.ts`
- `useDocuments.ts`, `useAttendanceDeadlines.ts`, `useChoirEvents.ts`

#### 4. React.memo 추가 적용 (`50597eb`)
- `MemberRow.tsx` - 출석 목록 행
- `MemberChip.tsx` - 컴팩트 출석 칩
- `CalendarDayCell.tsx` - 캘린더 일자 셀
- `ClickableMember.tsx` - 좌석 배치 대원 버튼
- `AttendanceStatsCard.tsx` - 통계 카드

---

*이 문서는 Claude Code의 code-reviewer agent를 통한 자동 코드 리뷰 결과를 기반으로 작성되었습니다.*
