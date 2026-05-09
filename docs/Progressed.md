
# 프로젝트 진행 상황 (Project Progress)

> 최종 업데이트: 2026-01-26
> 프로젝트: SeraphimON (새로핌ON) - 찬양대 자리배치 시스템

## 1. 프로젝트 개요

새문안교회 새로핌찬양대를 위한 종합 플랫폼입니다. AI 기반 자동 추천으로 찬양대원의 자리배치를 효율적으로 관리하며, **5단계 워크플로우 시스템**, **클릭-클릭 인터랙션**, **지휘자 중심 중앙 정렬** 그리드를 통해 직관적인 자리배치를 제공합니다.

## 2. 완료된 단계 (Completed Phases)

### ✅ Phase 1: 프로젝트 초기화 및 기본 구조 (100%)

- **기술 스택 구축**: Next.js 16, React 19, TypeScript, Tailwind CSS 4, Supabase 설정 완료
- **디자인 시스템**: `UXUI_DESIGN_SYSTEM.md` 정의 및 기본 UI 컴포넌트 구현
- **데이터베이스**: Supabase 테이블 스키마 및 RLS 정책 설정

### ✅ Phase 1.5: 지휘자 전용 암호화 메모 (100%)

- **보안 메모**: AES-256-GCM 암호화를 적용한 지휘자 전용 메모 기능 구현
- **권한 제어**: 지휘자(CONDUCTOR) 권한을 가진 사용자만 접근 가능

### ✅ Phase 2: 인원 관리 기능 (100%)

- **Backend API**: Members CRUD, Attendances 관리 API 구현 완료
- **Frontend UI**:
  - 찬양대원 목록, 상세, 생성, 수정 페이지 구현
  - 출석 관리 주간 그리드 및 일괄 처리 UI 구현
  - React Query를 이용한 서버 상태 관리 및 캐싱 최적화

### ✅ Phase 3: 자리배치 UI 구현 (100%)

- **Backend API**: Arrangements CRUD, Seats Bulk Update API 구현 완료
- **Frontend UI**:
  - 배치표 목록 조회 및 생성 다이얼로그 구현
  - 배치표 편집기(Editor) 레이아웃 및 기능 구현
  - **클릭-클릭 인터랙션**: React DnD 대신 클릭 기반 직관적 배치
  - **State Management**: Zustand를 활용한 클라이언트 측 배치 상태 관리

### ✅ Phase 3.5: 유연한 그리드 시스템 (100%)

- **가변 그리드 레이아웃**: 4~8줄 자유 설정 가능한 동적 그리드 시스템
- **줄별 인원 조정**: 각 줄마다 0~20명까지 개별 설정 가능
- **지그재그 패턴**: 짝수 줄, 홀수 줄, 또는 없음(일렬) 중 선택 가능
- **지휘자 중심 중앙 정렬**: Flexbox 기반 중앙 정렬 레이아웃
- **데이터베이스 스키마**: `grid_rows`, `grid_layout` JSONB 컬럼 추가

### ✅ Phase 3.6: 워크플로우 시스템 (100%) - 2026-01-24 완료

- **5단계 Progressive Disclosure 워크플로우**:
  1. 출석 확인
  2. 줄 구성 설정
  3. 대원 드래그 배치
  4. 줄 정렬(오프셋) 조정
  5. 이미지 저장/공유
- **워크플로우 상태 DB 저장/복원**: 이탈 후 복귀 시 자동 복원
- **단계별 UI 조건부 표시**: Progressive Disclosure 패턴 적용

### ✅ Phase 5: 배치표 이미지 생성 (100%)

- **이미지 캡처**: html-to-image 라이브러리 사용
- **행별 인원수 표시**: 캡처 시 행별 통계 포함
- **CSP 정책 대응**: 이미지 생성 방식 최적화

## 3. 추가 구현 기능 (2025년 12월 ~ 2026년 1월)

### ✅ 알림 시스템 (Notification System)

- **Toast/Snackbar/AlertDialog 3단계 체계**:
  - Toast: 순수 정보 전달 (Sonner 라이브러리)
  - Snackbar: 액션 버튼 포함 (재시도 등)
  - AlertDialog: 사용자 확인 필수 (삭제 등)
- **관련 파일**: `src/lib/toast.ts`, `src/components/ui/confirm-dialog.tsx`

### ✅ 권한 시스템 개선

- **역할 체계**: ADMIN, CONDUCTOR, MANAGER, PART_LEADER
- **linked_member_id 기반 권한 검증**: 사용자-대원 1:1 매핑
- **테스트 계정 예외 처리**: `@test.com` 도메인 특별 처리

### ✅ 임원 포털 (Management Portal)

- **대원 관리 통합**: 기존 분산된 대원 관리 기능을 임원 포털로 통합
- **경로**: `/management/*`
- **권한**: ADMIN, CONDUCTOR, MANAGER, PART_LEADER

### ✅ PWA (Progressive Web App)

- **인앱 브라우저 감지**: 카카오톡/네이버 인앱 브라우저 자동 감지
- **외부 브라우저 안내**: PWA 기능 제한 시 안내 표시
- **커스텀 스플래시 스크린**: 앱 시작 시 로고 표시
- **Maskable 아이콘**: 홈 화면 추가 최적화

### ✅ 핸드오프 문서 시스템

- **자동 생성**: `/handoff` 스킬로 12개 섹션 문서 생성
- **관리자 뷰어**: `/admin/handoff` 페이지에서 열람
- **마크다운 파싱**: 섹션별 아이콘/색상, 목차 하이라이트

### ✅ 예배 일정 관리

- **월간/분기 뷰**: 캘린더 형태로 예배 일정 관리
- **OCR 가져오기**: 문서 스캔을 통한 일정 자동 입력
- **경로**: `/service-schedules`

## 4. 주요 구현 기능 (Key Features)

### 🔐 인증 및 보안

- **로그인 시스템**: 이메일/비밀번호 기반 Supabase Auth 연동
- **라우트 보호**: Next.js 미들웨어를 통한 접근 제어
- **데이터 보안**: Row Level Security (RLS) 적용
- **CSRF/CSP 보호**: 보안 미들웨어 적용
- **Rate Limiting**: Upstash Redis 기반 요청 제한

### 📊 대시보드

- **메인 대시보드**: 로그인 후 첫 화면 (`/dashboard`)
- **현황 요약**: 전체 대원 수, 출석률 등 핵심 지표 표시
- **빠른 실행**: 자주 사용하는 기능으로의 퀵 링크 제공

### 👥 찬양대원 관리

- **목록 조회**: 파트별 필터링, 검색, 정렬 기능
- **상세 정보**: 대원 프로필, 연락처 등 상세 정보 조회 및 수정
- **상태 관리**: 정대원/신입대원/휴직대원/사직대원 구분
- **지휘자 메모**: 대원별 특이사항을 암호화하여 저장

### 📅 출석 관리

- **출석 체크**: 날짜별, 대원별 출석 현황 조회 및 수정
- **MemberChip 3열 레이아웃**: 모바일 최적화 UI
- **출석 마감 관리**: 투표 마감 시간 설정
- **파트장 권한**: 자신의 파트 대원만 출석 입력 가능

### 🪑 자리배치 관리

- **5단계 워크플로우**: 단계별 안내에 따른 직관적 배치
- **클릭-클릭 배치**: 대원 클릭 → 좌석 클릭으로 배치
- **지휘자 중심 정렬**: 모든 줄이 중앙 정렬
- **행별 오프셋**: 줄별 지그재그 패턴 세부 조정
- **Draft 자동 저장**: 작업 중 이탈 시에도 복원 가능
- **AI 추천**: ML 기반 최적 배치 제안

### 🎨 UI/UX

- **모바일 최적화**: 반응형 디자인, 하단 네비게이션
- **다크 모드 지원**: next-themes 기반
- **컴포넌트 라이브러리**: Radix UI 기반 커스텀 컴포넌트

## 5. 기술 스택 상세

### Frontend
```
Next.js 16.1.1
React 19.2.0
TypeScript 5.x
Tailwind CSS 4
Zustand 5.0.8
@tanstack/react-query 5.90.10
```

### Backend & Database
```
Supabase (PostgreSQL + Auth + Storage + Realtime)
@supabase/supabase-js 2.45.6
@supabase/ssr 0.5.2
```

### UI Components
```
Radix UI (Dialog, Popover, Select, Tabs, etc.)
Lucide React (Icons)
Sonner (Toast)
Recharts (Charts)
```

### Security & Monitoring
```
@sentry/nextjs 10.34.0
@upstash/redis 1.36.1
@upstash/ratelimit 2.0.8
```

## 6. 프로젝트 규모

| 항목 | 수량 |
|------|------|
| 페이지 라우트 | 40+개 |
| API 라우트 | 37개 |
| 기능 컴포넌트 | 68개 |
| UI 컴포넌트 | 27개 |
| 커스텀 훅 | 28개 |
| 라이브러리 유틸 | 40+개 |
| DB 마이그레이션 | 40개 |

## 7. 향후 계획 (Next Steps)

### Phase 4: AI 자동 배치 알고리즘 강화 (진행 중)

- ML 학습 테이블 구축 완료
- 파트별 배치 규칙 학습 시스템 구현
- 추천 알고리즘 고도화 예정

### Phase 6: 카카오톡 연동 (예정)

- Kakao OAuth 로그인
- 메시지 API 연동

### Phase 7: 배포 및 최적화 (진행 중)

- Vercel 프로덕션 배포 완료
- Sentry 에러 추적 활성화
- 성능 최적화 지속

## 8. 최근 업데이트 이력

| 날짜 | 주요 변경사항 |
|------|-------------|
| 2026-05-09 | feat(dashboard): 출석 카드에 최근성 색 인디케이터 + 미입력 명시 표시 |
| 2026-05-09 | fix(attendance): 준비완료 기능 제거 및 마지막 저장 시각 표시로 대체 (v0.2.4) |
| 2026-05-02 | fix(seats): 5단계 대원 목록 사이드바 스크롤 복구 |
| 2026-05-02 | fix(seats): 5단계 대원 목록 사이드바 스크롤 복구 |
| 2026-05-02 | fix(recommend): rowCapacities 행당 max=20 가드로 합동 찬양 시 400 해결 |
| 2026-05-02 | feat(seats): 자리배치표 출력/내보내기 시 키(cm) 표시 숨김 |
| 2026-05-02 | fix(recommend): 빈 행(capacity=0) 그리드를 허용하도록 zod 스키마 완화 |
| 2026-05-02 | fix(members): PATCH 스키마에 GUEST/height/height_cm 추가 (DB·POST와 동기화) |
| 2026-05-02 | fix(attendance): 파트장 저장 시 준비완료 자동 처리 제거 (a51356c 회귀) |
| 2026-04-21 | feat(attendance): 파트장 출석 저장 시 준비완료 자동 처리 |
| 2026-04-18 | fix(attendance): 준비완료 해제 권한 수정 및 자동 체크 race condition 해결 |
| 2026-04-11 | feat(ml): 배치표 공유/확정 시 ML 이력 자동 기록 |
| 2026-04-11 | fix(grid): 줄별 인원 수동 조정이 그리드에 반영되지 않는 문제 수정 |
| 2026-04-11 | fix(seed): bass@test.com 테스트 계정에 김철우 대원 연결 |
| 2026-04-10 | fix(attendance): linked_member_id 없는 계정의 파트 조회 fallback 추가 |
| 2026-04-10 | fix(attendance): 파트장 준비완료 권한 검증을 user_profiles 기반으로 변경 |
| 2026-04-10 | fix(build): RowOffsetValue null 타입으로 인한 빌드 에러 수정 |
| 2026-04-10 | fix(grid): 디바운스 race condition으로 좌석 수 불일치 수정 |
| 2026-04-10 | fix(seats): 일반 렌더링에서도 음수 오프셋 행의 행 라벨 겹침 수정 |
| 2026-04-10 | fix(export): 캡처 모드에서 음수 오프셋 행의 행 라벨 겹침 수정 |
| 2026-04-10 | fix(export): 갤럭시 폴드 캡처 ref 분기점 수정 및 좌석번호 가독성 개선 |
| 2026-04-08 | fix(export): 빈 이미지 생성 문제 근본 수정 |
| 2026-04-08 | fix(export): 갤럭시 폴드 공유 시 user gesture 만료 대응 |
| 2026-04-08 | fix(auth): Supabase Auth lock 경쟁 에러 수정 |
| 2026-04-08 | fix(export): toBlob 실패 시 toPng fallback 추가 |
| 2026-04-08 | fix(export): 갤럭시 폴드 등 대형 기기에서 이미지 내보내기 실패 수정 |
| 2026-04-08 | feat(emergency): 긴급 수정모드 대원 목록 사이드바 숨기기 기능 |
| 2026-04-08 | fix(seats): 행 레이블 sticky 제거 |
| 2026-04-08 | fix(seats): 행 레이블 겹침 수정 및 인원 수 글씨 크기 증가 |
| 2026-04-01 | fix(test): 기존 실패 테스트 9개 수정 |
| 2026-04-01 | fix(arrangements): 긴급 수정모드에서 AI 자동 줄 구성 변경 차단 |
| 2026-03-31 | feat(notes): 배치표 안내 메모 에디터 기능 추가 |
| 2026-03-31 | fix(guest): 총 좌석 수 계산에 게스트 인원 포함 |
| 2026-03-31 | feat(guest): 외부 찬양대 게스트 자리배치 지원 |
| 2026-03-22 | refactor(ui): 디자인 품질 개선 (redesign phase 1) |
| 2026-03-22 | fix(ai-seat): 소규모 그리드에서 좌석 배치 초과 및 fallback 개선 |
| 2026-03-17 | fix(arrangements): 새 배치표 생성 시 줄별 인원수 0 표시 버그 수정 |
| 2026-03-17 | fix(dashboard): 다음 주일 배치표 없을 때 과거 배치표 표시 버그 수정 |
| 2026-03-17 | fix(dashboard): 배치표 링크 404 오류 수정 |
| 2026-03-17 | fix(arrangements): 긴급 수정 모드에서 대원 목록(MemberSidebar) 표시 |
| 2026-03-15 | fix(arrangements): 긴급 수정 모드에서 좌석 클릭/배치 차단 해제 |
| 2026-03-15 | fix(arrangements): 줄반장 수동 지정 모드에서 컨텍스트 메뉴 억제 및 Step 5 이후 좌석 조작 차단 |
| 2026-03-15 | fix(arrangements): SHARED→DRAFT 전환 시 긴급 변동 하이라이트 잔존 버그 수정 |
| 2026-03-15 | fix(arrangements): Step 5 완료 시 수동 줄반장 지정 모드 자동 해제 |
| 2026-03-15 | fix(arrangements): 긴급 등단 처리 시 service_schedule_id 전달 누락 수정 |
| 2026-03-15 | fix(arrangements): 긴급 등단 불가 처리 시 service_schedule_id 누락 버그 수정 |
| 2026-03-15 | fix(arrangements): SHARED/CONFIRMED 배치표 로드 시 빈 좌석 표시 버그 수정 |
| 2026-03-15 | fix(arrangements): 새 배치표 생성 시 전체 멤버(98명) 기준 줄 구성 버그 수정 |
| 2026-03-15 | fix(service-schedules): 같은 날짜 예배 일정 정렬 시 시작 시간 기준 2차 정렬 추가 |
| 2026-03-14 | fix(arrangements): 자리배치 생성 시 예배별 출석 데이터 미분리 버그 수정 |
| 2026-03-14 | fix(attendances): 파트장 별 아이콘을 외부 absolute 뱃지로 변경 |
| 2026-03-14 | test(e2e): E2E 테스트 업데이트 및 시드 데이터 갱신 |
| 2026-03-14 | feat(newsletters): 새로핌지(소식지) 및 기도 담당 관리 기능 추가 |
| 2026-03-14 | feat(service-schedules): 일정 삭제 기능 및 임포터 인라인 편집 추가 |
| 2026-03-14 | fix(date): toISOString() UTC 기준 날짜 버그 수정 |
| 2026-03-14 | refactor(auth): STAFF 역할을 SECRETARY/TREASURER로 분리 |
| 2026-03-14 | feat(dashboard): 출석 현황 예배별 분리 표시 |
| 2026-03-14 | fix(attendances): MemberChip 반응형 3열 고정 레이아웃으로 변경 |
| 2026-03-14 | fix(members): 새 대원 등록 서버 에러 수정 |
| 2026-03-10 | fix(attendances): 관리자 출석 관리 날짜 이동을 예배 일정 기반으로 변경 |
| 2026-03-05 | feat(newsletters): 알림 고정(pin) 기능 + 하단 글자 크기 개선 |
| 2026-03-04 | feat(newsletters): 후원계좌 하단 이동, 계좌 복사/송금, 찬양곡 정렬, 기도 담당 개선 |
| 2026-03-04 | feat(newsletters): 알림 항목별 입력 UI + 발행인/편집인 자동 채움 indicator |
| 2026-03-01 | fix(db): 마이그레이션 seed INSERT 비활성화로 members 중복 해소 |
| 2026-02-28 | feat(emergency): 긴급 수정 모드 통합 — EmergencyEditPanel 연동 + 모바일 지원 |
| 2026-02-28 | feat(ui): EmergencyEditPanel 섹션 시각적 구분 개선 |
| 2026-02-28 | feat(ui): 배치표 워크플로우 UX 개선 + 출석/마이페이지 UI 리팩토링 |
| 2026-02-28 | fix(seats): RPC 에러 로깅 추가 + 로컬 Supabase 설정 수정 |
| 2026-02-28 | fix(ui): 줄별 인원수 스피너 -/+ 버튼 색상 구분 + 접근성 개선 |
| 2026-02-28 | feat(service-schedules): "다가오는 일정" 기본 뷰 추가 + DateCard 중복 제거 |
| 2026-02-28 | feat(ui): 내 출석 투표 마감시한 표시 + 대시보드 UX 개선 |
| 2026-02-28 | fix(ui): 모바일 토스트 하단 네비 겹침 수정 + 내 출석 페이지 리팩토링 |
| 2026-02-26 | fix(sentry): 보안 개선 + 불필요한 에러/예제 코드 정리 |
| 2026-02-24 | fix(ui): 모바일 다이얼로그 스크롤 버그 수정 + E2E 테스트 |
| 2026-02-22 | test: Phase 8 Playwright E2E 테스트 환경 구축 (17 Suites, 512 Tests, 8 Devices) |
| 2026-02-20 | test: Phase 6 커버리지 부스트 + 신규 유틸/API 테스트 (44 Suites, 582 Tests, 81.49% Stmt) |
| 2026-02-20 | test: Phase 4 service-schedules CRUD + Hook 테스트 추가 (32 Suites, 404 Tests) |
| 2026-02-20 | test: Phase 2 통합 테스트 + Hook 테스트 추가 (22 Suites, 319 Tests) |
| 2026-02-19 | test: Phase 1 테스트 인프라 강화 및 유닛 테스트 11개 파일 추가 |
| 2026-02-19 | refactor: 3순위 코드 리뷰 이슈 7건 수정 (아키텍처/성능) |
| 2026-02-19 | fix(security,store): API 인증 강화, Emergency 롤백 추가, CSRF 데드코드 삭제 |
| 2026-02-14 | fix(dashboard): getSession() → getUser()로 복원하여 보안 경고 해소 |
| 2026-02-14 | perf(dashboard): TTFB/FCP/CLS 성능 최적화 |
| 2026-02-14 | fix(dashboard): 임원 대시보드 환영 메시지에서 소속 파트명 제거 |
| 2026-02-14 | fix(draft): DB 데이터 선택 시 resetWorkflow() 호출 제거 |
| 2026-02-14 | fix(arrangements): AI 추천에서 joined_date 기반 대원 필터링 추가 |
| 2026-02-14 | perf(middleware): API 라우트 및 OAuth 콜백에서 getUser() 스킵 |
| 2026-02-14 | feat(dashboard): 대시보드를 Server Component로 전환하여 성능 개선 |
| 2026-02-14 | fix(splash): SplashScreen 반복 표시 버그 수정 |
| 2026-02-14 | feat(emergency): 긴급 변동 되돌리기 기능 + rowOffset 초기화 버그 수정 |
| 2026-02-14 | fix(arrangements): 새 배치표 생성 시 총 좌석이 전체 대원 수로 세팅되는 버그 수정 |
| 2026-02-12 | feat(emergency): 긴급 등단 불가 로직 고도화 |
| 2026-02-10 | fix(arrangements): 확정 배치표에서 등단 불가 멤버 필터링 후 빈 좌석이 표시되는 버그 수정 |
| 2026-02-10 | feat(seats): 사이드바 칩 크기 확대 + 파트 헤더 필터 토글 개선 |
| 2026-02-10 | docs: 핸드오프 문서 추가 (2026-02-08 ~ 2026-02-10) |
| 2026-02-10 | feat(arrangements): Step 3(AI 자동배치) 건너뛰기 옵션 추가 |
| 2026-02-10 | perf: 모바일 Speed Insights 추가 최적화 — dynamic import, 쿼리 병렬화, 스플래시 단축 |
| 2026-02-09 | perf: Vercel Speed Insights 성능 최적화 — TTFB/LCP 개선 |
| 2026-02-09 | feat(dashboard): 지휘자 대시보드 환영 메시지에 파트 준비 현황 반영 |
| 2026-02-09 | refactor(arrangements): 워크플로우 단계 순서 변경 — 줄 정렬을 AI 배치 앞으로 이동 |
| 2026-02-09 | fix(attendances): 긴급 등단 불가 처리 시 batch API 400 에러 수정 |
| 2026-02-09 | feat(attendances): 자리배치표 생성 여부에 따른 잠금 오버레이 문구 분기 |
| 2026-02-09 | feat(attendances): 준비완료 파트 칩 영역 블러 오버레이 + 안내 문구 |
| 2026-02-09 | fix(attendances): 준비 완료 상태에서 출석 수정 차단 + 토스트 안내 |
| 2026-02-09 | feat(attendances): 파트별 준비완료 현황 바 + 저장 후 플로팅 준비완료 제안 UX |
| 2026-02-09 | fix(arrangements): 모바일 좌석 자동 스크롤 미동작 버그 수정 |
| 2026-02-08 | feat(arrangements): 배치표 내 자리 자동 포커싱 + 하이라이트 애니메이션 |
| 2026-02-08 | fix(arrangements): 캡처 헤더/푸터 텍스트 줄바꿈 깨짐 수정 |
| 2026-02-07 | fix(arrangements): 캡처 푸터 파트별 인원수 줄바꿈 깨짐 수정 |
| 2026-02-07 | fix(arrangements): 이미지 내보내기 시 뷰포트 독립적 해상도 고정 |
| 2026-02-07 | fix(arrangements): 이미지 내보내기 시 예배 유형 표시 안정화 |
| 2026-02-07 | fix(arrangements): 배치표 예배 유형 잘못 표시 버그 수정 |
| 2026-02-07 | fix(dashboard): 다중 예배 시 "다음 예배" 정보 미표시 버그 수정 |
| 2026-02-07 | feat(attendances): ADMIN/CONDUCTOR 출석 탭 시간 기반 기본 선택 적용 |
| 2026-02-07 | fix(db): 오후찬양예배·찬양대연합예배 시작 시간 14:00→17:00 수정 |
| 2026-02-07 | feat(attendances): 다중 예배 시간순 정렬 및 안내 문구 추가 |
| 2026-02-07 | perf(mobile): 모바일 초기 로딩 속도 개선 + PWA 아이콘 수정 |
| 2026-02-07 | feat(arrangements): 줄별 인원 수 stepper UI 개선 및 동기화 버그 수정 |
| 2026-02-07 | fix(arrangements): GridSettingsPanel 디바운스 race condition 버그 수정 |
| 2026-02-07 | fix(arrangements): GridSettingsPanel 디바운스 race condition 버그 수정 |
| 2026-02-07 | feat(arrangements): 자리배치 워크플로우 UX 개선 9개 항목 |
| 2026-02-07 | fix(ui): 데스크탑 토스트 위치를 top-center로 변경 (반응형) |
| 2026-02-07 | docs: Claude API Structured Outputs 가이드 문서 추가 |
| 2026-02-07 | fix(config): CSP 및 로컬 개발 환경 localhost 지원 추가 |
| 2026-02-07 | fix(auth): 프로필 조회 시 .single() → .maybeSingle() 에러 처리 개선 |
| 2026-02-07 | refactor(arrangements): 7단계 → 6단계 워크플로우 리팩토링 |
| 2026-02-07 | fix(arrangements): 배치표 생성 토스트 통합 및 AI 추천 분배 race condition 수정 |
| 2026-02-07 | feat(arrangements): 데이터 변경 시 워크플로우 이후 단계 체크 자동 해제 |
| 2026-02-07 | docs: 2026-02-07 핸드오프 문서 생성 |
| 2026-02-06 | fix(arrangements): 긴급 수정 모드에서 워크플로우 체크 표시 해제 버그 수정 |
| 2026-02-06 | fix(security): CSP connect-src에 Vercel Analytics 새 도메인 추가 |
| 2026-02-06 | docs: 2026-02-06 핸드오프 문서 생성 |
| 2026-02-05 | fix: 출석 모드 null 처리 및 알토 줄반장 선택 로직 개선 |
| 2026-02-05 | docs: 핸드오프 문서 추가 (01/31, 02/01, 02/02, 02/04) |
| 2026-02-05 | refactor(arrangements): 자리배치 저장/공유/확정 UX 용어 재설계 |
| 2026-02-05 | fix(arrangements): 저장 시 줄 정렬 조정(rowOffsets) 초기화 버그 수정 |
| 2026-02-05 | fix(seats): 인쇄 시 줄반장 보라 글로우/링 제거 누락 수정 |
| 2026-02-05 | fix(auth): fetchUser 프로필 쿼리 안정화 - single→maybeSingle 변경 |
| 2026-02-05 | fix(auth): admin 프로필 로드 에러 및 대시보드 미표시 수정 |
| 2026-02-05 | feat(attendances): 예배별 개별 출석 체크 (Multi-Service Attendance) |
| 2026-02-02 | feat(db): 프로덕션 DB → seed.sql 자동 생성 스크립트 추가 |
| 2026-02-02 | fix(config): Turbopack 호환성 개선 - Sentry 설정 마이그레이션 및 루트 경로 명시 |
| 2026-02-01 | fix(attendances): 자리배치표 존재 시 연습 출석 수정 허용 및 practice_status 스키마 추가 |
| 2026-01-31 | fix(image-capture): inline style로 좌석 테두리 숨김 방식 변경 |
| 2026-01-31 | fix(hooks): 문서 자동 업데이트 훅 개선 — amend 방식으로 unstaged 잔여물 제거 |
| 2026-01-31 | docs: 자동 생성 문서 및 핸드오프 매니페스트 업데이트 |
| 2026-01-31 | feat(arrangements): 인쇄 모드 추가 및 isCaptureMode 버그 수정 |
| 2026-01-31 | docs: 자동 생성 문서 및 핸드오프 매니페스트 업데이트 |
| 2026-01-31 | fix(arrangements): 레거시 CONFIRMED/SHARED 배치표 이미지 내보내기 드롭다운 미표시 수정 |
| 2026-01-31 | docs: 자동 생성 문서 및 핸드오프 매니페스트 업데이트 |
| 2026-01-31 | fix(seats): 좌석 슬롯 이름 표시 시 truncate 대신 줄바꿈 처리 |
| 2026-01-31 | feat(arrangements): CONFIRMED → SHARED 긴급 수정 복귀 기능 추가 |
| 2026-01-31 | fix(arrangements): 2부 예배 시간 오류 수정 및 7단계 이미지 내보내기 버튼 추가 |
| 2026-01-31 | fix(dashboard): 지휘자 대시보드 출석 현황이 실제 데이터와 불일치하는 버그 수정 |
| 2026-01-31 | feat(dashboard): 파트장 대시보드에 출석/대원 관리 바로가기 추가 |
| 2026-01-31 | refactor(my-attendance): 개인 출석 투표 마감 기능 비활성화 |
| 2026-01-31 | refactor(attendances): 출석 마감 기능 프론트엔드 비활성화 및 UX 분석 문서 작성 |
| 2026-01-31 | docs: 자동 생성 커밋 로그 업데이트 |
| 2026-01-31 | fix(csp): localhost용 connect-src 추가로 로컬 개발 CSP 차단 해결 |
| 2026-01-31 | refactor(dashboard): MyRecentVotes 컴포넌트 및 관련 코드 제거 |
| 2026-01-31 | fix(auth): 모바일 카카오 OAuth 리다이렉션 수정 |
| 2026-01-31 | docs: 자동 생성 커밋 로그 업데이트 |
| 2026-01-31 | feat(auth): 카카오 OAuth 로컬 설정 및 모바일 테스트 환경 구성 |
| 2026-01-31 | fix: 대원 연결 관련 잘못된 라우트 경로 수정 |
| 2026-01-31 | docs: 자동 생성 커밋 로그 업데이트 |
| 2026-01-31 | fix(config): 모바일 개발 접근 및 Vercel 스크립트 CSP 허용 |
| 2026-01-31 | fix(db): SECURITY DEFINER 뷰를 SECURITY INVOKER로 변경 및 seed 관리자 충돌 수정 |
| 2026-01-31 | docs: 자동 생성 커밋 로그 최종 업데이트 |
| 2026-01-31 | docs: 자동 생성 커밋 로그 업데이트 |
| 2026-01-31 | feat(auth): 인증 재시도 로직 및 서버 연결 오류 알림 추가 |
| 2026-01-31 | refactor(ui): HTML 네이티브 요소를 UI 컴포넌트로 교체 |
| 2026-01-31 | docs: 진행 문서 및 핸드오프 매니페스트 업데이트 |
| 2026-01-31 | docs: 2026-01-29 핸드오프 문서 추가 |
| 2026-01-29 | fix(seats): SeatsGrid 및 grid 타입 수정 |
| 2026-01-29 | feat(arrangements): 워크플로우 UI 개선 및 RecommendPreviewModal 제거 |
| 2026-01-29 | refactor(ui): CompactWorkflowStrip 펼치기 버튼 상단으로 이동 |
| 2026-01-29 | feat(arrangements): Step 5 줄 정렬 프리셋 UI 추가 |
| 2026-01-29 | refactor(ui): InlineRowOffsetControl offset 숫자 표시 제거 |
| 2026-01-29 | fix(ui): AlertDialog Tailwind CSS 4 호환성 수정 |
| 2026-01-29 | feat: 로컬 Supabase 개발 환경 설정 및 대시보드/배치표 개선 |
| 2026-01-28 | fix(deploy): 핸드오프 문서 Vercel 배포에 포함 |
| 2026-01-28 | fix(deploy): Vercel 빌드 시 prebuild 스크립트 포함 |
| 2026-01-28 | refactor(dashboard): 대시보드 자동 갱신 및 UX 개선 |
| 2026-01-28 | feat(attendance): 연습 부분참석 투표 기능 구현 |
| 2026-01-27 | feat(dashboard): 역할별 맞춤형 대시보드 구현 |
| 2026-01-26 | feat(hooks): 핸드오프 자동 로드 훅 추가 |
| 2026-01-26 | docs: 자동 업데이트 - refactor 커밋 이력 추가 |
| 2026-01-26 | refactor: TypeScript strict 모드 대응 - any 타입 및 lint 경고 해결 |
| 2026-01-26 | feat(hooks): Git 커밋 후 문서 자동 업데이트 훅 구현 |
| 2026-01-26 | 린트 에러 해결, 프로젝트 문서 업데이트 |
| 2026-01-25 | 핸드오프 문서 뷰어 UI 추가, 알림 시스템 도입 |
| 2026-01-24 | 워크플로우 5단계 시스템 완성, 행별 오프셋 기능 |
| 2026-01-17 | 회원 정보 확장 (키, 정대원 승격일, is_singer) |
| 2026-01-15 | 역할 시스템 개선, RLS 정책 업데이트 |
| 2026-01-13 | ML 파트 배치 규칙 학습 시스템 |
| 2026-01-06 | 자리배치 상태(status) 필드 추가 |
| 2026-01-01 | 회원 링크, 문서 관리, 투표 마감 기능 |

---

**프로젝트 상태**: 프로덕션 운영 중
**배포 환경**: Vercel + Supabase Cloud
