# 찬양대 자리배치 시스템 - 작업 목록 (Task List)
>
> 최종 업데이트: 2025-11-29
> 프로젝트: Choir Seat Arranger
> 기술 스택: Next.js 16, React 19, Supabase, TypeScript, Tailwind CSS 4

## 프로젝트 개요

AI 기반 자동 추천으로 찬양대원의 자리배치를 효율적으로 관리하는 웹 애플리케이션입니다.
**주요 기능**:

- 찬양대원 프로필 관리 및 출석 추적
- 지휘자 전용 암호화 메모 (AES-256-GCM)
- AI 기반 최적 자리배치 추천
- 클릭-클릭 인터랙션 기반 자리 조정
- 지휘자 중심 중앙 정렬 그리드 시스템
- 배치표 이미지 생성 및 공유
- 카카오톡 연동

---

## 전체 Phase 현황

| Phase | 상태 | 목표 | 완료율 |
|-------|------|------|--------|
| Phase 1 | ✅ 완료 | 프로젝트 초기화 및 기본 구조 | 100% |
| Phase 1.5 | ✅ 완료 | 지휘자 전용 암호화 메모 기능 | 100% |
| Phase 2 | ✅ 완료 | 인원 관리 기능 | 100% |
| Phase 3 | ✅ 완료 | 자리배치 UI 구현 | 100% |
| Phase 4 | ⏳ 예정 | AI 자동 배치 알고리즘 | 0% |
| Phase 5 | ⏳ 예정 | 배치표 이미지 생성 | 0% |
| Phase 6 | ⏳ 예정 | 카카오톡 연동 | 0% |
| Phase 7 | ⏳ 예정 | 배포 및 최적화 | 0% |

---

## 즉시 작업 가능한 Next Steps (우선순위)

### P0 (긴급 - 즉시 시작)

- [x] **API: Members CRUD 구현** `[4h]`
  - [x] GET /api/members - 목록 조회 (파트별 필터링)
  - [x] GET /api/members/[id] - 단일 조회
  - [x] POST /api/members - 생성
  - [x] PATCH /api/members/[id] - 수정
  - [x] DELETE /api/members/[id] - 삭제
- [x] **API: Attendances 관리** `[3h]`
  - POST /api/attendances - 출석 기록
  - GET /api/attendances?date=YYYY-MM-DD - 날짜별 조회
  - PATCH /api/attendances/[id] - 출석 상태 수정

### P1 (높음 - 이번 주 완료)

- [x] **UI: Members 목록 페이지** `[6h]`
  - /members 페이지 구현
  - 테이블 형식 목록 (이름, 파트, 경력, 리더 여부)
  - 파트별 필터링 (SOPRANO, ALTO, TENOR, BASS, SPECIAL)
  - 검색 기능
  - 신규 등록 버튼
- [x] **UI: Member 상세/편집 페이지** `[8h]`
  - /members/[id] 페이지 구현
  - 프로필 정보 표시
  - 인라인 편집 모드
  - 지휘자 메모 컴포넌트 연동 (기존)
  - 출석 히스토리 표시
- [x] **UI: Member 생성 페이지/모달** `[4h]`
  - /members/new 페이지 또는 모달
  - 폼 유효성 검증
  - Part enum 선택 UI
  - 성공/에러 토스트

### P2 (보통 - 다음 주)

- [x] **인증 UI 구현** `[6h]`
  - /login 페이지
  - 이메일/비밀번호 로그인 폼
  - Supabase Auth 연동
  - 보호된 라우트 설정
- [x] **대시보드 페이지** `[4h]`
  - 최근 배치표 요약
  - 다음 주 출석 현황
  - 빠른 액션 버튼

---

## Phase 2: 인원 관리 기능 (Members Management)

**목표**: 찬양대원 프로필 및 출석 관리 시스템 구축

### 2.1 Backend API

- [x] **Members API 구현** `[4h]` P0
  - [x] 데이터베이스 스키마 준비 완료
  - [x] GET /api/members - 목록 조회
    - 파트별 필터링 (query param: ?part=SOPRANO)
    - 페이지네이션 (query param: ?page=1&limit=20)
    - 검색 (query param: ?search=홍길동)
  - [x] GET /api/members/[id] - 단일 조회
  - [x] POST /api/members - 생성
  - [x] PATCH /api/members/[id] - 수정
  - [x] DELETE /api/members/[id] - 삭제
  - [x] RLS 정책 테스트
- [x] **Attendances API 구현** `[3h]` P0
  - [x] POST /api/attendances - 출석 기록
  - [x] GET /api/attendances - 조회
    - 날짜별 필터링 (query param: ?date=2025-11-24)
    - 찬양대원별 조회 (query param: ?memberId=uuid)
  - [x] PATCH /api/attendances/[id] - 수정
  - [ ] DELETE /api/attendances/[id] - 삭제
  - [x] RLS 정책 테스트
- [x] **Conductor Notes API** `[4h]` ✅ 완료
  - [x] GET /api/members/[id]/conductor-notes
  - [x] PUT /api/members/[id]/conductor-notes
  - [x] DELETE /api/members/[id]/conductor-notes
  - [x] AES-256-GCM 암호화/복호화

### 2.2 Frontend Pages

- [x] **Members 목록 페이지** `[6h]` P1
  - 위치: `src/app/members/page.tsx`
  - [x] 찬양대원 목록 테이블 (Server Component)
  - [x] 파트별 탭 또는 드롭다운 필터
  - [x] 검색창 (이름, 이메일)
  - [x] 정렬 기능 (이름, 경력, 파트)
  - [x] "신규 등록" 버튼
  - [x] React Query로 데이터 페칭
- [x] **Member 생성 페이지** `[4h]` P1
  - 위치: `src/app/members/new/page.tsx` 또는 모달
  - [x] 폼 컴포넌트 (이름, 파트, 키, 경력, 리더 여부, 연락처)
  - [x] Part enum 선택 UI (라디오 버튼 또는 셀렉트)
  - [x] 클라이언트 측 유효성 검증 (Zod)
  - [x] 제출 후 목록 페이지로 리다이렉트
  - [x] 성공/에러 토스트
- [x] **Member 상세/편집 페이지** `[8h]` P1
  - 위치: `src/app/members/[id]/page.tsx`
  - [x] 프로필 정보 표시 (이름, 파트, 키, 경력, 리더 여부, 연락처)
  - [x] 편집 모드 토글 버튼
  - [x] 인라인 편집 폼
  - [x] 지휘자 메모 컴포넌트 연동 (기존 `ConductorNotes`)
  - [x] 출석 히스토리 섹션 (최근 10회)
  - [x] 삭제 버튼 (확인 모달)
- [x] **출석 관리 UI** `[6h]` P2
  - 위치: `src/app/attendances/page.tsx` 또는 대시보드 섹션
  - [x] 주간 출석표 그리드
  - [x] 날짜 선택 (캘린더 또는 날짜 선택기)
  - [x] 찬양대원별 출석 체크박스
  - [x] 일괄 저장 기능
  - [x] 실시간 업데이트 (Optimistic UI)

### 2.3 Components

- [x] **MemberCard 컴포넌트** `[2h]` P2
  - 위치: `src/components/features/members/MemberCard.tsx`
  - 찬양대원 프로필 카드 (이름, 파트, 경력)
  - 클릭 시 상세 페이지 이동
- [x] **MemberForm 컴포넌트** `[3h]` P1
  - 위치: `src/components/features/members/MemberForm.tsx`
  - 재사용 가능한 폼 (생성/수정 공통)
  - Zod 스키마 유효성 검증
  - 제어 컴포넌트 패턴
- [x] **MemberTable 컴포넌트** `[3h]` P1
  - 위치: `src/components/features/members/MemberTable.tsx`
  - 정렬 가능한 테이블
  - 페이지네이션
  - 행 클릭 시 상세 페이지 이동
- [x] **AttendanceGrid 컴포넌트** `[4h]` P2
  - 위치: `src/components/features/members/AttendanceGrid.tsx`
  - 주간 출석 그리드
  - 체크박스 토글
  - 일괄 선택/해제
- [x] **ConductorNotes 컴포넌트** `[4h]` ✅ 완료
  - 위치: `src/components/features/members/ConductorNotes.tsx`
  - CONDUCTOR 권한 확인
  - 메모 조회/편집/삭제

### 2.4 Hooks & Utils

- [x] **useMember Hook** `[2h]` P1
  - 위치: `src/hooks/useMember.ts`
  - React Query 기반
  - 단일 찬양대원 조회 및 변경 감지
- [x] **useMembers Hook** `[2h]` P1
  - 위치: `src/hooks/useMembers.ts`
  - React Query 기반
  - 목록 조회, 필터링, 페이지네이션
- [x] **useAttendances Hook** `[2h]` P2
  - 위치: `src/hooks/useAttendances.ts`
  - React Query 기반
  - 날짜별 출석 조회 및 업데이트
- [ ] **유효성 검증 스키마** `[1h]` P1
  - 위치: `src/lib/validations/member.ts`
  - Zod 스키마 정의 (name, part, height, experience, etc.)

---

## Phase 3: 자리배치 UI 구현 (Seat Arrangement UI)

**목표**: 드래그 앤 드롭 기반 자리배치 그리드 시스템 구축

### 3.1 Backend & Hooks

- [x] **Arrangements API 구현** `[4h]`
  - [x] GET /api/arrangements - 목록 조회 (필터링 지원)
  - [x] GET /api/arrangements/[id] - 단일 조회 (좌석 정보 포함)
  - [x] POST /api/arrangements - 생성
  - [x] PATCH /api/arrangements/[id] - 메타데이터 수정
  - [x] DELETE /api/arrangements/[id] - 삭제
- [x] **Seats API 구현** `[3h]`
  - [x] POST /api/seats/bulk - 좌석 일괄 생성/업데이트
- [x] **React Query Hooks** `[2h]`
  - [x] `useArrangements` (목록)
  - [x] `useArrangement` (단일)
  - [x] `useSeats` (좌석)
  - [x] `useArrangementMutations` (생성/수정/삭제)

### 3.2 Arrangements List UI

- [x] **Arrangements 목록 페이지** `[4h]`
  - [x] 위치: `src/app/arrangements/page.tsx`
  - [x] `ArrangementList` 컴포넌트 (카드/테이블 뷰)
  - [x] `CreateArrangementDialog` (날짜, 제목 입력)

### 3.3 Arrangement Editor - Core & State

- [x] **Editor 페이지 레이아웃** `[3h]`
  - [x] 위치: `src/app/arrangements/[id]/page.tsx`
  - [x] Header, Sidebar, Main Grid 영역 구성
- [x] **Zustand Store** `[3h]`
  - [x] `src/store/arrangement-store.ts`
  - [x] 좌석 배치 상태 관리 (Client-side)
  - [x] Actions: place, remove, move member
- [x] **ArrangementHeader** `[2h]`
  - [x] 제목, 지휘자, 날짜 편집
  - [x] 저장 버튼 (API 연동)

### 3.4 Arrangement Editor - Sidebar

- [x] **MemberSidebar 컴포넌트** `[4h]`
  - [x] 해당 날짜 출석 가능 대원 Fetching
  - [x] 파트별 그룹화 (Accordion 또는 Tabs)
  - [x] 검색/필터링

### 3.5 Arrangement Editor - Grid & DnD

- [x] **DnD 설정** `[2h]`
  - [x] `DndProvider` 설정 (HTML5Backend)
  - [x] Item Types 정의
- [x] **UI 컴포넌트** `[8h]`
  - [x] `DraggableMember`: 드래그 가능한 대원 카드 (Sidebar용)
  - [x] `SeatsGrid`: 행/열 그리드 렌더링
  - [x] `SeatSlot`: Drop 가능한 좌석 컴포넌트
  - [x] `DraggableMember` (Grid용): 좌석 내에서 이동 가능한 대원
- [x] **DnD 로직 통합** `[4h]`
  - [x] Sidebar -> Seat 드롭 처리
  - [x] Seat -> Seat 이동 처리
  - [x] Swap 처리 (이미 있는 자리에 드롭)

### 3.6 유연한 그리드 시스템 (Flexible Grid Layout)

- [x] **타입 정의 및 기본 구조** `[2h]`
  - [x] `src/types/grid.ts` 생성
  - [x] GridLayout, ZigzagPattern, SeatPosition 타입 정의
  - [x] DEFAULT_GRID_LAYOUT (4x8) 정의
- [x] **유틸리티 함수** `[3h]`
  - [x] `src/lib/utils/gridUtils.ts` - 자동 분배 알고리즘
  - [x] `src/lib/utils/seatPositionCalculator.ts` - 지그재그 좌표 계산
- [x] **GridSettingsPanel 컴포넌트** `[4h]`
  - [x] 줄 수 선택 (4~8)
  - [x] 줄별 인원 수 조정
  - [x] 지그재그 패턴 선택 (짝수/홀수/없음)
  - [x] 자동 분배 버튼
  - [x] 총 좌석 수 표시
- [x] **SeatsGrid 리팩토링** `[3h]`
  - [x] 고정 5x10 그리드에서 동적 그리드로 변경
  - [x] CSS Grid with dynamic columns
  - [x] marginLeft를 이용한 0.5 오프셋 렌더링
- [x] **상태 관리 통합** `[3h]`
  - [x] Zustand store에 gridLayout 추가
  - [x] ArrangementHeader에서 grid_layout 저장 기능 추가
  - [x] ArrangementEditorPage에서 GridSettingsPanel 통합
- [x] **API 및 검증** `[2h]`
  - [x] Zod 스키마 추가 (gridLayoutSchema)
  - [x] PATCH /api/arrangements/[id] 업데이트
- [x] **데이터베이스 마이그레이션** `[1h]`
  - [x] `grid_rows` INTEGER 컬럼 추가
  - [x] `grid_layout` JSONB 컬럼 추가
  - [x] 기존 배치표 백필 (4x8 기본값)

### 3.7 인터랙션 개선 및 중앙 정렬 (Interaction Improvements & Center Alignment)

- [x] **React DnD 제거 및 클릭-클릭 전환** `[6h]`
  - [x] arrangement-store.ts에 선택 상태 추가 (selectedMemberId, selectedSource, selectedPosition)
  - [x] ClickableMember 컴포넌트 생성 (DraggableMember 대체)
  - [x] SeatSlot 컴포넌트 onClick 핸들러로 변경 (useDrop/useDrag 제거)
  - [x] 대원 클릭 → 좌석 클릭 배치 로직 구현
  - [x] 좌석 클릭 → 좌석 클릭 이동/스왑 로직 구현
  - [x] 같은 대원/좌석 재클릭 시 선택 취소 (토글) 구현
  - [x] 명확한 시각적 피드백 (선택된 대원/좌석 하이라이트)
  - [x] react-dnd 패키지 완전 제거 (npm uninstall)
  - [x] DndProvider 제거 및 모든 컴포넌트 업데이트
- [x] **지휘자 중심 중앙 정렬** `[4h]`
  - [x] RowSeatPositions 인터페이스 추가 (types/grid.ts)
  - [x] calculateSeatsByRow() 함수 구현 (seatPositionCalculator.ts)
  - [x] CSS Grid → Flexbox 전환 (SeatsGrid.tsx)
  - [x] 각 행 중앙 정렬 (items-center)
  - [x] 지휘자 기준 균형잡힌 레이아웃 구현
- [x] **스마트 지그재그 패턴** `[3h]`
  - [x] getZigzagOffset() 함수에 capacity 파라미터 추가
  - [x] 인원수 기반 동적 오프셋 계산 구현
    - Grid A (중앙 좌석): 홀수 인원 = 오프셋 0, 짝수 인원 = 오프셋 0.5
    - Grid B (중앙 공백): 홀수 인원 = 오프셋 0.5, 짝수 인원 = 오프셋 0
  - [x] 앞줄/뒷줄 인원 동일 시에도 지그재그 패턴 유지
  - [x] marginLeft → paddingLeft 변경
- [x] **반응형 CSS 변수** `[2h]`
  - [x] --seat-width, --seat-gap, --zigzag-offset CSS 변수 정의
  - [x] 모바일(48px) → 태블릿(64px) → 데스크톱(72px) 자동 대응
  - [x] 모든 브레이크포인트에서 정확한 지그재그 오프셋 계산
- [x] **모바일 UI 최적화** `[4h]`
  - [x] Split View 레이아웃 구현 (상단: 좌석 그리드, 하단: 대원 목록)
  - [x] 접을 수 있는 대원 목록 패널 (Collapsible)
  - [x] Floating 그리드 설정 버튼
  - [x] 터치 친화적 컨트롤 (min-height: 44px)
  - [x] Bottom Sheet 그리드 설정 모달 (모바일)
- [x] **그리드 설정 패널 토글** `[2h]`
  - [x] 데스크톱 그리드 설정 패널 숨기기/보이기 기능
  - [x] 토글 버튼 및 애니메이션 구현
  - [x] 스크롤 동작 개선 (전체 패널 스크롤)
- [x] **데이터 접근 수정** `[1h]`
  - [x] 출석 인원 카운트 수정 (attendanceData?.data?.length → attendances?.length)

---

## Phase 4: AI 자동 배치 알고리즘 (AI Recommendation)

**목표**: Python FastAPI 서비스로 ML 기반 최적 자리배치 추천 구현

### 4.1 FastAPI 서비스 구축

- [ ] **프로젝트 초기화** `[2h]` P3
  - 위치: `choir-seat-ml/` (별도 디렉토리)
  - Poetry 또는 pip 의존성 관리
  - FastAPI, uvicorn, pydantic 설치
- [ ] **API 엔드포인트** `[4h]` P3
  - [ ] POST /recommend - 배치 추천 요청
  - [ ] GET /health - 헬스 체크
  - [ ] 요청/응답 Pydantic 모델
- [ ] **데이터 모델** `[2h]` P3
  - Supabase와 동기화된 Pydantic 스키마
  - Member, Attendance, Arrangement

### 4.2 ML 알고리즘

- [ ] **데이터 전처리** `[4h]` P3
  - 출석 데이터 로드
  - 파트별 분포 계산
  - 경력/키 정규화
- [ ] **추천 알고리즘 v1 (규칙 기반)** `[6h]` P3
  - 파트별 균등 분포
  - 경력 기반 위치 배정 (앞줄: 경력 많음)
  - 키 기반 정렬 (뒷줄: 키 큼)
- [ ] **추천 알고리즘 v2 (ML 기반)** `[2w]` P3
  - 과거 배치 데이터 학습
  - 협업 필터링 또는 최적화 알고리즘
  - 하이퍼파라미터 튜닝

### 4.3 Next.js 연동

- [ ] **API 클라이언트** `[2h]` P3
  - 위치: `src/lib/api/ml-service.ts`
  - FastAPI 서비스 호출
  - 에러 핸들링
- [ ] **배치 추천 UI 통합** `[3h]` P3
  - Arrangement 편집 페이지에 "자동 배치" 버튼
  - 로딩 상태 표시
  - 추천 결과 프리뷰

---

## Phase 5: 배치표 이미지 생성 (Image Generation)

**목표**: 워드 스타일 표 형식의 배치표 이미지 생성 및 다운로드

### 5.1 Canvas 렌더링

- [ ] **Canvas 컴포넌트** `[6h]` P3
  - 위치: `src/components/features/arrangements/ArrangementCanvas.tsx`
  - HTML Canvas API 또는 React-Konva
  - 좌석 그리드 렌더링
  - 찬양대원 이름/파트 표시
- [ ] **워드 스타일 테이블 렌더링** `[4h]` P3
  - 테두리, 셀 배경색
  - 폰트 크기, 정렬
  - 헤더 (날짜, 제목, 지휘자)

### 5.2 이미지 다운로드

- [ ] **PNG 변환** `[2h]` P3
  - Canvas.toDataURL()
  - 다운로드 트리거
- [ ] **PDF 변환** `[3h]` P3
  - jsPDF 또는 pdfmake
  - 고해상도 출력

### 5.3 Supabase Storage 업로드

- [ ] **Storage 버킷 생성** `[1h]` P3
  - Supabase 대시보드에서 `arrangement-images` 버킷 생성
  - Public 읽기 권한 설정
- [ ] **업로드 API** `[2h]` P3
  - POST /api/arrangements/[id]/upload-image
  - Supabase Storage 업로드
  - `arrangements.image_url` 업데이트
- [ ] **다운로드/공유 버튼** `[2h]` P3
  - "이미지 다운로드" 버튼
  - "카카오톡 공유" 버튼 (Phase 6 연동)

---

## Phase 6: 카카오톡 연동 (Kakao Integration)

**목표**: 출석 현황 수집 및 배치표 자동 공유

### 6.1 Kakao OAuth

- [ ] **Kakao Developers 앱 등록** `[1h]` P3
  - REST API 키 발급
  - 리다이렉트 URI 설정
- [ ] **Supabase Auth Kakao Provider 설정** `[2h]` P3
  - Supabase 대시보드에서 Kakao OAuth 활성화
  - 클라이언트 ID, 시크릿 등록
- [ ] **로그인 UI** `[2h]` P3
  - "카카오톡으로 로그인" 버튼
  - Supabase signInWithOAuth()

### 6.2 메시지 API

- [ ] **메시지 템플릿 등록** `[2h]` P3
  - Kakao Developers에서 메시지 템플릿 등록
  - 배치표 이미지 + 링크
- [ ] **메시지 발송 API** `[3h]` P3
  - POST /api/kakao/send-message
  - Kakao REST API 호출
  - 다수 수신자 처리

### 6.3 출석 수집 자동화

- [ ] **카카오톡 봇 (선택적)** `[1w]` P3
  - Kakao i Open Builder 연동
  - 출석 여부 질의
  - 응답을 Supabase에 자동 저장

---

## Phase 7: 배포 및 최적화 (Deployment & Optimization)

**목표**: 프로덕션 배포 및 성능 최적화

### 7.1 Vercel 배포

- [ ] **Vercel 프로젝트 생성** `[1h]` P3
  - GitHub 연동
  - 환경 변수 설정
- [ ] **프로덕션 빌드 테스트** `[2h]` P3
  - `npm run build` 오류 수정
  - 린트 에러 해결
- [ ] **Supabase 프로젝트 연동** `[1h]` P3
  - 프로덕션 Supabase 프로젝트 생성
  - 마이그레이션 푸시
  - 환경 변수 업데이트

### 7.2 성능 최적화

- [ ] **이미지 최적화** `[2h]` P3
  - Next.js Image 컴포넌트 사용
  - WebP 변환
- [ ] **코드 스플리팅** `[2h]` P3
  - Dynamic Import
  - React.lazy()
- [ ] **캐싱 전략** `[3h]` P3
  - React Query 캐시 설정
  - SWR 또는 Incremental Static Regeneration
- [ ] **Lighthouse 성능 점수 80+ 달성** `[4h]` P3

### 7.3 SEO & 접근성

- [ ] **메타데이터 최적화** `[2h]` P3
  - 페이지별 title, description
  - Open Graph 태그
- [ ] **접근성 개선** `[3h]` P3
  - ARIA 레이블
  - 키보드 네비게이션
  - 색상 대비 개선

### 7.4 모니터링 & 로깅

- [ ] **Sentry 에러 추적** `[1h]` P3
  - Sentry 프로젝트 생성
  - Next.js 연동
- [ ] **Vercel Analytics** `[30m]` P3
  - 활성화 및 대시보드 확인

---

## 기술 부채 & 개선 사항

### 리팩토링 필요

- [ ] **API 라우트 표준화** `[3h]` P2
  - 공통 에러 핸들링 미들웨어
  - 응답 포맷 통일 ({ success, data, error })
  - 로깅 추가
- [ ] **Supabase Client 싱글톤 패턴** `[2h]` P3
  - 클라이언트 재사용 최적화
  - 메모리 누수 방지
- [ ] **타입 안정성 강화** `[2h]` P2
  - `any` 타입 제거
  - Generic 타입 활용

### 성능 최적화

- [ ] **React Query 설정 최적화** `[1h]` P2
  - staleTime, cacheTime 조정
  - refetchOnWindowFocus 설정
- [ ] **Zustand Persist 추가** `[1h]` P3
  - localStorage 영속화
  - 페이지 새로고침 시 상태 유지

### 테스트 추가

- [ ] **API 통합 테스트** `[1w]` P3
  - Jest + Supertest
  - 각 엔드포인트 테스트
- [ ] **컴포넌트 단위 테스트** `[1w]` P3
  - React Testing Library
  - 주요 컴포넌트 스냅샷 테스트
- [ ] **E2E 테스트** `[1w]` P3
  - Playwright 또는 Cypress
  - 핵심 사용자 플로우

### 보안 강화

- [ ] **CSRF 보호** `[2h]` P2
  - CSRF 토큰 추가
  - SameSite 쿠키 설정
- [ ] **Rate Limiting** `[2h]` P2
  - API 요청 제한
  - DDoS 방어
- [ ] **민감 정보 감사 로그** `[3h]` P3
  - 지휘자 메모 접근 로그
  - Admin 권한 변경 로그

---

## 의존성 (Dependencies)

### Phase 간 의존성

```text
Phase 1 (완료) → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6 → Phase 7
                   ↓         ↓         ↓
                Phase 1.5    |         |
                (완료)       |         |
                             ↓         ↓
                         인증 UI   카카오 OAuth
```

### 블로커 (Blockers)

- **Phase 2 시작 전**: 없음 (즉시 시작 가능)
- **Phase 3 시작 전**: Members API 완료 필요
- **Phase 4 시작 전**: Arrangements API 완료 필요
- **Phase 5 시작 전**: SeatsGrid 컴포넌트 완료 필요
- **Phase 6 시작 전**: 배치표 이미지 생성 완료 필요

---

## 작업 시간 추정

| Phase | 예상 소요 시간 | 실제 소요 시간 |
|-------|---------------|---------------|
| Phase 1 | - | ✅ 완료 |
| Phase 1.5 | - | ✅ 완료 |
| Phase 2 | 60h (약 2주) | - |
| Phase 3 | 70h (약 2주) | - |
| Phase 4 | 120h (약 4주) | - |
| Phase 5 | 30h (약 1주) | - |
| Phase 6 | 40h (약 1주) | - |
| Phase 7 | 30h (약 1주) | - |
| **총합** | **350h (약 13주)** | - |

---

## 체크리스트 (현재 스프린트)

**스프린트 목표**: Phase 3 자리배치 UI 구현 완료 ✅

### Week 1: Backend API

- [x] Members API 완성
- [x] Attendances API 완성
- [ ] API 통합 테스트

### Week 2: Frontend UI

- [x] Members 목록 페이지
- [x] Member 생성/편집 페이지
- [x] 출석 관리 UI

### Week 3: 통합 및 QA

- [x] React Query 통합
- [x] 에러 핸들링
- [ ] 사용자 테스트

### Week 4: 유연한 그리드 시스템 ✅

- [x] 타입 정의 및 유틸리티 함수
- [x] GridSettingsPanel 컴포넌트
- [x] 동적 그리드 렌더링
- [x] 상태 관리 통합
- [x] 데이터베이스 마이그레이션

### Week 5: 인터랙션 개선 및 중앙 정렬 ✅

- [x] React DnD 제거 및 클릭-클릭 전환
- [x] 지휘자 중심 중앙 정렬
- [x] 스마트 지그재그 패턴 (인원수 기반)
- [x] 반응형 CSS 변수 구현
- [x] 모바일 UI 최적화 (Split View)
- [x] 그리드 설정 패널 토글 기능

---

## 참고 링크

- **문서**:
  - [README.md](./README.md) - 프로젝트 개요
  - [docs/CONDUCTOR_NOTES.md](./docs/CONDUCTOR_NOTES.md) - 지휘자 메모 가이드
  - [CLAUDE.md](../CLAUDE.md) - Claude Code 가이드
  - [Progressed.md](./Progressed.md) - 프로젝트 진행 상황
- **외부 자료**:
  - [Supabase 문서](https://supabase.com/docs)
  - [Next.js 문서](https://nextjs.org/docs)
  - [Tailwind CSS 문서](https://tailwindcss.com/docs)
  - [Zustand 문서](https://zustand.docs.pmnd.rs/)

---
**마지막 업데이트**: 2025-11-29
**다음 리뷰**: Phase 4 시작 전
**최근 완료**: Phase 3.7 - 인터랙션 개선 및 중앙 정렬 (클릭-클릭 방식, 지휘자 중심 중앙 정렬, 스마트 지그재그, 모바일 최적화)
