# 찬양대 자리배치 시스템 - 작업 목록 (Task List)

> 최종 업데이트: 2026-01-26
> 프로젝트: SeraphimON (새로핌ON)
> 기술 스택: Next.js 16, React 19, Supabase, TypeScript, Tailwind CSS 4

## 프로젝트 개요

새문안교회 새로핌찬양대를 위한 종합 플랫폼입니다.

**주요 기능**:
- 찬양대원 프로필 관리 및 출석 추적
- 지휘자 전용 암호화 메모 (AES-256-GCM)
- AI 기반 최적 자리배치 추천
- 5단계 워크플로우 기반 자리배치 시스템
- 클릭-클릭 인터랙션, 지휘자 중심 중앙 정렬 그리드
- 배치표 이미지 생성 및 공유
- PWA 지원

---

## 전체 Phase 현황

| Phase | 상태 | 목표 | 완료율 |
|-------|------|------|--------|
| Phase 1 | ✅ 완료 | 프로젝트 초기화 및 기본 구조 | 100% |
| Phase 1.5 | ✅ 완료 | 지휘자 전용 암호화 메모 기능 | 100% |
| Phase 2 | ✅ 완료 | 인원 관리 기능 | 100% |
| Phase 3 | ✅ 완료 | 자리배치 UI 구현 | 100% |
| Phase 3.5 | ✅ 완료 | 유연한 그리드 시스템 | 100% |
| Phase 3.6 | ✅ 완료 | 워크플로우 시스템 | 100% |
| Phase 4 | 🚧 진행중 | AI 자동 배치 알고리즘 강화 | 60% |
| Phase 5 | ✅ 완료 | 배치표 이미지 생성 | 100% |
| Phase 6 | ⏳ 예정 | 카카오톡 연동 | 0% |
| Phase 7 | 🚧 진행중 | 배포 및 최적화 | 80% |

---

## 즉시 작업 가능한 Next Steps (우선순위)

### P0 (긴급 - 즉시 시작)

- [x] **린트 에러 해결** `[완료 2026-01-26]`
  - react-hooks/immutability 규칙 warning 처리
  - 미사용 변수/파라미터 정리

### P1 (높음 - 이번 주 완료)

- [ ] **TypeScript strict 모드 대응**
  - `@typescript-eslint/no-explicit-any` warning 점진적 해결

### P2 (보통 - 다음 주)

- [ ] **Sentry SDK 업데이트**
  - `@sentry/nextjs` deprecation 경고 대응

- [ ] **CLAUDE.md 업데이트**
  - 핸드오프 뷰어 접근 방법 추가

### P3 (낮음 - 여유 있을 때)

- [ ] **metadataBase 설정**
  - 내부 시스템이라 SEO 불필요, 경고 제거 목적
  - 참고 파일: `src/app/layout.tsx`

---

## 완료된 작업 (2025년 12월 ~ 2026년 1월)

### 2026-01-26
- [x] **refactor: TypeScript strict 모드 대응 - any 타입 및 lint 경고 해결**
  - 커밋: `f090131`

- [x] **feat(hooks): Git 커밋 후 문서 자동 업데이트 훅 구현**
  - 커밋: `6217be2`


- [x] **린트 에러 해결**
  - `inFrontMatter` 미사용 변수 제거
  - `request` → `_request` 변경
  - `react-hooks/immutability` 규칙 warning 처리
  - ESLint 설정 업데이트

### 2026-01-25

- [x] **핸드오프 문서 뷰어 추가**
  - `/admin/handoff` 목록 페이지
  - `/admin/handoff/[date]` 상세 뷰어
  - 마크다운 파싱, 섹션별 아이콘/색상
  - 키보드 네비게이션 (←/→)
  - Vercel 호환성 (fs → API 라우트)

- [x] **알림 시스템 도입**
  - Toast/Snackbar/AlertDialog 3단계 체계
  - Sonner 라이브러리 적용
  - `src/lib/toast.ts` 유틸리티

- [x] **출석 관리 UX 개선**
  - MemberChip 3열 레이아웃 (모바일)
  - 파트장 권한 검증 개선 (linked_member_id)

- [x] **대원 관리 → 임원 포털 통합**
  - `/management/*` 경로로 통합
  - 권한 체계 개선

- [x] **PWA 인앱 브라우저 감지**
  - 카카오톡/네이버 인앱 브라우저 감지
  - 외부 브라우저 안내 표시

### 2026-01-24

- [x] **워크플로우 5단계 시스템 완성**
  - Progressive Disclosure 패턴 적용
  - 단계별 UI 조건부 표시
  - 워크플로우 상태 DB 저장/복원

- [x] **행별 오프셋 기능 개선**
  - 인라인 오프셋 컨트롤
  - CSS 변수 기반 transform

- [x] **이미지 캡처 개선**
  - 행별 인원수 표시
  - CSP 정책 대응

### 2026-01-17 ~ 2026-01-23

- [x] **회원 정보 확장**
  - height, regular_member_since 컬럼 추가
  - is_singer 컬럼 추가

- [x] **역할 시스템 개선**
  - PART_LEADER 역할 추가
  - RLS 정책 업데이트

- [x] **ML 학습 시스템**
  - learned_part_placement_rules 테이블
  - 파트별 배치 규칙 학습

### 2026-01-01 ~ 2026-01-15

- [x] **회원 링크 기능**
  - member_links 테이블
  - 초대 링크 생성/관리

- [x] **문서 관리**
  - documents 테이블
  - Storage 버킷 설정

- [x] **투표 마감 기능**
  - vote_deadlines 테이블
  - 출석 마감 시간 관리

- [x] **예배 일정 관리**
  - service_schedules 테이블
  - 월간/분기 뷰 전환
  - OCR 가져오기

---

## Phase 4: AI 자동 배치 알고리즘 (진행중 60%)

**목표**: ML 기반 최적 자리배치 추천 고도화

### 4.1 완료된 작업

- [x] **ML 학습 테이블 구축**
  - `learned_part_placement_rules` 테이블
  - `column_placement_rules` 컬럼
  - 학습 트리거 설정

- [x] **기본 추천 알고리즘**
  - `src/lib/ai-seat-algorithm.ts`
  - 파트별 균등 분포
  - 경력/키 기반 위치 배정

- [x] **추천 UI 통합**
  - "AI 추천" 버튼
  - 추천 결과 프리뷰 모달
  - 그리드 보존 옵션

### 4.2 진행 예정

- [ ] **추천 알고리즘 v2** `[3w]`
  - 과거 배치 데이터 분석
  - 파트별 선호 위치 학습
  - 품질 메트릭 고도화

- [ ] **사용자 피드백 수집** `[1w]`
  - 배치 결과 평가 UI
  - 피드백 DB 저장

---

## Phase 6: 카카오톡 연동 (예정)

**목표**: 출석 현황 수집 및 배치표 자동 공유

### 6.1 Kakao OAuth

- [ ] **Kakao Developers 앱 등록** `[1h]`
- [ ] **Supabase Auth Kakao Provider 설정** `[2h]`
- [ ] **로그인 UI** `[2h]`

### 6.2 메시지 API

- [ ] **메시지 템플릿 등록** `[2h]`
- [ ] **메시지 발송 API** `[3h]`

---

## Phase 7: 배포 및 최적화 (진행중 80%)

### 7.1 완료된 작업

- [x] **Vercel 배포**
  - 프로덕션 배포 완료
  - 환경 변수 설정
  - Preview 배포 설정

- [x] **Sentry 에러 추적**
  - 프로젝트 연동 완료
  - 에러 알림 설정

- [x] **Vercel Analytics**
  - 페이지 뷰 추적
  - 성능 메트릭

### 7.2 진행 예정

- [ ] **metadataBase 설정** `[1h]`
  - SEO 최적화

- [ ] **접근성 개선** `[3h]`
  - ARIA 레이블
  - 키보드 네비게이션

- [ ] **Lighthouse 성능 점수 80+** `[4h]`
  - 이미지 최적화
  - 코드 스플리팅

---

## 기술 부채 & 개선 사항

### 리팩토링 필요

- [ ] **타입 안정성 강화** `[2h]` P2
  - `any` 타입 제거 (34 warnings)
  - Generic 타입 활용

- [ ] **React Hook 규칙 대응** `[3h]` P2
  - `react-hooks/exhaustive-deps` warning 해결
  - `react-hooks/set-state-in-effect` warning 해결

### 테스트 추가

- [ ] **API 통합 테스트** `[1w]` P3
  - Jest + Supertest
  - 각 엔드포인트 테스트

- [ ] **컴포넌트 단위 테스트** `[1w]` P3
  - React Testing Library
  - 주요 컴포넌트 스냅샷 테스트

- [ ] **E2E 테스트** `[1w]` P3
  - Playwright
  - 핵심 사용자 플로우

---

## 프로젝트 규모

| 항목 | 수량 |
|------|------|
| 페이지 라우트 | 40+개 |
| API 라우트 | 37개 |
| 기능 컴포넌트 | 68개 |
| UI 컴포넌트 | 27개 |
| 커스텀 훅 | 28개 |
| 라이브러리 유틸 | 40+개 |
| DB 마이그레이션 | 40개 |
| 테스트 파일 | 5개 |

---

## 참고 링크

- **문서**:
  - [README.md](./README.md) - 프로젝트 개요
  - [CLAUDE.md](../CLAUDE.md) - Claude Code 가이드
  - [Progressed.md](./Progressed.md) - 프로젝트 진행 상황
  - [NOTIFICATION_SYSTEM_ANALYSIS.md](./NOTIFICATION_SYSTEM_ANALYSIS.md) - 알림 시스템 설계
- **외부 자료**:
  - [Supabase 문서](https://supabase.com/docs)
  - [Next.js 문서](https://nextjs.org/docs)
  - [Tailwind CSS 문서](https://tailwindcss.com/docs)

---

**마지막 업데이트**: 2026-01-26
**프로젝트 상태**: 프로덕션 운영 중
