# 찬양대 자리배치 시스템 - 기능 상세설명서

> **버전**: 1.0.0
> **작성일**: 2026-01-15
> **프로젝트명**: SeraphimChoir (스랍 찬양대 자리배치 시스템)

---

## 목차

1. [시스템 개요](#1-시스템-개요)
2. [사용자 인증 및 권한](#2-사용자-인증-및-권한)
3. [찬양대원 관리](#3-찬양대원-관리)
4. [출석 관리](#4-출석-관리)
5. [자리배치 시스템](#5-자리배치-시스템)
6. [AI 자동 배치](#6-ai-자동-배치)
7. [예배 일정 관리](#7-예배-일정-관리)
8. [관리자 기능](#8-관리자-기능)
9. [UI/UX 특징](#9-uiux-특징)
10. [데이터베이스 스키마](#10-데이터베이스-스키마)
11. [API 엔드포인트](#11-api-엔드포인트)

---

## 1. 시스템 개요

### 1.1 프로젝트 소개

찬양대 자리배치 시스템은 교회 찬양대의 좌석 배치를 효율적으로 관리하기 위한 웹 애플리케이션입니다. AI 기반 자동 배치 추천, 드래그앤드롭 수동 편집, 출석 관리, 배치표 이미지 생성 등의 기능을 제공합니다.

### 1.2 기술 스택

| 분야 | 기술 | 버전 |
|------|------|------|
| **프레임워크** | Next.js (App Router) | 16 |
| **UI 라이브러리** | React | 19 |
| **스타일링** | Tailwind CSS | 4 |
| **상태 관리** | Zustand + React Query | - |
| **백엔드/DB** | Supabase (PostgreSQL) | - |
| **인증** | Supabase Auth + Kakao OAuth | - |
| **ML 서비스** | Python FastAPI + GradientBoosting | - |
| **드래그앤드롭** | React DnD | - |
| **아이콘** | Lucide React | - |
| **날짜 처리** | date-fns | - |

### 1.3 아키텍처 개요

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Next.js 16)                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   Pages     │  │ Components  │  │   Hooks/Store       │  │
│  │  (App Dir)  │  │ (Features)  │  │ (Zustand/RQ)        │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                   API Routes (Next.js)                       │
│  /api/members, /api/attendances, /api/arrangements, ...     │
└────────────────────────────┬────────────────────────────────┘
                             │
              ┌──────────────┴──────────────┐
              ▼                              ▼
┌─────────────────────────┐    ┌─────────────────────────────┐
│   Supabase (PostgreSQL) │    │   Python ML Service         │
│   - Auth                │    │   - GradientBoosting        │
│   - Database            │    │   - FastAPI                 │
│   - Storage             │    │   - Seat Recommendation     │
│   - RLS                 │    │                             │
└─────────────────────────┘    └─────────────────────────────┘
```

---

## 2. 사용자 인증 및 권한

### 2.1 인증 방식

#### 이메일/비밀번호 인증
- 회원가입: 이름, 이메일, 비밀번호 입력
- 로그인: 이메일, 비밀번호 입력
- 비밀번호: 최소 6자 이상

#### 카카오 OAuth
- 카카오 계정으로 간편 로그인
- 로그인 후 대원 연결 필요 (관리자 승인)

### 2.2 역할 체계 (6단계)

| 역할 | 설명 | 주요 권한 |
|------|------|----------|
| **ADMIN** | 시스템 관리자 | 모든 권한, 사용자 역할 부여 |
| **CONDUCTOR** | 지휘자 | 배치표 생성/편집, 대원 관리, 지휘자 메모 |
| **MANAGER** | 총무/부총무 | 대원 관리, 출석 관리, 긴급 배치 수정, 문서 관리 |
| **STAFF** | 대장/서기/회계 | 일정 조회, 문서 관리, 배치표 조회 |
| **PART_LEADER** | 파트장 | 자기 파트 출석 관리, 대원 정보 조회 |
| **MEMBER** | 일반 대원 | 본인 출석 신청, 배치표 조회 |

### 2.3 권한 매트릭스

| 기능 | ADMIN | CONDUCTOR | MANAGER | STAFF | PART_LEADER | MEMBER |
|------|:-----:|:---------:|:-------:|:-----:|:-----------:|:------:|
| 사용자 역할 관리 | ✓ | - | - | - | - | - |
| 대원 연결 승인 | ✓ | - | - | - | - | - |
| 배치표 생성/편집 | ✓ | ✓ | - | - | - | - |
| 배치표 긴급 수정 | ✓ | ✓ | ✓ | - | - | - |
| 대원 등록/수정 | ✓ | ✓ | ✓ | - | ✓ | - |
| 전체 출석 관리 | ✓ | ✓ | ✓ | - | - | - |
| 파트 출석 관리 | ✓ | ✓ | ✓ | - | ✓ | - |
| 지휘자 메모 | - | ✓ | - | - | - | - |
| 문서 관리 | ✓ | ✓ | ✓ | ✓ | - | - |
| 예배 일정 조회 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| 배치표 조회 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| 본인 출석 신청 | - | - | - | - | - | ✓ |

### 2.4 대원 연결 시스템

카카오 로그인 사용자가 찬양대원으로 인증받는 프로세스:

1. 카카오로 로그인
2. `/member-link` 페이지에서 본인 대원 선택
3. 연결 요청 제출 (pending 상태)
4. 관리자가 `/admin/member-links`에서 승인/거절
5. 승인 시 MEMBER 역할 자동 부여

---

## 3. 찬양대원 관리

### 3.1 대원 등록

**경로**: `/members/new`

**입력 필드**:
- 이름 (필수)
- 파트: SOPRANO, ALTO, TENOR, BASS, SPECIAL
- 자격 상태: 정대원, 신입대원, 휴직대원, 사직대원
- 파트장 여부
- 연락처, 이메일, 메모 (선택)
- 입대일

### 3.2 대원 자격 상태

| 상태 | 설명 | 배치 가능 |
|------|------|:--------:|
| **REGULAR** (정대원) | 정식 대원, 예배 등단 가능 | ✓ |
| **NEW** (신입대원) | 신규 입대, 연습만 참여 (2-4주 후 승격) | - |
| **ON_LEAVE** (휴직대원) | 일시적 활동 중단 | - |
| **RESIGNED** (사직대원) | 활동 종료 | - |

### 3.3 휴직/복직 처리

#### 휴직 처리
- 대원 상태를 ON_LEAVE로 변경
- 휴직 시작일 자동 기록
- 1개월 후 복귀 예정일 안내

#### 복직 처리
- 휴직 기간에 따른 연습 참여 요건:
  - 1개월 미만: 2회 연습 참여
  - 1개월 이상: 4회 연습 참여
- 복직 시 정대원(REGULAR) 상태로 변경

### 3.4 지휘자 전용 메모

**접근 권한**: CONDUCTOR만

**보안**:
- AES-256-GCM 암호화 저장
- 환경 변수 기반 마스터 키
- ADMIN도 접근 불가 (DB에서 직접 조회 불가)

**용도**:
- 대원별 민감한 정보 기록
- 성악적 특성, 배치 선호도 등 메모

### 3.5 대원 목록 기능

**필터링**:
- 파트별 (SOPRANO, ALTO, TENOR, BASS, ALL)
- 상태별 (정대원, 신입대원, 휴직대원, 사직대원, ALL)
- 이름 검색
- 장기 미출석 (1/2/3개월 이상)

**정렬**:
- 이름순
- 파트순
- 등록일순
- 최근 등단일순
- 최근 연습일순

**페이지네이션**: 10/20/50/100개씩

---

## 4. 출석 관리

### 4.1 출석 기록 유형

| 필드 | 설명 |
|------|------|
| **is_service_available** | 예배 등단 가능 여부 |
| **is_practice_attended** | 예배 후 연습 참석 여부 (기본값: true) |

### 4.2 출석 입력 방식

#### 관리자 일괄 입력
**경로**: `/attendances`

1. 캘린더에서 날짜 선택 (예배 일정이 있는 날만 활성)
2. 파트별 대원 목록 표시
3. 각 대원의 등단 가능/불가 선택
4. 저장 버튼 또는 자동 저장

#### 대원 개인 신청
**경로**: `/my-attendance`

- 카카오 로그인 + 대원 연결된 사용자만 접근
- 다가오는 4주간 예배 목록 표시
- 마감 시간 표시
- "가능/불가" 버튼으로 신청
- 마감 후 수정 불가

### 4.3 출석 마감 시스템

#### 마감 유형
- **파트별 마감**: 특정 파트만 마감 (PART_LEADER 가능)
- **전체 마감**: 모든 파트 마감 (CONDUCTOR/ADMIN만)

#### 마감 효과
- PART_LEADER/MANAGER: 마감된 부분 수정 불가
- CONDUCTOR/ADMIN: 마감 우회하여 수정 가능

### 4.4 출석 통계

**경로**: `/statistics`

**제공 통계**:
- 기간별 출석률
- 파트별 출석률
- 개별 대원 출석 이력
- 장기 미출석자 목록

**RPC 함수**:
- `get_attendance_statistics()`: 전체 통계
- `get_part_attendance_statistics()`: 파트별 통계
- `get_member_attendance_history()`: 개인 이력
- `get_attendance_summary_by_date()`: 날짜별 요약

---

## 5. 자리배치 시스템

### 5.1 배치표 생성

**경로**: `/arrangements`

**생성 다이얼로그 입력**:
- 예배 날짜 (예배 일정이 등록된 날짜만 선택 가능)
- 배치표 제목
- 지휘자 이름

### 5.2 배치표 편집

**경로**: `/arrangements/[id]`

#### 레이아웃 구성
- **데스크톱**: 3패널 (그리드 설정 | 대원 사이드바 | 좌석 그리드)
- **모바일**: 상단 좌석 그리드 + 하단 대원 드로어

#### 좌석 그리드 설정
- 행 수: 4-8행
- 행별 인원: 개별 설정 가능
- 지그재그 패턴: none / even / odd

#### 좌석 배치 방법
1. **드래그앤드롭**: 대원을 좌석으로 드래그
2. **클릭 배치**: 좌석 클릭 후 대원 선택
3. **더블클릭 제거**: 좌석에서 대원 제거
4. **컨텍스트 메뉴**: 마우스 우클릭으로 긴급 수정

#### 실행 취소/재실행
- `Ctrl+Z`: 실행 취소
- `Ctrl+Y`: 재실행
- 히스토리 기반 상태 관리

### 5.3 배치표 상태 관리

```
DRAFT (초안)
    ↓ 공유
SHARED (공유됨)
    ↓ 확정
CONFIRMED (확정됨)
```

| 상태 | ADMIN/CONDUCTOR | MANAGER | 기타 |
|------|:---------------:|:-------:|:----:|
| **DRAFT** | 전체 편집 | 읽기 전용 | 읽기 전용 |
| **SHARED** | 전체 편집 | 긴급 수정 | 읽기 전용 |
| **CONFIRMED** | 읽기 전용 | 읽기 전용 | 읽기 전용 |

### 5.4 이미지 캡처

**기능**: 배치표를 이미지(PNG)로 다운로드

**구성 요소**:
- 헤더: 제목, 지휘자, 날짜
- 좌석 그리드: 파트별 색상 표시
- 푸터: 파트 색상 범례

**해상도**:
- 데스크톱: Full HD
- 모바일: 최적화된 해상도

### 5.5 과거 배치 적용

**기능**: 이전 배치표의 좌석 배치를 현재 배치표에 적용

**사용 시나리오**:
- 비슷한 인원 구성의 과거 배치 재사용
- 특정 예배 형식의 배치 패턴 유지

---

## 6. AI 자동 배치

### 6.1 하이브리드 추천 전략

```
사용자 요청
    ↓
[1단계] Python ML 서비스 확인
    ├─ 가능 → GradientBoosting 모델 추론
    │         파트 규칙 + ML 예측 결합
    │         품질 메트릭 계산
    │         → ML 응답 반환
    │
    └─ 불가 → [2단계] TypeScript Fallback
              규칙 기반 알고리즘
              학습된 선호도 적용
              → Fallback 응답 반환
```

### 6.2 Python ML 서비스

**위치**: `/ml-service/`

**모델**: GradientBoosting Classifier
- Row 예측 모델 (행 결정)
- Col 예측 모델 (열 결정)
- 독립 학습 (각 100개 estimators)

**입력 피처 (18개)**:
1. 기본 정보: part, height, experience
2. 통계 피처: preferred_row, preferred_col, row/col_consistency, is_fixed_seat
3. 컨텍스트: total_members, part_ratios (4개)
4. 파트 규칙: is_front_row_part, is_left_side_part, row_min, row_max

### 6.3 TypeScript 규칙 기반 알고리즘

**위치**: `src/lib/ai-seat-algorithm.ts`

**6단계 프로세스**:
1. 파트별 인원 집계
2. ML 기반 행 구성 추천
3. 파트별 행 분배 계산
4. 고정석 선호도 계산
5. 대원 그룹화 및 정렬
6. 행별 좌석 배치

**파트별 배치 규칙**:

| 파트 | 선호 행 | Overflow | 좌우 | 앞뒤 |
|------|---------|----------|------|------|
| SOPRANO | 1-3 | 4-6 (좌측 끝) | LEFT (92%) | FRONT (78%) |
| ALTO | 1-3 | 4행만 | RIGHT (99.8%) | FRONT (86.6%) |
| TENOR | 4-6 | 없음 | LEFT (97.7%) | BACK (99.5%) |
| BASS | 4-6 | 없음 | RIGHT (97.8%) | BACK (99.5%) |

### 6.4 학습 데이터 시스템

#### 데이터 소스
1. **DB 우선**: `member_seat_statistics` 테이블
2. **JSON Fallback**: `training_data/member_seat_preferences.json`

#### 학습 테이블

**member_seat_statistics**:
- 대원별 선호 좌석 (preferred_row, preferred_col)
- 일관성 점수 (row_consistency, col_consistency)
- 고정석 여부 (is_fixed_seat)
- 총 배치 횟수 (total_appearances)

**row_distribution_patterns**:
- 인원수별 최적 행 구성
- 예: 83명 → 6행, [15, 15, 15, 14, 13, 11]

**ml_arrangement_history**:
- 배치 기록 (날짜, 인원, 파트 구성)
- 품질 점수 및 메트릭

### 6.5 품질 메트릭

**계산 공식**:
```
qualityScore = (
  placementRate × 0.5 +    // 배치율 (50%)
  partBalance × 0.3 +      // 파트 균형 (30%)
  heightOrder × 0.2        // 키 순서 (20%)
)
```

| 메트릭 | 설명 | 가중치 |
|--------|------|:------:|
| **placementRate** | 배치된 대원 / 전체 대원 | 50% |
| **partBalance** | 파트별 인원 분산도 | 30% |
| **heightOrder** | 같은 행 내 키 정렬도 | 20% |

---

## 7. 예배 일정 관리

### 7.1 예배 일정

**경로**: `/service-schedules`

**입력 필드**:
- 날짜 (필수, UNIQUE)
- 예배 유형 (주일예배, 수요예배 등)
- 예배 시작 시간
- 찬양곡명, 작곡가, 악보 출처
- 봉헌송 연주자
- 복장 색상
- 연습 전/후 정보 (장소, 시간)

### 7.2 분기별 캘린더

- 분기 선택 (1Q ~ 4Q)
- 월별 캘린더 그리드
- 예배 일정 배지 표시
- 클릭하여 상세 보기/편집

### 7.3 행사 일정

**경로**: `/service-schedules` (통합)

**행사 유형**:
- FELLOWSHIP: 야유회/수련회
- PERFORMANCE: 찬양발표회
- CHURCH_EVENT: 교회 전체 행사
- OTHER: 기타

---

## 8. 관리자 기능

### 8.1 사용자 역할 관리

**경로**: `/admin/users`

**기능**:
- 전체 사용자 목록 조회
- 역할(role) 변경: ADMIN → MEMBER 단계
- 직책(title) 부여: 총무, 부총무, 회계, 서기, 악보계, 대장 등

### 8.2 대원 연결 승인

**경로**: `/admin/member-links`

**기능**:
- 대기 중인 연결 요청 목록
- 요청자 정보 및 연결 대상 대원 확인
- 승인/거절 처리
- 승인 시 MEMBER 역할 자동 부여

### 8.3 문서 아카이빙

**경로**: `/documents`

**기능**:
- 문서 업로드 (5MB 제한)
- 태그 기반 분류
- 연도별 필터링
- 전문 검색 (제목, 설명)

**접근 권한**: ADMIN, CONDUCTOR, MANAGER, STAFF

### 8.4 관리자 대시보드

**경로**: `/admin`

**표시 정보**:
- 전체 사용자 통계
- 역할별 사용자 수
- 대기 중인 연결 요청 수
- 빠른 메뉴 (사용자 관리, 연결 승인)

---

## 9. UI/UX 특징

### 9.1 반응형 디자인

#### 데스크톱 (1024px 이상)
- 넓은 테이블 레이아웃
- 사이드 패널 표시
- 3패널 배치표 편집기

#### 태블릿/모바일 (1024px 미만)
- 카드 기반 레이아웃
- 접을 수 있는 드로어
- 플로팅 액션 버튼
- 바텀 시트 설정 패널

### 9.2 네비게이션

**Header 구성**:
- 로고 (홈 링크)
- 주요 메뉴 (대시보드, 대원관리, 출석관리, 자리배치, 예배일정)
- 관리자 메뉴 (ADMIN 전용)
- 사용자 프로필 드롭다운

**모바일 네비게이션**:
- 햄버거 메뉴
- 슬라이드 아웃 사이드바

### 9.3 컬러 시스템

#### 파트별 색상
| 파트 | 색상 | 용도 |
|------|------|------|
| SOPRANO | Orange (#F97316) | 배지, 좌석 |
| ALTO | Amber (#F59E0B) | 배지, 좌석 |
| TENOR | Sky (#0EA5E9) | 배지, 좌석 |
| BASS | Green (#22C55E) | 배지, 좌석 |
| SPECIAL | Gray (#6B7280) | 배지, 좌석 |

#### 상태별 색상
| 상태 | 색상 | 용도 |
|------|------|------|
| 정대원 | Primary Blue | 상태 배지 |
| 신입대원 | Success Green | 상태 배지 |
| 휴직대원 | Warning Yellow | 상태 배지 |
| 사직대원 | Error Red | 상태 배지 |

### 9.4 폼 및 입력

**컴포넌트**:
- Input, Textarea, Select
- Checkbox, Switch, Radio
- DatePicker (Calendar 기반)
- ComboBox (검색 가능한 선택)

**유효성 검사**:
- 클라이언트: React Hook Form + Zod
- 서버: Zod 스키마 검증

### 9.5 피드백 시스템

**알림 유형**:
- Success: 작업 성공
- Error: 오류 발생
- Warning: 주의 필요
- Info: 정보 안내

**로딩 상태**:
- Spinner 컴포넌트
- 버튼 로딩 상태
- 스켈레톤 UI

---

## 10. 데이터베이스 스키마

### 10.1 주요 테이블

#### members (찬양대원)
```sql
- id: UUID (PK)
- name: TEXT (필수)
- part: ENUM (SOPRANO, ALTO, TENOR, BASS, SPECIAL)
- member_status: ENUM (REGULAR, NEW, ON_LEAVE, RESIGNED)
- is_leader: BOOLEAN
- phone_number, email, notes: TEXT
- encrypted_conductor_notes: TEXT (암호화)
- joined_date: DATE
- leave_start_date, expected_return_date: DATE
- version: INTEGER (낙관적 잠금)
```

#### attendances (출석)
```sql
- id: UUID (PK)
- member_id: UUID (FK)
- date: DATE
- is_service_available: BOOLEAN
- is_practice_attended: BOOLEAN
- notes: TEXT
- UNIQUE(member_id, date)
```

#### arrangements (배치표)
```sql
- id: UUID (PK)
- date: DATE
- title: TEXT
- conductor: TEXT
- status: TEXT (DRAFT, SHARED, CONFIRMED)
- grid_rows: INTEGER (4-8)
- grid_layout: JSONB
- image_url: TEXT
```

#### seats (좌석)
```sql
- id: UUID (PK)
- arrangement_id: UUID (FK)
- member_id: UUID (FK)
- seat_row: INTEGER
- seat_column: INTEGER
- part: ENUM
- is_row_leader: BOOLEAN
- UNIQUE(arrangement_id, seat_row, seat_column)
```

#### user_profiles (사용자)
```sql
- id: UUID (PK, FK → auth.users)
- email: TEXT
- name: TEXT
- role: TEXT
- title: TEXT
- linked_member_id: UUID (FK)
- link_status: TEXT
```

### 10.2 ML 학습 테이블

#### member_seat_statistics
```sql
- member_id: UUID (PK)
- preferred_row, preferred_col: INTEGER
- row_consistency, col_consistency: NUMERIC
- is_fixed_seat: BOOLEAN
- total_appearances: INTEGER
```

#### row_distribution_patterns
```sql
- total_members: INTEGER (PK)
- rows: INTEGER
- capacities: INTEGER[]
```

### 10.3 테이블 관계도

```
members ─────┬───── attendances
             │
             ├───── seats ────── arrangements
             │
             ├───── member_seat_statistics
             │
             └───── user_profiles

service_schedules (독립)
attendance_deadlines (독립)
choir_events (독립)
documents (독립)
```

---

## 11. API 엔드포인트

### 11.1 인증 API

| 메서드 | 경로 | 기능 |
|--------|------|------|
| POST | `/api/auth/signup` | 회원가입 |
| POST | `/api/auth/login` | 로그인 |
| POST | `/api/auth/logout` | 로그아웃 |
| GET | `/api/auth/me` | 현재 사용자 조회 |
| PATCH | `/api/auth/roles` | 역할 변경 (ADMIN) |

### 11.2 대원 API

| 메서드 | 경로 | 기능 |
|--------|------|------|
| GET | `/api/members` | 대원 목록 (필터, 페이지네이션) |
| POST | `/api/members` | 대원 등록 |
| GET | `/api/members/[id]` | 대원 상세 조회 |
| PATCH | `/api/members/[id]` | 대원 수정 |
| DELETE | `/api/members/[id]` | 대원 삭제 |
| GET/PUT/DELETE | `/api/members/[id]/conductor-notes` | 지휘자 메모 |

### 11.3 출석 API

| 메서드 | 경로 | 기능 |
|--------|------|------|
| GET | `/api/attendances` | 출석 목록 |
| POST | `/api/attendances` | 출석 생성 |
| PATCH | `/api/attendances/[id]` | 출석 수정 |
| POST/PATCH | `/api/attendances/batch` | 일괄 처리 |
| GET/POST | `/api/attendances/deadlines` | 마감 관리 |
| GET | `/api/attendances/stats` | 출석 통계 |

### 11.4 배치표 API

| 메서드 | 경로 | 기능 |
|--------|------|------|
| GET | `/api/arrangements` | 배치표 목록 |
| POST | `/api/arrangements` | 배치표 생성 |
| GET | `/api/arrangements/[id]` | 배치표 상세 |
| PATCH | `/api/arrangements/[id]` | 배치표 수정 |
| POST | `/api/arrangements/[id]/seats` | 좌석 저장 |
| POST | `/api/arrangements/[id]/recommend` | AI 추천 |
| POST | `/api/arrangements/[id]/apply-past` | 과거 배치 적용 |
| GET | `/api/arrangements/[id]/analyze` | 배치 분석 |

### 11.5 예배 일정 API

| 메서드 | 경로 | 기능 |
|--------|------|------|
| GET | `/api/service-schedules` | 일정 목록 |
| POST | `/api/service-schedules` | 일정 생성 |
| PATCH | `/api/service-schedules/[id]` | 일정 수정 |
| DELETE | `/api/service-schedules/[id]` | 일정 삭제 |
| POST | `/api/service-schedules/bulk` | 일괄 생성 |

---

## 부록: 파일 구조

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API Routes
│   ├── members/           # 대원 관리 페이지
│   ├── attendances/       # 출석 관리 페이지
│   ├── arrangements/      # 배치표 페이지
│   ├── admin/             # 관리자 페이지
│   └── ...
├── components/
│   ├── ui/                # 기본 UI 컴포넌트
│   ├── layout/            # 레이아웃 컴포넌트
│   └── features/          # 기능별 컴포넌트
│       ├── members/       # 대원 관련
│       ├── attendances/   # 출석 관련
│       ├── arrangements/  # 배치표 관련
│       ├── seats/         # 좌석 그리드
│       └── ...
├── hooks/                  # 커스텀 React Hooks
├── store/                  # Zustand 스토어
├── lib/                    # 유틸리티
│   ├── supabase/          # Supabase 클라이언트
│   ├── ai-seat-algorithm.ts  # AI 배치 알고리즘
│   └── quality-metrics.ts    # 품질 메트릭
└── types/                  # TypeScript 타입

ml-service/                 # Python ML 서비스
├── app/
│   ├── models/            # ML 모델
│   ├── routers/           # API 라우터
│   └── schemas/           # Pydantic 스키마
└── training_data/         # 학습 데이터

supabase/
├── migrations/            # DB 마이그레이션
└── config.toml            # Supabase 설정
```

---

*이 문서는 2026년 1월 15일 기준으로 작성되었습니다.*
