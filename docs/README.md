# Choir Seat App 문서

찬양대 자리배치 시스템 문서 모음

---

## 출석 통계 RPC 함수 문서

### 1. 빠른 참조 카드 (권장 시작점)
**파일**: `attendance-rpc-quick-reference.md`

개발자를 위한 빠른 참조 가이드입니다. 각 함수의 사용법과 예제 코드를 간단하게 확인할 수 있습니다.

**포함 내용**:
- 함수 목록 및 간단한 설명
- TypeScript/React Query 사용 예시
- 컴포넌트 예시
- 에러 처리 패턴
- 유용한 팁

**추천 대상**: 빠르게 함수를 사용하고 싶은 개발자

---

### 2. 상세 사용 가이드
**파일**: `attendance-rpc-functions.md`

RPC 함수의 상세한 사용 방법과 API 통합 가이드입니다.

**포함 내용**:
- 각 함수의 상세 설명
- 파라미터 및 반환값 명세
- TypeScript 타입 정의
- API 통합 예시 (Next.js API Routes)
- React Query Hook 구현
- 성능 최적화 가이드
- 보안 및 권한 설정
- 에러 처리 패턴

**추천 대상**: 함수의 동작 원리와 통합 방법을 이해하고 싶은 개발자

---

### 3. 테스트 쿼리 모음
**파일**: `attendance-rpc-test-queries.sql`

SQL 테스트 쿼리 모음입니다. Supabase Studio의 SQL Editor에서 직접 실행할 수 있습니다.

**포함 내용**:
- 샘플 데이터 생성 스크립트
- 각 함수의 테스트 쿼리
- 복합 쿼리 예시
- 성능 테스트 (EXPLAIN ANALYZE)
- 에러 케이스 테스트

**추천 대상**: SQL로 직접 테스트하고 싶은 개발자, DB 관리자

---

### 4. 구현 완료 보고서
**파일**: `ATTENDANCE_RPC_IMPLEMENTATION_SUMMARY.md`

출석 통계 RPC 함수 구현에 대한 종합 보고서입니다.

**포함 내용**:
- 구현된 파일 목록
- 각 함수의 상세 설명
- 보안 및 권한 설정
- 성능 최적화 전략
- 에러 처리 방식
- 테스트 체크리스트
- 향후 개선 사항

**추천 대상**: 프로젝트 관리자, 전체 구현 내용을 파악하고 싶은 개발자

---

## 문서 읽는 순서 (권장)

### 처음 사용하는 경우
1. `attendance-rpc-quick-reference.md` - 빠른 시작
2. `attendance-rpc-functions.md` - 상세 가이드
3. `attendance-rpc-test-queries.sql` - SQL 테스트

### 구현/통합하는 경우
1. `ATTENDANCE_RPC_IMPLEMENTATION_SUMMARY.md` - 전체 개요
2. `attendance-rpc-functions.md` - API 통합 가이드
3. `attendance-rpc-quick-reference.md` - 빠른 참조

### 테스트/디버깅하는 경우
1. `attendance-rpc-test-queries.sql` - SQL 테스트
2. `attendance-rpc-quick-reference.md` - 에러 처리 패턴
3. `attendance-rpc-functions.md` - 상세 문제 해결

---

## 관련 파일 경로

### 마이그레이션
```
/supabase/migrations/20251120000000_add_attendance_rpc_functions.sql
```

### TypeScript 타입
```
/src/types/attendance-stats.types.ts
```

### React Query Hooks
```
/src/hooks/useAttendanceStatistics.ts
```

---

## 주요 링크

- [Supabase 문서](https://supabase.com/docs)
- [React Query 문서](https://tanstack.com/query/latest)
- [PostgreSQL 함수 문서](https://www.postgresql.org/docs/current/sql-createfunction.html)

---

## 업데이트 이력

| 날짜 | 버전 | 변경 내용 |
|------|------|----------|
| 2025-11-20 | 1.0 | 출석 통계 RPC 함수 초기 구현 |

---

**마지막 업데이트**: 2025-11-20
