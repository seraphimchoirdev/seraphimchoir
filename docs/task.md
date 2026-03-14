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

### 2026-03-14
- [x] **feat(dashboard): 출석 현황 예배별 분리 표시**
  - 커밋: `955bd89`

- [x] **feat(dashboard): 출석 현황 예배별 분리 표시**
  - 커밋: `69a798e`

- [x] **fix(attendances): MemberChip 반응형 3열 고정 레이아웃으로 변경**
  - 커밋: `221309d`


- [x] **fix(members): 새 대원 등록 서버 에러 수정**
  - 커밋: `f0c90a5`

### 2026-03-10

- [x] **fix(attendances): 관리자 출석 관리 날짜 이동을 예배 일정 기반으로 변경**
  - 커밋: `4155a17`

### 2026-03-05

- [x] **feat(newsletters): 알림 고정(pin) 기능 + 하단 글자 크기 개선**
  - 커밋: `7977e8a`

### 2026-03-04
- [x] **feat(newsletters): 후원계좌 하단 이동, 계좌 복사/송금, 찬양곡 정렬, 기도 담당 개선**
  - 커밋: `87d5df7`


- [x] **feat(newsletters): 알림 항목별 입력 UI + 발행인/편집인 자동 채움 indicator**
  - 커밋: `585ec14`

### 2026-03-01

- [x] **fix(db): 마이그레이션 seed INSERT 비활성화로 members 중복 해소**
  - 커밋: `544ec17`

### 2026-02-28
- [x] **feat(emergency): 긴급 수정 모드 통합 — EmergencyEditPanel 연동 + 모바일 지원**
  - 커밋: `da789ab`

- [x] **feat(ui): EmergencyEditPanel 섹션 시각적 구분 개선**
  - 커밋: `95cc8c9`

- [x] **feat(ui): 배치표 워크플로우 UX 개선 + 출석/마이페이지 UI 리팩토링**
  - 커밋: `436ed33`

- [x] **fix(seats): RPC 에러 로깅 추가 + 로컬 Supabase 설정 수정**
  - 커밋: `f211a46`

- [x] **fix(ui): 줄별 인원수 스피너 -/+ 버튼 색상 구분 + 접근성 개선**
  - 커밋: `4dcd408`

- [x] **feat(service-schedules): "다가오는 일정" 기본 뷰 추가 + DateCard 중복 제거**
  - 커밋: `2f65cb4`

- [x] **feat(ui): 내 출석 투표 마감시한 표시 + 대시보드 UX 개선**
  - 커밋: `0da4eb6`


- [x] **fix(ui): 모바일 토스트 하단 네비 겹침 수정 + 내 출석 페이지 리팩토링**
  - 커밋: `0571194`

### 2026-02-26

- [x] **fix(sentry): 보안 개선 + 불필요한 에러/예제 코드 정리**
  - 커밋: `3807b70`

### 2026-02-24

- [x] **fix(ui): 모바일 다이얼로그 스크롤 버그 수정 + E2E 테스트**
  - 커밋: `e2b445c`

### 2026-02-22

- [x] **test: Phase 8 Playwright E2E 테스트 환경 구축 (17 Suites, 512 Tests, 8 Devices)**
  - 커밋: `ccaaafa`

### 2026-02-20
- [x] **test: Phase 6 커버리지 부스트 + 신규 유틸/API 테스트 (44 Suites, 582 Tests, 81.49% Stmt)**
  - 커밋: `0b4b59e`

- [x] **test: Phase 4 service-schedules CRUD + Hook 테스트 추가 (32 Suites, 404 Tests)**
  - 커밋: `c1a8bdf`


- [x] **test: Phase 2 통합 테스트 + Hook 테스트 추가 (22 Suites, 319 Tests)**
  - 커밋: `97924a5`

### 2026-02-19
- [x] **test: Phase 1 테스트 인프라 강화 및 유닛 테스트 11개 파일 추가**
  - 커밋: `a9c41c1`

- [x] **refactor: 3순위 코드 리뷰 이슈 7건 수정 (아키텍처/성능)**
  - 커밋: `fb946d5`


- [x] **fix(security,store): API 인증 강화, Emergency 롤백 추가, CSRF 데드코드 삭제**
  - 커밋: `9458cb7`

### 2026-02-14
- [x] **fix(dashboard): getSession() → getUser()로 복원하여 보안 경고 해소**
  - 커밋: `516b368`

- [x] **perf(dashboard): TTFB/FCP/CLS 성능 최적화**
  - 커밋: `f2dbeee`

- [x] **fix(dashboard): 임원 대시보드 환영 메시지에서 소속 파트명 제거**
  - 커밋: `39f91e7`

- [x] **fix(draft): DB 데이터 선택 시 resetWorkflow() 호출 제거**
  - 커밋: `860bec7`

- [x] **fix(arrangements): AI 추천에서 joined_date 기반 대원 필터링 추가**
  - 커밋: `91e050c`

- [x] **perf(middleware): API 라우트 및 OAuth 콜백에서 getUser() 스킵**
  - 커밋: `1c4674e`

- [x] **feat(dashboard): 대시보드를 Server Component로 전환하여 성능 개선**
  - 커밋: `dd68177`

- [x] **fix(splash): SplashScreen 반복 표시 버그 수정**
  - 커밋: `f4e3b23`

- [x] **feat(emergency): 긴급 변동 되돌리기 기능 + rowOffset 초기화 버그 수정**
  - 커밋: `bd7ee28`


- [x] **fix(arrangements): 새 배치표 생성 시 총 좌석이 전체 대원 수로 세팅되는 버그 수정**
  - 커밋: `0de3d27`

### 2026-02-12

- [x] **feat(emergency): 긴급 등단 불가 로직 고도화**
  - 커밋: `98f82f6`

### 2026-02-10
- [x] **fix(arrangements): 확정 배치표에서 등단 불가 멤버 필터링 후 빈 좌석이 표시되는 버그 수정**
  - 커밋: `f2caac5`

- [x] **feat(seats): 사이드바 칩 크기 확대 + 파트 헤더 필터 토글 개선**
  - 커밋: `79fc986`

- [x] **docs: 핸드오프 문서 추가 (2026-02-08 ~ 2026-02-10)**
  - 커밋: `226ebaa`

- [x] **feat(arrangements): Step 3(AI 자동배치) 건너뛰기 옵션 추가**
  - 커밋: `f6f6e6d`


- [x] **perf: 모바일 Speed Insights 추가 최적화 — dynamic import, 쿼리 병렬화, 스플래시 단축**
  - 커밋: `55ab16e`

### 2026-02-09
- [x] **perf: Vercel Speed Insights 성능 최적화 — TTFB/LCP 개선**
  - 커밋: `a49e601`

- [x] **feat(dashboard): 지휘자 대시보드 환영 메시지에 파트 준비 현황 반영**
  - 커밋: `b4352e5`

- [x] **refactor(arrangements): 워크플로우 단계 순서 변경 — 줄 정렬을 AI 배치 앞으로 이동**
  - 커밋: `900bf05`

- [x] **fix(attendances): 긴급 등단 불가 처리 시 batch API 400 에러 수정**
  - 커밋: `4cf9ae0`

- [x] **feat(attendances): 자리배치표 생성 여부에 따른 잠금 오버레이 문구 분기**
  - 커밋: `25a17eb`

- [x] **feat(attendances): 준비완료 파트 칩 영역 블러 오버레이 + 안내 문구**
  - 커밋: `7a07924`

- [x] **fix(attendances): 준비 완료 상태에서 출석 수정 차단 + 토스트 안내**
  - 커밋: `6907518`

- [x] **feat(attendances): 파트별 준비완료 현황 바 + 저장 후 플로팅 준비완료 제안 UX**
  - 커밋: `3ec5e7c`


- [x] **fix(arrangements): 모바일 좌석 자동 스크롤 미동작 버그 수정**
  - 커밋: `8d4fc8a`

### 2026-02-08
- [x] **feat(arrangements): 배치표 내 자리 자동 포커싱 + 하이라이트 애니메이션**
  - 커밋: `17c93f1`


- [x] **fix(arrangements): 캡처 헤더/푸터 텍스트 줄바꿈 깨짐 수정**
  - 커밋: `5895d63`

### 2026-02-07
- [x] **fix(arrangements): 캡처 푸터 파트별 인원수 줄바꿈 깨짐 수정**
  - 커밋: `1bb4999`

- [x] **fix(arrangements): 이미지 내보내기 시 뷰포트 독립적 해상도 고정**
  - 커밋: `071d1b8`

- [x] **fix(arrangements): 이미지 내보내기 시 예배 유형 표시 안정화**
  - 커밋: `f6f2340`

- [x] **fix(arrangements): 배치표 예배 유형 잘못 표시 버그 수정**
  - 커밋: `76c4a87`

- [x] **fix(dashboard): 다중 예배 시 "다음 예배" 정보 미표시 버그 수정**
  - 커밋: `378c339`

- [x] **feat(attendances): ADMIN/CONDUCTOR 출석 탭 시간 기반 기본 선택 적용**
  - 커밋: `0c6fc9b`

- [x] **fix(db): 오후찬양예배·찬양대연합예배 시작 시간 14:00→17:00 수정**
  - 커밋: `19b6077`

- [x] **feat(attendances): 다중 예배 시간순 정렬 및 안내 문구 추가**
  - 커밋: `9fd8d6a`

- [x] **perf(mobile): 모바일 초기 로딩 속도 개선 + PWA 아이콘 수정**
  - 커밋: `a45d6b3`

- [x] **feat(arrangements): 줄별 인원 수 stepper UI 개선 및 동기화 버그 수정**
  - 커밋: `5479c5c`

- [x] **fix(arrangements): GridSettingsPanel 디바운스 race condition 버그 수정**
  - 커밋: `41d6301`

- [x] **fix(arrangements): GridSettingsPanel 디바운스 race condition 버그 수정**
  - 커밋: `b55595f`

- [x] **feat(arrangements): 자리배치 워크플로우 UX 개선 9개 항목**
  - 커밋: `887d8c0`

- [x] **fix(ui): 데스크탑 토스트 위치를 top-center로 변경 (반응형)**
  - 커밋: `6446ccc`

- [x] **docs: Claude API Structured Outputs 가이드 문서 추가**
  - 커밋: `6668af0`

- [x] **fix(config): CSP 및 로컬 개발 환경 localhost 지원 추가**
  - 커밋: `99a385a`

- [x] **fix(auth): 프로필 조회 시 .single() → .maybeSingle() 에러 처리 개선**
  - 커밋: `be652ec`

- [x] **refactor(arrangements): 7단계 → 6단계 워크플로우 리팩토링**
  - 커밋: `a3bb4ff`

- [x] **fix(arrangements): 배치표 생성 토스트 통합 및 AI 추천 분배 race condition 수정**
  - 커밋: `c94597f`

- [x] **feat(arrangements): 데이터 변경 시 워크플로우 이후 단계 체크 자동 해제**
  - 커밋: `3087c9a`


- [x] **docs: 2026-02-07 핸드오프 문서 생성**
  - 커밋: `b7a27e2`

### 2026-02-06
- [x] **fix(arrangements): 긴급 수정 모드에서 워크플로우 체크 표시 해제 버그 수정**
  - 커밋: `08d62fd`

- [x] **fix(security): CSP connect-src에 Vercel Analytics 새 도메인 추가**
  - 커밋: `6d5b19a`


- [x] **docs: 2026-02-06 핸드오프 문서 생성**
  - 커밋: `e048b61`

### 2026-02-05
- [x] **fix: 출석 모드 null 처리 및 알토 줄반장 선택 로직 개선**
  - 커밋: `942d961`

- [x] **docs: 핸드오프 문서 추가 (01/31, 02/01, 02/02, 02/04)**
  - 커밋: `12fe52f`

- [x] **refactor(arrangements): 자리배치 저장/공유/확정 UX 용어 재설계**
  - 커밋: `197ff2c`

- [x] **fix(arrangements): 저장 시 줄 정렬 조정(rowOffsets) 초기화 버그 수정**
  - 커밋: `e6b9ae1`

- [x] **fix(seats): 인쇄 시 줄반장 보라 글로우/링 제거 누락 수정**
  - 커밋: `078f050`

- [x] **fix(auth): fetchUser 프로필 쿼리 안정화 - single→maybeSingle 변경**
  - 커밋: `ef2a680`

- [x] **fix(auth): admin 프로필 로드 에러 및 대시보드 미표시 수정**
  - 커밋: `5bcdab2`


- [x] **feat(attendances): 예배별 개별 출석 체크 (Multi-Service Attendance)**
  - 커밋: `df65e7a`

### 2026-02-02
- [x] **feat(db): 프로덕션 DB → seed.sql 자동 생성 스크립트 추가**
  - 커밋: `39f3d33`


- [x] **fix(config): Turbopack 호환성 개선 - Sentry 설정 마이그레이션 및 루트 경로 명시**
  - 커밋: `5cdcda9`

### 2026-02-01

- [x] **fix(attendances): 자리배치표 존재 시 연습 출석 수정 허용 및 practice_status 스키마 추가**
  - 커밋: `91fd663`

### 2026-01-31
- [x] **fix(image-capture): inline style로 좌석 테두리 숨김 방식 변경**
  - 커밋: `b17d069`

- [x] **fix(hooks): 문서 자동 업데이트 훅 개선 — amend 방식으로 unstaged 잔여물 제거**
  - 커밋: `eddac5d`

- [x] **docs: 자동 생성 문서 및 핸드오프 매니페스트 업데이트**
  - 커밋: `ac35f49`

- [x] **feat(arrangements): 인쇄 모드 추가 및 isCaptureMode 버그 수정**
  - 커밋: `49c39cf`

- [x] **docs: 자동 생성 문서 및 핸드오프 매니페스트 업데이트**
  - 커밋: `d95d5fb`

- [x] **fix(arrangements): 레거시 CONFIRMED/SHARED 배치표 이미지 내보내기 드롭다운 미표시 수정**
  - 커밋: `c1d1cce`

- [x] **docs: 자동 생성 문서 및 핸드오프 매니페스트 업데이트**
  - 커밋: `fbf31cb`

- [x] **fix(seats): 좌석 슬롯 이름 표시 시 truncate 대신 줄바꿈 처리**
  - 커밋: `a16c326`

- [x] **feat(arrangements): CONFIRMED → SHARED 긴급 수정 복귀 기능 추가**
  - 커밋: `3af651d`

- [x] **fix(arrangements): 2부 예배 시간 오류 수정 및 7단계 이미지 내보내기 버튼 추가**
  - 커밋: `1119ca6`

- [x] **fix(dashboard): 지휘자 대시보드 출석 현황이 실제 데이터와 불일치하는 버그 수정**
  - 커밋: `f5968a6`

- [x] **feat(dashboard): 파트장 대시보드에 출석/대원 관리 바로가기 추가**
  - 커밋: `ba2dbe7`

- [x] **refactor(my-attendance): 개인 출석 투표 마감 기능 비활성화**
  - 커밋: `88efc3a`

- [x] **refactor(attendances): 출석 마감 기능 프론트엔드 비활성화 및 UX 분석 문서 작성**
  - 커밋: `965b557`

- [x] **docs: 자동 생성 커밋 로그 업데이트**
  - 커밋: `845d71c`

- [x] **fix(csp): localhost용 connect-src 추가로 로컬 개발 CSP 차단 해결**
  - 커밋: `a5c7429`

- [x] **refactor(dashboard): MyRecentVotes 컴포넌트 및 관련 코드 제거**
  - 커밋: `36e6c69`

- [x] **fix(auth): 모바일 카카오 OAuth 리다이렉션 수정**
  - 커밋: `3f7c60d`

- [x] **docs: 자동 생성 커밋 로그 업데이트**
  - 커밋: `0fe691b`

- [x] **feat(auth): 카카오 OAuth 로컬 설정 및 모바일 테스트 환경 구성**
  - 커밋: `6f6317b`

- [x] **fix: 대원 연결 관련 잘못된 라우트 경로 수정**
  - 커밋: `ab6a234`

- [x] **docs: 자동 생성 커밋 로그 업데이트**
  - 커밋: `1df34c0`

- [x] **fix(config): 모바일 개발 접근 및 Vercel 스크립트 CSP 허용**
  - 커밋: `62305fc`

- [x] **fix(db): SECURITY DEFINER 뷰를 SECURITY INVOKER로 변경 및 seed 관리자 충돌 수정**
  - 커밋: `7a2c19a`

- [x] **docs: 자동 생성 커밋 로그 최종 업데이트**
  - 커밋: `7cf1d6b`

- [x] **docs: 자동 생성 커밋 로그 업데이트**
  - 커밋: `708c947`

- [x] **feat(auth): 인증 재시도 로직 및 서버 연결 오류 알림 추가**
  - 커밋: `c3beb0d`

- [x] **refactor(ui): HTML 네이티브 요소를 UI 컴포넌트로 교체**
  - 커밋: `f2ef3f7`

- [x] **docs: 진행 문서 및 핸드오프 매니페스트 업데이트**
  - 커밋: `30d7fe1`


- [x] **docs: 2026-01-29 핸드오프 문서 추가**
  - 커밋: `7695149`

### 2026-01-29
- [x] **fix(seats): SeatsGrid 및 grid 타입 수정**
  - 커밋: `71f2de4`

- [x] **feat(arrangements): 워크플로우 UI 개선 및 RecommendPreviewModal 제거**
  - 커밋: `b75e291`

- [x] **refactor(ui): CompactWorkflowStrip 펼치기 버튼 상단으로 이동**
  - 커밋: `f8043b4`

- [x] **feat(arrangements): Step 5 줄 정렬 프리셋 UI 추가**
  - 커밋: `804073c`

- [x] **refactor(ui): InlineRowOffsetControl offset 숫자 표시 제거**
  - 커밋: `8de31ed`

- [x] **fix(ui): AlertDialog Tailwind CSS 4 호환성 수정**
  - 커밋: `a4154bc`


- [x] **feat: 로컬 Supabase 개발 환경 설정 및 대시보드/배치표 개선**
  - 커밋: `44f3b5b`

### 2026-01-28
- [x] **fix(deploy): 핸드오프 문서 Vercel 배포에 포함**
  - 커밋: `8a39fe9`

- [x] **fix(deploy): Vercel 빌드 시 prebuild 스크립트 포함**
  - 커밋: `5f3e079`

- [x] **refactor(dashboard): 대시보드 자동 갱신 및 UX 개선**
  - 커밋: `0b403ef`


- [x] **feat(attendance): 연습 부분참석 투표 기능 구현**
  - 커밋: `bc92588`

### 2026-01-27

- [x] **feat(dashboard): 역할별 맞춤형 대시보드 구현**
  - 커밋: `3048e27`

### 2026-01-26
- [x] **feat(hooks): 핸드오프 자동 로드 훅 추가**
  - 커밋: `408e628`

- [x] **docs: 자동 업데이트 - refactor 커밋 이력 추가**
  - 커밋: `7029aff`

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
