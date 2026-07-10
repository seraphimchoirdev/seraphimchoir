# E2E 테스트 실패 보고서

> 실행일: 2026-04-01
> 브랜치: develop (커밋: 9038837 — Phase 3 Zod 업데이트 완료 시점)
> 프로젝트: desktop-chrome
> 전체 결과: 106 passed / 18 skipped / 5 failed

## 실패 목록

### 1. admin.spec.ts:29 — 사용자 관리 링크가 동작한다
- **파일**: `e2e/features/admin.spec.ts`
- **라인**: 29
- **카테고리**: 관리자 대시보드

### 2. admin.spec.ts:43 — 대원 연결 승인 링크가 동작한다
- **파일**: `e2e/features/admin.spec.ts`
- **라인**: 43
- **카테고리**: 관리자 대시보드

### 3. newsletters.spec.ts:72 — 에디터에서 발행인/편집인 자동 입력이 표시된다
- **파일**: `e2e/features/newsletters.spec.ts`
- **라인**: 72
- **카테고리**: 주보 (새로핌지)

### 4. prayers.spec.ts:4 — 기도 담당 관리 페이지가 정상 로드된다
- **파일**: `e2e/features/prayers.spec.ts`
- **라인**: 4
- **카테고리**: 기도 담당 관리

### 5. prayers.spec.ts:13 — 분기 선택기가 표시된다
- **파일**: `e2e/features/prayers.spec.ts`
- **라인**: 13
- **카테고리**: 기도 담당 관리

## 비고

- Phase 1~3 의존성 마이그레이션 이후 실행
- 마이그레이션 이전 E2E 베이스라인이 없어 기존 실패인지 신규 실패인지 미확인
- admin, newsletters, prayers 페이지는 Phase 1~3에서 변경한 패키지와 직접적 관련 낮음 (UI 로직/라우팅 문제 가능성)
- 상세 에러 메시지는 `npx playwright show-report`로 확인 가능
