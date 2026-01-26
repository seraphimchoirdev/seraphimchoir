
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
