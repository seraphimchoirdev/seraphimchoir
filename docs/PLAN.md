# 찬양대 자리배치 시스템 - 개발 계획서 (PLAN.md)

> **프로젝트명**: Choir Seat Arranger
> **버전**: 2.0 (Supabase Edition)
> **최종 업데이트**: 2025-01-19
> **상태**: Phase 1.5 완료 (Member Status 필드 추가), Phase 2 진행 예정

---

## 목차

1. [프로젝트 개요](#1-프로젝트-개요)
2. [기술 스택 및 아키텍처 결정사항](#2-기술-스택-및-아키텍처-결정사항)
3. [데이터베이스 설계](#3-데이터베이스-설계)
4. [전체 개발 로드맵](#4-전체-개발-로드맵)
5. [API 설계](#5-api-설계)
6. [UI/UX 설계 원칙](#6-uiux-설계-원칙)
7. [보안 및 권한 관리](#7-보안-및-권한-관리)
8. [성능 최적화 계획](#8-성능-최적화-계획)
9. [테스트 전략](#9-테스트-전략)
10. [배포 및 운영 계획](#10-배포-및-운영-계획)
11. [현재 진행 상황](#11-현재-진행-상황)
12. [리스크 및 대응 방안](#12-리스크-및-대응-방안)
13. [향후 확장 계획](#13-향후-확장-계획)
14. [참고 자료](#14-참고-자료)

---

## 1. 프로젝트 개요

### 1.1 프로젝트 비전

교회 찬양대의 자리배치를 **AI 기반 자동 추천**으로 혁신하여, 지휘자와 총무의 업무 부담을 70% 이상 줄이고, **최적의 음향적 균형**을 자동으로 제안하는 웹 애플리케이션을 만듭니다.

### 1.2 해결하려는 문제

#### 기존 문제점

- 📋 **수동 작업의 비효율성**: 매주 40-60분 소요되는 자리배치 작업
- 🎯 **최적화 어려움**: 파트별 균형, 키, 경력을 고려한 배치가 어려움
- 📞 **등단 현황 수집 번거로움**: 카카오톡/문자로 개별 연락
- 📄 **배치표 작성 및 공유**: 엑셀 수동 작성 후 이미지 캡처/공유
- 💾 **데이터 활용 부족**: 과거 배치 데이터를 활용하지 못함

#### 솔루션

- ✅ **자동 추천 시스템**: AI가 과거 데이터를 학습하여 최적 배치 제안
- ✅ **드래그 앤 드롭**: 직관적인 UI로 빠른 미세 조정
- ✅ **카카오톡 연동**: 자동으로 등단 현황 수집 및 배치표 공유
- ✅ **통계 및 분석**: 출석률, 파트별 균형 등 자동 분석

### 1.3 핵심 가치 제안

| 사용자       | 기존 방식                     | 우리 서비스                  | 개선 효과            |
| ------------ | ----------------------------- | ---------------------------- | -------------------- |
| **지휘자**   | 엑셀에서 수동 배치 (40분)     | AI 추천 + 드래그 조정 (10분) | **75% 시간 절감**    |
| **총무**     | 카카오톡으로 개별 연락 (30분) | 자동 메시지 수집 (5분)       | **83% 시간 절감**    |
| **찬양대원** | 매주 문자 응답 (불편)         | 앱에서 원클릭 체크           | **편의성 대폭 향상** |

### 1.4 주요 사용자

#### Primary Users (주요 사용자)

- 🎼 **찬양대 지휘자** (Conductor): 자리배치 최종 결정 및 승인, 민감한 메모 작성
- 📊 **찬양대 총무** (Manager): 등단 현황 관리, 배치표 작성 및 공유

#### Secondary Users (부차적 사용자)

- 🎵 **찬양대원**: 등단 현황 입력, 자신의 배치 확인
- 👥 **파트 리더** (Part Leader): 파트별 인원 관리, 등단 현황 관리
- 🔐 **교회 관리자** (Admin): 사용자 관리, 권한 부여

---

## 2. 기술 스택 및 아키텍처 결정사항

### 2.1 전체 기술 스택

```
┌─────────────────────────────────────────────────┐
│             Frontend (Client)                    │
│  ┌───────────────────────────────────────────┐  │
│  │  Next.js 16 (App Router)                  │  │
│  │  - React 19 (React Compiler 활성화)       │  │
│  │  - TypeScript 5.x                         │  │
│  │  - Tailwind CSS 4                         │  │
│  └───────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────┐  │
│  │  State Management                         │  │
│  │  - Zustand (클라이언트 상태)              │  │
│  │  - React Query (서버 상태 & 캐싱)        │  │
│  └───────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────┐  │
│  │  UI Libraries                             │  │
│  │  - React DnD (드래그 앤 드롭)             │  │
│  │  - Lucide React (아이콘)                 │  │
│  │  - Canvas API (배치표 이미지 생성)       │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
                      ↕️ HTTPS/WSS
┌─────────────────────────────────────────────────┐
│          Backend & Database (Supabase)          │
│  ┌───────────────────────────────────────────┐  │
│  │  PostgreSQL 15 + RLS                      │  │
│  │  - 5 Tables (members, attendances, ...)   │  │
│  │  - Row Level Security (역할 기반 접근)    │  │
│  │  - Triggers & Functions                   │  │
│  └───────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────┐  │
│  │  Supabase Auth                            │  │
│  │  - Email/Password 인증                    │  │
│  │  - Kakao OAuth (Phase 6)                  │  │
│  │  - JWT 기반 세션 관리                     │  │
│  └───────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────┐  │
│  │  Supabase Storage                         │  │
│  │  - 배치표 이미지 저장 (S3 호환)          │  │
│  └───────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────┐  │
│  │  Supabase Realtime (선택적)               │  │
│  │  - 실시간 출석 현황 업데이트              │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
                      ↕️ HTTP/REST
┌─────────────────────────────────────────────────┐
│        ML Service (Python FastAPI) [Phase 4]    │
│  ┌───────────────────────────────────────────┐  │
│  │  AI 배치 추천 알고리즘                    │  │
│  │  - TensorFlow/PyTorch                     │  │
│  │  - 과거 데이터 학습                       │  │
│  │  - RESTful API 제공                       │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

### 2.2 주요 기술 선택 이유

#### Next.js 16 + React 19

**선택 이유**:

- ✅ **React 19 Compiler**: 자동 메모이제이션으로 성능 최적화
- ✅ **App Router**: 파일 기반 라우팅, 레이아웃 시스템
- ✅ **Server Components**: 초기 로딩 속도 향상 (SEO 유리)
- ✅ **API Routes**: 별도 백엔드 없이 서버 로직 구현 가능
- ✅ **Image Optimization**: 자동 이미지 최적화

**대안 고려**:

- ❌ Create React App: 느린 빌드, SSR 미지원
- ❌ Vite + React: SSR 설정 복잡

#### Supabase (PostgreSQL + BaaS)

**선택 이유**:

- ✅ **All-in-One Backend**: DB + Auth + Storage + Realtime 통합
- ✅ **PostgreSQL**: 강력한 관계형 DB, ACID 보장
- ✅ **Row Level Security**: 테이블 레벨 보안 정책
- ✅ **무료 티어**: 500MB DB, 1GB Storage, 무제한 API 요청
- ✅ **TypeScript 타입 자동 생성**: DB 스키마 → TS 타입

**대안 고려**:

- ❌ Firebase: NoSQL (관계형 데이터 모델링 어려움)
- ❌ AWS (RDS + Cognito + S3): 설정 복잡, 비용 높음
- ❌ Prisma + PostgreSQL: 직접 DB 호스팅 필요

#### Tailwind CSS 4

**선택 이유**:

- ✅ **Utility-First**: 빠른 프로토타이핑
- ✅ **JIT Compiler**: 사용하지 않는 CSS 자동 제거
- ✅ **반응형 디자인**: 모바일 우선 설계
- ✅ **다크 모드 지원**: 향후 확장 가능

#### React Query (TanStack Query)

**선택 이유**:

- ✅ **서버 상태 관리**: 자동 캐싱, 재검증, 백그라운드 업데이트
- ✅ **Optimistic Updates**: 낙관적 UI 업데이트 (UX 향상)
- ✅ **에러 처리**: 자동 재시도, 에러 바운더리

#### Zustand (클라이언트 상태 관리)

**선택 이유**:

- ✅ **경량**: Redux보다 100배 작은 번들 크기
- ✅ **단순함**: Boilerplate 없음, 직관적인 API
- ✅ **TypeScript 친화적**: 타입 추론 완벽 지원

### 2.3 보안 아키텍처

#### AES-256-GCM 암호화 시스템 (지휘자 메모)

```typescript
// 암호화 흐름
Client → API Route (서버) → 암호화 (Node.js crypto) → Supabase DB

// 복호화 흐름
Supabase DB → API Route (서버) → 복호화 → Client

// 특징
- 마스터 키: 환경 변수 (CONDUCTOR_NOTES_ENCRYPTION_KEY)
- IV (Initialization Vector): 각 메모마다 랜덤 생성, DB 저장
- Auth Tag: GCM 모드 무결성 검증
- ADMIN도 DB에서 평문 확인 불가능
```

---

## 3. 데이터베이스 설계

### 3.1 ERD (Entity Relationship Diagram)

```
┌─────────────────┐
│   auth.users    │ (Supabase Auth 내장 테이블)
│                 │
│ - id (PK)       │
│ - email         │
│ - created_at    │
└────────┬────────┘
         │ 1:1
         ↓
┌─────────────────┐
│ user_profiles   │ (사용자 프로필)
│                 │
│ - id (PK/FK)    │────┐
│ - email         │    │
│ - name          │    │
│ - role          │    │ (역할 기반 접근 제어)
│ - created_at    │    │
│ - updated_at    │    │
└─────────────────┘    │
                       │
         ┌─────────────┴──────────────────────────┐
         ↓                                        ↓
┌─────────────────┐                     ┌─────────────────┐
│    members      │ (찬양대원)          │  arrangements   │ (자리배치표)
│                 │                     │                 │
│ - id (PK)       │                     │ - id (PK)       │
│ - name          │                     │ - date          │
│ - part (ENUM)   │                     │ - title         │
│ - height        │                     │ - service_info  │
│ - experience    │                     │ - conductor     │
│ - is_leader     │                     │ - image_url     │
│ - member_status │ (자격 상태 ENUM)    │ - is_published  │
│ - phone_number  │                     │ - created_at    │
│ - email         │                     │ - updated_at    │
│ - notes         │                     └────────┬────────┘
│ - encrypted_... │ (암호화 메모 필드)           │ 1:N
│ - created_at    │                              ↓
│ - updated_at    │
└────────┬────────┘                     ┌─────────────────┐
         │ 1:N                          │     seats       │ (개별 좌석)
         ↓                              │                 │
┌─────────────────┐                     │ - id (PK)       │
│  attendances    │ (출석 현황)         │ - arrangement_id│
│                 │                     │ - member_id (FK)│───┐
│ - id (PK)       │                     │ - seat_row      │   │
│ - member_id(FK) │─────────────────────│ - seat_column   │   │
│ - date          │                     │ - part          │   │
│ - is_available  │                     │ - created_at    │   │
│ - notes         │                     └─────────────────┘   │
│ - created_at    │                                           │
│ - updated_at    │                                           │
└─────────────────┘                                           │
         ↑                                                    │
         └────────────────────────────────────────────────────┘
                              N:1
```

### 3.2 테이블 상세 스키마

#### 3.2.1 members (찬양대원)

**목적**: 찬양대원의 기본 정보 및 특성 관리

```sql
CREATE TABLE members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,                          -- 이름
  part part NOT NULL,                          -- 파트 (ENUM)
  height INTEGER,                              -- 키 (cm, nullable)
  experience INTEGER NOT NULL DEFAULT 0,       -- 경력 (년)
  is_leader BOOLEAN NOT NULL DEFAULT false,    -- 리더 여부
  member_status member_status NOT NULL DEFAULT 'NEW', -- 대원 자격 상태
  phone_number TEXT,                           -- 연락처
  email TEXT UNIQUE,                           -- 이메일 (unique)
  notes TEXT,                                  -- 일반 특이사항 (모두 볼 수 있음)

  -- 🔒 지휘자 전용 암호화 메모 (AES-256-GCM)
  encrypted_conductor_notes TEXT,              -- 암호화된 메모
  conductor_notes_iv TEXT,                     -- IV (Initialization Vector)
  conductor_notes_auth_tag TEXT,               -- 인증 태그 (무결성 검증)

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 인덱스
CREATE INDEX idx_members_part ON members(part);
CREATE INDEX idx_members_name ON members(name);
CREATE INDEX idx_members_status ON members(member_status);
```

**Part ENUM**:

```sql
CREATE TYPE part AS ENUM ('SOPRANO', 'ALTO', 'TENOR', 'BASS', 'SPECIAL');
```

**Member Status ENUM** (찬양대원 자격 상태):

```sql
CREATE TYPE member_status AS ENUM ('REGULAR', 'NEW', 'ON_LEAVE', 'RESIGNED');
```

- `REGULAR` (정대원): 예배 참여 가능한 정식 대원
- `NEW` (신입대원): 연습만 참여, 예배 참여 불가 (2-4주 후 정대원으로 승격)
- `ON_LEAVE` (휴직대원): 일시적으로 활동 중단
- `RESIGNED` (사직대원): 활동 종료

**비즈니스 규칙**:

- `name`: 필수, 2-50자
- `part`: 필수, ENUM 값 중 하나
- `height`: 선택, 100-250cm 범위
- `experience`: 0 이상
- `member_status`: 기본값 NEW, 지휘자/관리자가 REGULAR로 승격 가능
- `encrypted_conductor_notes`: CONDUCTOR만 API를 통해 접근 가능
- **예배 출석 조사 시**: `member_status = 'REGULAR'`인 대원만 조회 (신입대원은 연습만 참여)

#### 3.2.2 attendances (출석 현황)

**목적**: 주간 예배별 찬양대원 등단 가능 여부 추적

```sql
CREATE TABLE attendances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  date DATE NOT NULL,                          -- 예배 날짜
  is_available BOOLEAN NOT NULL DEFAULT true,  -- 등단 가능 여부
  notes TEXT,                                  -- 비고 (결석 사유 등)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(member_id, date)                      -- 중복 방지
);

-- 인덱스
CREATE INDEX idx_attendances_date ON attendances(date);
CREATE INDEX idx_attendances_member_id ON attendances(member_id);
```

**비즈니스 규칙**:

- 한 찬양대원은 하나의 날짜에 하나의 출석 레코드만 가능 (UNIQUE 제약)
- member 삭제 시 관련 출석 레코드 자동 삭제 (CASCADE)

#### 3.2.3 arrangements (자리배치표)

**목적**: 특정 날짜/예배의 자리배치 정보 관리

```sql
CREATE TABLE arrangements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL UNIQUE,                   -- 예배 날짜 (unique)
  title TEXT NOT NULL,                         -- 제목 (예: "주일 1부 예배")
  service_info TEXT,                           -- 예배 정보 (시간, 설교 제목 등)
  conductor TEXT,                              -- 지휘자 이름
  image_url TEXT,                              -- 생성된 배치표 이미지 URL
  is_published BOOLEAN NOT NULL DEFAULT false, -- 공개 여부
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 인덱스
CREATE INDEX idx_arrangements_date ON arrangements(date);
```

**비즈니스 규칙**:

- 한 날짜에 하나의 배치표만 존재 (UNIQUE 제약)
- `is_published = true`: 찬양대원들이 확인 가능
- `image_url`: Phase 5에서 Canvas API로 생성 후 Supabase Storage에 업로드

#### 3.2.4 seats (개별 좌석)

**목적**: 자리배치표 내의 각 좌석 정보 관리

```sql
CREATE TABLE seats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  arrangement_id UUID NOT NULL REFERENCES arrangements(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  seat_row INTEGER NOT NULL,                   -- 행 번호 (1부터 시작)
  seat_column INTEGER NOT NULL,                -- 열 번호 (1부터 시작)
  part part NOT NULL,                          -- 파트 (중복 저장, 빠른 조회)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(arrangement_id, seat_row, seat_column) -- 한 자리에 한 명만
);

-- 인덱스
CREATE INDEX idx_seats_arrangement_id ON seats(arrangement_id);
CREATE INDEX idx_seats_member_id ON seats(member_id);
```

**비즈니스 규칙**:

- 한 배치표(`arrangement`)의 한 좌석(`row`, `column`)에는 한 명만 배치
- arrangement 삭제 시 관련 좌석 자동 삭제 (CASCADE)
- `part` 필드는 members 테이블과 중복이지만, 조회 성능을 위해 비정규화

#### 3.2.5 user_profiles (사용자 프로필)

**목적**: Supabase Auth와 연동된 사용자 추가 정보 및 역할 관리

```sql
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  role TEXT,  -- 'ADMIN', 'CONDUCTOR', 'MANAGER', 'PART_LEADER', NULL
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**역할 (Role)**:

- `null`: 권한 없음 (신규 가입자 기본값, ADMIN이 수동으로 부여)
- `PART_LEADER`: 자신의 파트 찬양대원 관리
- `MANAGER`: 전체 찬양대원 및 출석 관리
- `CONDUCTOR`: 자리배치, 지휘자 메모 작성
- `ADMIN`: 모든 권한 + 사용자 역할 부여

**자동 프로필 생성 트리거**:

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NULL  -- 역할은 ADMIN이 수동으로 부여
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### 3.3 Row Level Security (RLS) 정책

**원칙**: 모든 테이블에 RLS 활성화, 역할 기반 접근 제어

#### members 테이블

```sql
-- 조회: 인증된 모든 사용자
CREATE POLICY "Members are viewable by authenticated users"
  ON members FOR SELECT TO authenticated USING (true);

-- 수정: PART_LEADER 이상
CREATE POLICY "Members are editable by part leaders and above"
  ON members FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('ADMIN', 'CONDUCTOR', 'MANAGER', 'PART_LEADER')
    )
  );
```

**암호화 필드 보호**:

- `encrypted_conductor_notes`, `conductor_notes_iv`, `conductor_notes_auth_tag`는 RLS로는 숨길 수 없음
- 대신 `members_public` View를 생성하여 암호화 필드 제외
- CONDUCTOR만 API(`/api/members/[id]/conductor-notes`)를 통해 접근

#### attendances, arrangements, seats 테이블

- 유사한 RLS 정책 적용
- 상세 내용은 `supabase/migrations/20250118000000_initial_schema.sql` 참고

---

## 4. 전체 개발 로드맵

### Phase 개요

| Phase     | 기간 | 상태      | 주요 기능                      |
| --------- | ---- | --------- | ------------------------------ |
| Phase 1   | 1주  | ✅ 완료   | 프로젝트 초기화, Supabase 설정 |
| Phase 1.5 | 3일  | ✅ 완료   | 지휘자 전용 암호화 메모        |
| Phase 2   | 2주  | 🚧 진행중 | 인원 관리 (CRUD, 출석 관리)    |
| Phase 3   | 2주  | ⏳ 예정   | 자리배치 UI (드래그앤드롭)     |
| Phase 4   | 3주  | ⏳ 예정   | AI 자동 배치 알고리즘          |
| Phase 5   | 1주  | ⏳ 예정   | 배치표 이미지 생성             |
| Phase 6   | 2주  | ⏳ 예정   | 카카오톡 연동                  |
| Phase 7   | 1주  | ⏳ 예정   | 배포 및 최적화                 |

**총 예상 기간**: 약 13주 (약 3개월)

---

### Phase 1: 프로젝트 초기화 및 기본 구조 ✅ 완료

**목표**: Next.js 16 + React 19 프로젝트 초기화, Supabase 설정, 기본 파일 구조 설정

#### 완료된 작업

1. ✅ **Next.js 16 프로젝트 생성**

   - App Router 사용
   - TypeScript 설정
   - Tailwind CSS 4 설정
   - React 19 Compiler 활성화 (`next.config.ts`)

2. ✅ **Supabase 설정**

   - 원격 Supabase 프로젝트 생성
   - 환경 변수 설정 (`.env`)
   - Supabase CLI 연결

3. ✅ **데이터베이스 마이그레이션**

   - 5개 테이블 생성 (members, attendances, arrangements, seats, user_profiles)
   - RLS 정책 설정
   - Triggers & Functions 설정
   - TypeScript 타입 자동 생성 (`src/types/database.types.ts`)

4. ✅ **디렉토리 구조 설정**

```
choir-seat-app/
├── src/
│   ├── app/                # Next.js App Router 페이지
│   ├── components/
│   │   ├── ui/            # 기본 UI 컴포넌트
│   │   ├── layout/        # 레이아웃 컴포넌트
│   │   └── features/      # 기능별 컴포넌트
│   ├── lib/
│   │   ├── supabase/      # Supabase 클라이언트
│   │   │   ├── client.ts  # 클라이언트 컴포넌트용
│   │   │   ├── server.ts  # 서버 컴포넌트/API Routes용
│   │   │   └── middleware.ts
│   │   ├── crypto.ts      # 암호화 유틸리티
│   │   └── utils.ts       # 공통 유틸리티
│   ├── hooks/             # 커스텀 React 훅
│   ├── store/             # Zustand 스토어
│   └── types/             # TypeScript 타입
├── supabase/
│   ├── config.toml        # Supabase 설정
│   └── migrations/        # SQL 마이그레이션
└── middleware.ts          # Next.js 미들웨어 (Auth)
```

#### 주요 결정사항

1. **Supabase 선택**: Firebase 대신 PostgreSQL 기반 Supabase 선택
2. **App Router 사용**: Pages Router 대신 App Router 사용
3. **React 19 Compiler**: 자동 메모이제이션으로 성능 최적화

#### 배운 점 / 개선점

- ✅ Supabase CLI의 네트워크 타임아웃 이슈 → Dashboard SQL Editor 사용
- ✅ PostgreSQL 예약어 (`column`) → `seat_column`으로 변경
- ✅ Service Role Key는 `NEXT_PUBLIC_` 접두사 사용하지 않음 (서버 전용)

---

### Phase 1.5: 지휘자 전용 암호화 메모 기능 ✅ 완료

**목표**: CONDUCTOR만 접근 가능한 암호화된 메모 시스템 구현

#### 완료된 작업

1. ✅ **암호화 시스템 구현** (`src/lib/crypto.ts`)

   - AES-256-GCM 알고리즘 사용
   - 환경 변수로 마스터 키 관리
   - IV, Auth Tag 생성 및 검증
   - 암호화 테스트 스크립트 (`scripts/test-crypto.ts`)

2. ✅ **CONDUCTOR 전용 API** (`src/app/api/members/[id]/conductor-notes/route.ts`)

   - GET: 메모 조회 및 복호화
   - PUT: 메모 암호화 후 저장
   - DELETE: 메모 삭제
   - 권한 검증 (CONDUCTOR 또는 ADMIN만)

3. ✅ **UI 컴포넌트** (`src/components/features/members/ConductorNotes.tsx`)

   - 메모 조회/편집/저장/삭제
   - 권한에 따라 렌더링 제어
   - 로딩/에러/성공 상태 처리

4. ✅ **데이터베이스 스키마 업데이트**

   - `encrypted_conductor_notes`, `conductor_notes_iv`, `conductor_notes_auth_tag` 필드 추가
   - `members_public` View 생성 (암호화 필드 제외)

5. ✅ **문서화**
   - `docs/CONDUCTOR_NOTES.md`: 상세 가이드 작성
   - README 업데이트

#### 보안 특징

- 🔒 **AES-256-GCM**: 업계 표준 대칭키 암호화
- 🔒 **서버 측 암호화**: 클라이언트에서 평문 접근 불가
- 🔒 **ADMIN도 확인 불가**: DB에서 암호화된 데이터만 저장
- 🔒 **무결성 검증**: Auth Tag로 데이터 변조 감지

#### 배운 점

- ✅ Node.js `crypto` 모듈은 서버에서만 사용 가능
- ✅ 암호화 키 분실 시 복호화 불가능 → 백업 전략 필요
- ✅ GCM 모드는 IV 재사용 시 보안 취약 → 매번 랜덤 생성

---

### Phase 2: 인원 관리 기능 🚧 진행 예정

**목표**: 찬양대원 CRUD, 출석 현황 관리, 통계 기능 구현

**예상 기간**: 2주 (10일)

#### 주요 기능

##### 2.1 찬양대원 관리 (Members CRUD)

**API 엔드포인트**:

```typescript
// src/app/api/members/route.ts
GET  /api/members?part=SOPRANO&search=홍길동    // 목록 조회 (필터링, 검색)
POST /api/members                               // 신규 등록

// src/app/api/members/[id]/route.ts
GET    /api/members/[id]                        // 단일 조회
PATCH  /api/members/[id]                        // 수정
DELETE /api/members/[id]                        // 삭제
```

**Request/Response 예시**:

```typescript
// POST /api/members
{
  "name": "홍길동",
  "part": "TENOR",
  "height": 175,
  "experience": 5,
  "is_leader": false,
  "phone_number": "010-1234-5678",
  "email": "hong@example.com",
  "notes": "높은 음역대 강함"
}

// Response
{
  "success": true,
  "data": {
    "id": "uuid...",
    "name": "홍길동",
    ...
  }
}
```

**UI 페이지**:

- `/members`: 찬양대원 목록 페이지

  - 파트별 탭 (All, SOPRANO, ALTO, TENOR, BASS)
  - 이름 검색
  - 테이블 형식 목록
  - 등록 버튼

- `/members/[id]`: 찬양대원 상세/편집 페이지

  - 프로필 정보 표시
  - 수정 폼
  - 출석 이력 표시
  - 지휘자 메모 섹션 (CONDUCTOR만 보임)

- `/members/new`: 신규 등록 페이지

##### 2.2 출석 현황 관리 (Attendances)

**API 엔드포인트**:

```typescript
// src/app/api/attendances/route.ts
GET  /api/attendances?date=2025-01-19          // 특정 날짜 출석 현황
POST /api/attendances                          // 출석 기록
PATCH /api/attendances/[id]                    // 수정
DELETE /api/attendances/[id]                   // 삭제

// 대량 업데이트 (batch)
POST /api/attendances/batch
{
  "date": "2025-01-19",
  "attendances": [
    { "member_id": "uuid1", "is_available": true },
    { "member_id": "uuid2", "is_available": false, "notes": "출장" }
  ]
}
```

**UI 페이지**:

- `/attendances`: 출석 관리 페이지

  - 캘린더 뷰 (날짜 선택)
  - 찬양대원 목록 + 출석 체크박스
  - 파트별 출석 인원 통계
  - 일괄 업데이트

- `/attendances/stats`: 통계 페이지
  - 찬양대원별 출석률
  - 파트별 평균 출석 인원
  - 월별/분기별 그래프

##### 2.3 컴포넌트 구조

```
src/components/features/members/
├── MemberList.tsx              # 찬양대원 목록
├── MemberCard.tsx              # 찬양대원 카드 (목록 아이템)
├── MemberForm.tsx              # 찬양대원 등록/수정 폼
├── MemberDetail.tsx            # 찬양대원 상세 정보
├── ConductorNotes.tsx          # 지휘자 메모 (이미 완성)
└── index.ts

src/components/features/attendances/
├── AttendanceCalendar.tsx      # 캘린더 뷰
├── AttendanceList.tsx          # 출석 체크 목록
├── AttendanceStats.tsx         # 통계 차트
└── index.ts
```

##### 2.4 React Query Hooks

```typescript
// src/hooks/useMembers.ts
export function useMembers(filters?: MemberFilters) {
  return useQuery({
    queryKey: ['members', filters],
    queryFn: () => fetchMembers(filters),
  });
}

export function useCreateMember() {
  return useMutation({
    mutationFn: createMember,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
    },
  });
}

// src/hooks/useAttendances.ts
export function useAttendances(date: string) {
  return useQuery({
    queryKey: ['attendances', date],
    queryFn: () => fetchAttendances(date),
  });
}
```

#### 작업 순서

1. **Week 1 (API + 기본 UI)**

   - Day 1-2: Members CRUD API 구현
   - Day 3-4: Attendances API 구현
   - Day 5: 기본 UI 컴포넌트 (MemberList, MemberForm)

2. **Week 2 (고급 기능 + 통합)**
   - Day 6-7: 출석 관리 UI (캘린더, 일괄 업데이트)
   - Day 8: 통계 페이지
   - Day 9: 통합 테스트 및 버그 수정
   - Day 10: 문서화 및 리팩토링

#### 완료 기준

- ✅ 찬양대원 CRUD 모든 작업 가능
- ✅ 출석 현황 입력 및 조회 가능
- ✅ 파트별 필터링 및 검색 작동
- ✅ 통계 페이지에서 차트 표시
- ✅ 모바일 반응형 디자인 적용
- ✅ 에러 처리 및 로딩 상태 표시

---

### Phase 3: 자리배치 UI 구현 ⏳ 예정

**목표**: 드래그 앤 드롭으로 직관적인 자리배치 인터페이스 구현

**예상 기간**: 2주

#### 주요 기능

1. **좌석 그리드 시스템**

   - React DnD 라이브러리 사용
   - 행/열 동적 조정
   - 파트별 색상 코딩

2. **자리배치 CRUD**

   - 배치표 생성/조회/수정/삭제
   - 히스토리 관리 (이전 배치 참조)

3. **실시간 저장**
   - Optimistic Update
   - 자동 저장 (Debounce)

#### API 엔드포인트

```typescript
// src/app/api/arrangements/route.ts
GET  /api/arrangements?date=2025-01-19        // 목록 조회
POST /api/arrangements                        // 신규 배치표 생성

// src/app/api/arrangements/[id]/route.ts
GET    /api/arrangements/[id]                 // 단일 조회
PATCH  /api/arrangements/[id]                 // 수정
DELETE /api/arrangements/[id]                 // 삭제

// src/app/api/arrangements/[id]/seats/route.ts
GET   /api/arrangements/[id]/seats            // 좌석 목록 조회
PUT   /api/arrangements/[id]/seats            // 좌석 일괄 업데이트
```

#### UI 페이지

- `/arrangements`: 배치표 목록
- `/arrangements/[id]`: 배치표 편집 (드래그 앤 드롭)
- `/arrangements/new`: 신규 배치표 생성

#### 컴포넌트

```
src/components/features/arrangements/
├── ArrangementGrid.tsx         # 자리배치 그리드 (DnD)
├── SeatCell.tsx                # 개별 좌석 셀
├── MemberDraggable.tsx         # 드래그 가능한 찬양대원 카드
├── ArrangementToolbar.tsx      # 툴바 (행/열 조정, 저장 등)
└── ArrangementHistory.tsx      # 배치 히스토리
```

---

### Phase 4: AI 자동 배치 알고리즘 ⏳ 예정

**목표**: Python FastAPI 기반 ML 서비스 구축, 최적 배치 추천

**예상 기간**: 3주

#### 주요 기능

1. **ML 서비스 (Python FastAPI)**

   - 과거 배치 데이터 학습
   - 최적화 알고리즘 (유전 알고리즘 또는 강화학습)
   - RESTful API 제공

2. **추천 로직**

   - 파트별 균형 고려
   - 키 순서 최적화
   - 경력 분산 배치
   - 과거 좋은 배치 패턴 학습

3. **Next.js 연동**
   - AI 추천 버튼
   - 추천 결과 시각화
   - 수동 조정 가능

#### API 예시

```python
# FastAPI (Python)
@app.post("/api/ml/recommend")
async def recommend_arrangement(request: RecommendRequest):
    # 알고리즘 실행
    optimal_seats = optimize_arrangement(
        available_members=request.members,
        grid_size=request.grid_size,
        constraints=request.constraints
    )
    return {"seats": optimal_seats, "score": 0.95}
```

---

### Phase 5: 배치표 이미지 생성 ⏳ 예정

**목표**: Canvas API로 워드 스타일 표 형식 이미지 생성, PDF 변환

**예상 기간**: 1주

#### 주요 기능

1. **Canvas 렌더링**

   - HTML Canvas API 사용
   - 표 형식 디자인 (워드 스타일)
   - 파트별 색상 구분

2. **이미지 다운로드**

   - PNG 내보내기
   - PDF 변환 (jsPDF)

3. **Supabase Storage 업로드**
   - 생성된 이미지를 Storage에 저장
   - Public URL 생성

---

### Phase 6: 카카오톡 연동 ⏳ 예정

**목표**: Kakao OAuth 로그인, 메시지 API로 등단 현황 수집 및 배치표 공유

**예상 기간**: 2주

#### 주요 기능

1. **Kakao OAuth 로그인**

   - Supabase Auth Provider 설정
   - 소셜 로그인 통합

2. **카카오톡 메시지 API**
   - 등단 현황 수집 메시지 발송
   - 배치표 공유 메시지 발송

---

### Phase 7: 배포 및 최적화 ⏳ 예정

**목표**: Vercel 배포, 성능 최적화, SEO 설정

**예상 기간**: 1주

#### 주요 작업

1. **Vercel 배포**

   - 환경 변수 설정
   - CI/CD 파이프라인

2. **성능 최적화**

   - 이미지 최적화
   - 코드 스플리팅
   - React Query 캐싱 최적화

3. **모니터링**
   - Sentry (에러 트래킹)
   - Vercel Analytics

---

## 5. API 설계

### 5.1 API 엔드포인트 전체 목록

#### 인증 (Supabase Auth)

```
POST   /auth/signup              # 회원가입
POST   /auth/login               # 로그인
POST   /auth/logout              # 로그아웃
POST   /auth/forgot-password     # 비밀번호 재설정
```

#### 찬양대원 (Members)

```
GET    /api/members              # 목록 조회 (파트 필터링, 검색)
POST   /api/members              # 신규 등록
GET    /api/members/[id]         # 단일 조회
PATCH  /api/members/[id]         # 수정
DELETE /api/members/[id]         # 삭제

GET    /api/members/[id]/conductor-notes  # 지휘자 메모 조회
PUT    /api/members/[id]/conductor-notes  # 지휘자 메모 저장
DELETE /api/members/[id]/conductor-notes  # 지휘자 메모 삭제
```

#### 출석 (Attendances)

```
GET    /api/attendances?date=YYYY-MM-DD    # 특정 날짜 출석 현황
POST   /api/attendances                    # 출석 기록
PATCH  /api/attendances/[id]               # 수정
DELETE /api/attendances/[id]               # 삭제
POST   /api/attendances/batch              # 일괄 업데이트

GET    /api/attendances/stats?member_id=uuid  # 출석 통계
```

#### 자리배치 (Arrangements & Seats)

```
GET    /api/arrangements                   # 목록 조회
POST   /api/arrangements                   # 신규 배치표 생성
GET    /api/arrangements/[id]              # 단일 조회
PATCH  /api/arrangements/[id]              # 수정 (제목, 정보 등)
DELETE /api/arrangements/[id]              # 삭제

GET    /api/arrangements/[id]/seats        # 좌석 목록 조회
PUT    /api/arrangements/[id]/seats        # 좌석 일괄 업데이트
POST   /api/arrangements/[id]/publish      # 배치표 공개
POST   /api/arrangements/[id]/generate-image  # 이미지 생성
```

#### AI 추천 (Phase 4)

```
POST   /api/ml/recommend                   # AI 배치 추천
```

#### 사용자 관리 (Admin Only)

```
GET    /api/users                          # 사용자 목록
PATCH  /api/users/[id]/role                # 역할 부여/변경
```

### 5.2 인증 및 권한

**인증 방식**: JWT (Supabase Auth)

**권한 레벨**:

```
Public (비인증) < Authenticated < PART_LEADER < MANAGER < CONDUCTOR < ADMIN
```

**엔드포인트별 권한**:

```typescript
// members
GET    /api/members              → Authenticated
POST   /api/members              → PART_LEADER+
PATCH  /api/members/[id]         → PART_LEADER+
DELETE /api/members/[id]         → MANAGER+

// conductor-notes
GET/PUT/DELETE /api/members/[id]/conductor-notes → CONDUCTOR+

// arrangements
GET    /api/arrangements         → Authenticated
POST   /api/arrangements         → CONDUCTOR+
PATCH  /api/arrangements/[id]    → CONDUCTOR+
DELETE /api/arrangements/[id]    → CONDUCTOR+

// users (관리)
GET/PATCH /api/users/*           → ADMIN only
```

---


---

## 7. 보안 및 권한 관리

### 7.1 역할 기반 접근 제어 (RBAC)

**역할 계층**:

```
ADMIN (Level 5)
  └─ 모든 권한
  └─ 사용자 역할 부여/변경
  └─ 시스템 설정

CONDUCTOR (Level 4)
  └─ 자리배치 작성/수정/삭제
  └─ 지휘자 메모 작성/수정/삭제
  └─ 배치표 공개/비공개

MANAGER (Level 3)
  └─ 찬양대원 등록/수정/삭제
  └─ 출석 관리
  └─ 통계 조회

PART_LEADER (Level 2)
  └─ 자신의 파트 찬양대원 수정
  └─ 출석 입력

Authenticated (Level 1)
  └─ 찬양대원 목록 조회
  └─ 자신의 출석 현황 조회
  └─ 공개된 배치표 조회
```

### 7.2 인증 플로우

```
1. 회원가입
   ↓
   Supabase Auth (이메일 인증)
   ↓
   user_profiles 자동 생성 (role = null)
   ↓
   ADMIN이 수동으로 역할 부여
   ↓
   역할에 따라 기능 접근

2. 로그인
   ↓
   Supabase Auth (JWT 발급)
   ↓
   user_profiles에서 역할 조회
   ↓
   클라이언트 상태 저장 (Zustand)
   ↓
   역할에 따라 UI/API 접근 제어
```

### 7.3 데이터 암호화

1. **전송 중 암호화**: HTTPS (TLS 1.3)
2. **저장 시 암호화**:

   - 지휘자 메모: AES-256-GCM (애플리케이션 레벨)
   - Supabase Storage: 기본 암호화 (at-rest)
   - 데이터베이스: Supabase 기본 암호화

3. **비밀번호**: Supabase Auth (bcrypt, 자동 처리)

---

## 8. 성능 최적화 계획

### 8.1 React 19 Compiler 활용

- **자동 메모이제이션**: `useMemo`, `useCallback` 불필요
- **컴포넌트 최적화**: 리렌더링 자동 최소화

### 8.2 이미지 최적화

- **Next.js Image 컴포넌트**: 자동 최적화, 레이지 로딩
- **WebP 변환**: 자동 포맷 변환
- **반응형 이미지**: `srcset` 자동 생성

### 8.3 코드 스플리팅

```typescript
// 동적 import (Route-based)
const MemberList = dynamic(() => import('./MemberList'), {
  loading: () => <Skeleton />,
});

// 조건부 로딩
const ArrangementEditor = dynamic(() => import('./ArrangementEditor'), {
  ssr: false, // 클라이언트에서만 로딩
});
```

### 8.4 React Query 캐싱 전략

```typescript
// Stale Time: 데이터가 "오래된" 것으로 간주되는 시간
// Cache Time: 캐시에 유지되는 시간

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5분
      cacheTime: 1000 * 60 * 30, // 30분
    },
  },
});
```

### 8.5 Supabase Realtime (선택적)

- 출석 현황 실시간 업데이트
- 자리배치 협업 (여러 명이 동시 편집 시)

---

## 9. 테스트 전략

### 9.1 단위 테스트 (Jest + React Testing Library)

**테스트 대상**:

- 유틸리티 함수 (crypto, utils)
- React 컴포넌트 (UI)
- 커스텀 훅 (useMembers, useAttendances)

**예시**:

```typescript
// src/lib/crypto.test.ts
describe('encryptConductorNotes', () => {
  it('should encrypt and decrypt correctly', () => {
    const plainText = '민감한 정보';
    const { encryptedText, iv, authTag } = encryptConductorNotes(plainText);
    const decrypted = decryptConductorNotes(encryptedText, iv, authTag);
    expect(decrypted).toBe(plainText);
  });
});
```

### 9.2 통합 테스트 (Playwright)

**테스트 시나리오**:

- 회원가입 → 로그인 → 찬양대원 등록 → 출석 입력
- 자리배치 생성 → 드래그 앤 드롭 → 저장 → 이미지 생성

### 9.3 E2E 테스트

- 실제 사용자 플로우 전체 테스트
- 브라우저 자동화 (Playwright)

---

## 10. 배포 및 운영 계획

### 10.1 Vercel 배포

**환경 변수 설정**:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJh...
SUPABASE_SERVICE_ROLE_KEY=eyJh...
CONDUCTOR_NOTES_ENCRYPTION_KEY=4891f30b...
```

**배포 전략**:

- `main` 브랜치: 프로덕션 자동 배포
- `develop` 브랜치: 스테이징 환경
- Pull Request: Preview 배포

### 10.2 CI/CD 파이프라인 (GitHub Actions)

```yaml
name: CI/CD

on:
  push:
    branches: [main, develop]
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm ci
      - run: npm run lint
      - run: npm run test

  deploy:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: vercel/action@v2
```

### 10.3 모니터링 및 로깅

- **Sentry**: 에러 트래킹, 성능 모니터링
- **Vercel Analytics**: 페이지 뷰, 성능 메트릭
- **Supabase Logs**: 데이터베이스 쿼리 로그

---

## 11. 현재 진행 상황

### 완료된 Phase

| Phase     | 상태    | 완료일     | 주요 성과                       |
| --------- | ------- | ---------- | ------------------------------- |
| Phase 1   | ✅ 100% | 2025-01-18 | Next.js 16 + Supabase 설정 완료 |
| Phase 1.5 | ✅ 100% | 2025-01-18 | 암호화 메모 시스템 구현         |

### 진행 중인 작업

- 🚧 Phase 2: 인원 관리 기능 (0% → 예정)

### 다음 마일스톤

1. **Phase 2 완료** (예상: 2주 후)

   - Members CRUD API 구현
   - Attendances API 구현
   - 기본 UI 페이지 완성

2. **Phase 3 시작** (예상: 3주 후)
   - 드래그 앤 드롭 자리배치 UI

---

## 12. 리스크 및 대응 방안

### 12.1 기술적 리스크

| 리스크                   | 확률 | 영향도    | 대응 방안                   |
| ------------------------ | ---- | --------- | --------------------------- |
| React DnD 성능 이슈      | 중   | 중        | 가상화 (react-window) 적용  |
| Supabase RLS 복잡도      | 중   | 높음      | 충분한 테스트, 문서화       |
| 암호화 키 분실           | 낮음 | 매우 높음 | 백업 전략, 키 교체 프로세스 |
| ML 모델 학습 데이터 부족 | 높음 | 중        | 규칙 기반 알고리즘 대체     |

### 12.2 일정 리스크

| 리스크               | 확률 | 영향도 | 대응 방안                |
| -------------------- | ---- | ------ | ------------------------ |
| Phase 4 (AI) 지연    | 높음 | 중     | Phase 5-6 먼저 진행 가능 |
| 디자인 요구사항 변경 | 중   | 중     | 컴포넌트 모듈화, 재사용  |

### 12.3 보안 리스크

| 리스크    | 확률 | 영향도    | 대응 방안                       |
| --------- | ---- | --------- | ------------------------------- |
| RLS 우회  | 낮음 | 매우 높음 | 정기적 보안 감사                |
| XSS 공격  | 중   | 높음      | React 자동 이스케이프, CSP 설정 |
| CSRF 공격 | 낮음 | 중        | Supabase Auth CSRF 보호         |

---

## 13. 향후 확장 계획

### 13.1 단기 (6개월 내)

- 📱 **모바일 앱** (React Native or Flutter)
- 🌐 **다국어 지원** (i18n)
- 📊 **고급 통계** (출석 트렌드, 예측)
- 🔔 **알림 시스템** (출석 리마인더, 배치표 공개 알림)

### 13.2 중기 (1년 내)

- 🎼 **악보 관리 기능**
- 📅 **연간 일정 관리**
- 💬 **실시간 채팅** (Supabase Realtime)
- 🎥 **녹음/녹화 관리**

### 13.3 장기 (1년 이후)

- 🏫 **다중 찬양대 지원** (교회 통합 플랫폼)
- 🤝 **교회 관리 시스템 연동** (출석, 헌금 등)
- 🎤 **AI 보이스 분석** (음역대 자동 감지)

---

## 14. 참고 자료

### 14.1 프로젝트 문서

- [README.md](./README.md) - 프로젝트 개요 및 시작 가이드
- [PRD.md](../PRD.md) - 제품 요구사항 문서
- [REQUIREMENTS.md](../REQUIREMENTS.md) - 상세 기술 요구사항
- [API_SPECIFICATION_SUPABASE.md](../API_SPECIFICATION_SUPABASE.md) - Supabase API 명세
- [UXUI_DESIGN_SYSTEM.md](../UXUI_DESIGN_SYSTEM.md) - UI/UX 디자인 시스템
- [task.md](./task.md) - 작업 목록 (Task List)
- [docs/CONDUCTOR_NOTES.md](./docs/CONDUCTOR_NOTES.md) - 지휘자 메모 기능 가이드

### 14.2 기술 문서

**Next.js**:

- [Next.js 16 Documentation](https://nextjs.org/docs)
- [React 19 Documentation](https://react.dev)
- [App Router Guide](https://nextjs.org/docs/app)

**Supabase**:

- [Supabase Documentation](https://supabase.com/docs)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase Auth](https://supabase.com/docs/guides/auth)

**UI Libraries**:

- [Tailwind CSS](https://tailwindcss.com/docs)
- [React DnD](https://react-dnd.github.io/react-dnd)
- [React Query](https://tanstack.com/query/latest/docs/react/overview)

**보안**:

- [Node.js Crypto](https://nodejs.org/api/crypto.html)
- [AES-GCM 알고리즘](https://en.wikipedia.org/wiki/Galois/Counter_Mode)

---

## 부록: 자주 묻는 질문 (FAQ)

### Q1: Supabase 무료 티어 제한은?

**A**:

- 500MB 데이터베이스 스토리지
- 1GB 파일 스토리지
- 2GB 전송량/월
- 무제한 API 요청

찬양대 규모(50-100명)에서는 충분합니다.

### Q2: 암호화 키를 분실하면?

**A**:

- 기존 암호화된 메모는 복호화 불가능
- 새로운 키 생성 후 새 메모 작성 가능
- **권장**: 키를 안전한 곳에 백업 (Bitwarden, 1Password 등)

### Q3: AI 추천이 없으면 사용 불가능한가요?

**A**:

- Phase 4 (AI) 없이도 Phase 2-3로 충분히 사용 가능
- 드래그 앤 드롭으로 수동 배치 가능
- AI는 추가 편의 기능

### Q4: 모바일에서도 사용 가능한가요?

**A**:

- ✅ 반응형 웹 디자인으로 모바일 브라우저에서 사용 가능
- 📱 향후 네이티브 앱 개발 예정 (Phase 8)

---

**최종 업데이트**: 2025-01-18
**문서 버전**: 2.0
**작성자**: Choir Seat Arranger Development Team
