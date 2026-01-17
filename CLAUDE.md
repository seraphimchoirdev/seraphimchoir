# CLAUDE.md

이 파일은 이 저장소에서 작업할 때 Claude Code (claude.ai/code)에게 가이드를 제공합니다.

## 장기 실행 에이전트 원칙

### 컨텍스트 관리

- 긴 작업은 단계별로 분할하여 처리
- 각 단계 완료 시 중간 결과를 명시적으로 저장
- 컨텍스트 윈도우 한계 도달 전 작업 상태 요약

### 에이전트 구조

- **Initializer Agent**: 작업 시작 시 컨텍스트 설정 담당
- **Coding Agent**: 실제 코딩 작업 수행
- 작업 간 핸드오프 시 필수 정보 명확히 전달

### 작업 규칙

- 복잡한 작업은 작은 단위로 분리
- 각 작업 완료 후 진행 상황 보고
- 오류 발생 시 즉시 중단하고 상태 보고

## 프로젝트 개요

**새로핌ON (SeraphimON)** - 새문안교회 새로핌찬양대를 위한 종합 플랫폼입니다.

### 주요 기능
- **일정 관리**: 예배 일정 및 찬양대 행사 일정 확인
- **출석 관리**: 예배 등단 여부, 행사 참석 여부 투표
- **자리배치**: AI 기반 좌석 배치 추천 및 드래그 앤 드롭 편집
- **음악 연습** (예정): 파트별 연습용 음원 스트리밍, 음량 조절
- **커뮤니티** (예정): 글/사진 공유, 소통 공간

메인 애플리케이션은 프로젝트 루트에 위치하며, Next.js 16과 React 19를 사용합니다.

## 테스트 계정

개발 및 테스트용 관리자 계정:
- **이메일**: `admin@test.com`
- **비밀번호**: `admin3586`
- **역할**: ADMIN

## 개발 명령어

모든 명령어는 `choir-seat-app/` 디렉토리에서 실행해야 합니다:

```bash
# 개발 서버 (http://localhost:3000 에서 실행)
npm run dev

# 프로덕션 빌드
npm run build

# 프로덕션 서버 시작
npm start

# 린팅
npm run lint
```

## Supabase 명령어

```bash
# Supabase CLI 로그인 (최초 1회)
npx supabase login

# 로컬 Supabase 시작 (Docker 필요)
npx supabase start

# 로컬 Supabase 중지
npx supabase stop

# 새 마이그레이션 생성
npx supabase migration new <migration_name>

# 마이그레이션 실행 (로컬)
npx supabase db reset

# 원격 Supabase 프로젝트와 연결
npx supabase link --project-ref <project-id>

# 로컬 변경사항을 원격에 푸시
npx supabase db push

# TypeScript 타입 생성
npx supabase gen types typescript --local > src/types/database.types.ts

# Supabase Studio 열기 (데이터베이스 GUI)
# 로컬: http://localhost:54323
# 원격: https://app.supabase.com/project/<project-id>
```

## 아키텍처

### 기술 스택

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4
- **State Management**: 클라이언트 상태는 Zustand, 서버 상태는 React Query
- **Backend & Database**: Supabase (PostgreSQL + Auth + Storage + Realtime + Edge Functions)
- **UI Libraries**: 드래그 앤 드롭은 React DnD, 아이콘은 Lucide React

### 주요 아키텍처 결정사항

1. **Supabase Client 사용**: 데이터베이스 작업에 Supabase Client를 사용합니다. 클라이언트와 서버에서 각각 다른 클라이언트를 사용해야 합니다:

   ```typescript
   // 클라이언트 컴포넌트
   import { createClient } from '@/lib/supabase/client';

   // 서버 컴포넌트 및 API Routes
   import { createClient } from '@/lib/supabase/server';

   // Admin 작업 (서버 전용, RLS 우회)
   import { createAdminClient } from '@/lib/supabase/server';
   ```

2. **Path Alias**: `@/` alias는 `src/`로 매핑되며, `tsconfig.json`에서 설정됩니다

3. **React Compiler**: 이 프로젝트는 React 19 컴파일러를 사용합니다 (`next.config.ts`에서 활성화). 컴포넌트 렌더링을 자동으로 최적화합니다

4. **Supabase Auth**: Supabase의 내장 인증 시스템을 사용합니다. NextAuth 대신 `@supabase/ssr`을 사용하여 쿠키 기반 인증을 처리합니다

5. **Row Level Security (RLS)**: 모든 테이블에 RLS가 활성화되어 있으며, 인증된 사용자만 데이터에 접근할 수 있습니다

6. **Supabase Storage**: 이미지 저장에 AWS S3 대신 Supabase Storage를 사용합니다

### 프로젝트 구조

```
choir-seat-app/
├── src/
│   ├── app/                    # Next.js App Router 페이지 및 API 라우트
│   ├── components/
│   │   ├── ui/                # 기본 UI 컴포넌트 (버튼, 입력 등)
│   │   ├── layout/            # 레이아웃 컴포넌트 (헤더, 푸터, 네비게이션)
│   │   └── features/          # 기능별 컴포넌트
│   │       ├── members/       # 찬양대원 관리 UI
│   │       ├── arrangements/  # 자리배치 UI
│   │       └── seats/         # 좌석 그리드 및 드래그 앤 드롭 UI
│   ├── lib/
│   │   ├── supabase/          # Supabase 클라이언트 설정
│   │   │   ├── client.ts      # 클라이언트 컴포넌트용
│   │   │   ├── server.ts      # 서버 컴포넌트/API Routes용
│   │   │   └── middleware.ts  # Next.js 미들웨어용
│   │   ├── providers.tsx      # React Query 프로바이더 설정
│   │   └── utils.ts           # 공통 유틸리티
│   ├── hooks/                  # 커스텀 React 훅
│   ├── store/                  # Zustand 스토어
│   └── types/
│       └── database.types.ts   # Supabase 데이터베이스 타입 정의
├── supabase/
│   ├── config.toml             # Supabase 프로젝트 설정
│   ├── migrations/             # SQL 마이그레이션 파일
│   └── seed.sql                # 시드 데이터 (선택적)
└── middleware.ts               # Next.js 미들웨어 (Auth 처리)
```

## 데이터베이스 스키마

핵심 데이터 모델 (Snake case 네이밍):

- **members**: 찬양대원 프로필 (이름, 파트, 키, 경력 등)
- **attendances**: 주간 출석 추적 (member와 날짜에 연결됨)
- **arrangements**: 특정 예배 날짜의 자리배치
- **seats**: 개별 좌석 할당 (arrangement와 member에 연결됨)
- **user_profiles**: 사용자 프로필 (Supabase Auth의 auth.users와 연동)

**Part Enum**: `SOPRANO`, `ALTO`, `TENOR`, `BASS`, `SPECIAL`

### 주요 관계

- 각 `arrangements`는 여러 개의 `seats` 레코드를 가집니다
- 각 `seats`는 `members`와 `arrangements` 모두를 참조합니다
- `attendances`는 각 예배 날짜에 어떤 찬양대원이 참석 가능한지 추적합니다
- Cascade 삭제가 활성화되어 있습니다: arrangement를 삭제하면 해당 seats들이 삭제되고, member를 삭제하면 해당 attendances와 seats들이 삭제됩니다
- `user_profiles`는 `auth.users`와 1:1 관계이며, 신규 사용자 생성 시 자동으로 프로필이 생성됩니다

### Row Level Security (RLS) 정책

- 모든 테이블에 RLS가 활성화되어 있습니다
- 인증된 사용자만 데이터를 읽고 쓸 수 있습니다
- 사용자는 자신의 프로필만 수정할 수 있습니다
- Admin 작업은 Service Role Key를 사용하여 RLS를 우회할 수 있습니다

## 중요한 구현 참고사항

1. **환경 변수**: `.env` 파일에는 다음이 포함되어야 합니다:
   - `NEXT_PUBLIC_SUPABASE_URL`: Supabase 프로젝트 URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: 공개 anon key
   - `SUPABASE_SERVICE_ROLE_KEY`: 서버 전용 service role key (주의: 클라이언트에 노출 금지!)

   `.env.example`을 템플릿으로 사용하세요.

2. **기능 개발 단계** (README 참고):
   - Phase 1: 프로젝트 초기화 (완료)
   - Phase 2-7: 인원 관리, 자리배치 UI, AI 알고리즘, 이미지 생성, 카카오톡 연동, 배포 (진행 예정)

3. **Supabase 기능 활용**:
   - **Auth**: 이메일/비밀번호 (기본), Kakao OAuth (Phase 6)
   - **역할 관리**: ADMIN, CONDUCTOR, MANAGER, PART_LEADER (ADMIN이 부여)
   - **Storage**: 배치표 이미지 저장용
   - **Realtime**: 실시간 출석 현황 업데이트 (선택적)
   - **Edge Functions**: 복잡한 비즈니스 로직 처리 (선택적)

4. **향후 ML 서비스**: AI 기반 좌석 추천을 위한 Python FastAPI 서비스가 계획되어 있지만 아직 구현되지 않았습니다

5. **TypeScript 타입**: `src/types/database.types.ts`에는 Supabase 데이터베이스 스키마에서 자동 생성된 타입이 포함되어 있습니다. 스키마 변경 시 `npx supabase gen types`로 재생성하세요.

6. **한국어**: 이 프로젝트는 한국어 프로젝트입니다. UI 텍스트, 주석, 문서가 한국어로 작성될 수 있습니다

## Supabase 로컬 개발

Supabase CLI를 사용하여 로컬에서 개발할 수 있습니다 (Docker 필요):

```bash
# 최초 설정
npx supabase init
npx supabase start

# 환경 변수를 .env.local에 복사 (npx supabase start 출력에서 확인)
# API URL: http://localhost:54321
# Anon key: eyJh... (콘솔 출력에서 확인)
# Service Role key: eyJh... (콘솔 출력에서 확인)

# 마이그레이션 적용
npx supabase db reset

# Studio 열기
# http://localhost:54323
```

## Supabase 개발 전략 (솔로 개발자용)

### 권장 워크플로우: 로컬 전용 개발 (월 $0)

솔로 개발자에게 Supabase 브랜칭은 오버킬입니다. 로컬 Supabase로 충분합니다.

```
로컬 Supabase (Docker) ──테스트 완료──▶ 프로덕션 Supabase (원격)
    npx supabase start                      npx supabase db push
    npx supabase db reset
```

### 마이그레이션 워크플로우

```bash
# 1. 마이그레이션 생성
npx supabase migration new add_new_feature

# 2. 로컬에서 검증 (무한 반복 가능)
npx supabase db reset   # 마이그레이션 + seed 적용, 문제시 수정

# 3. 프로덕션 배포 (검증 완료 후)
npx supabase db push    # 원격에 마이그레이션 적용
```

### Seed 데이터

`supabase/seed.sql`에 테스트 데이터가 정의되어 있습니다:
- 로컬 `db reset` 시 자동 적용
- 다음/지난 주일 출석 데이터 자동 생성

### 브랜칭 (필요시에만)

브랜칭이 필요한 경우:
- 대규모 데이터 마이그레이션 테스트
- 외부 리뷰어와 협업

비용: 브랜치당 ~$0.01344/시간 (사용 후 즉시 삭제 권장)

## 배포

Supabase 프로젝트를 생성한 후:

1. Supabase 대시보드에서 프로젝트 생성
2. 프로젝트 URL과 API 키를 환경 변수에 설정
3. 마이그레이션 푸시: `npx supabase db push`
4. Vercel 등에 Next.js 앱 배포

## Git 워크플로우

### 브랜치 전략 (GitFlow)

이 프로젝트는 GitFlow 전략을 따릅니다:

#### 주요 브랜치
- **main**: 프로덕션 배포용 안정 브랜치
- **develop**: 개발 통합 브랜치 (기본 작업 브랜치)

#### 보조 브랜치
- **feature/***: 새 기능 개발 (`develop`에서 분기, `develop`으로 머지)
- **fix/***: 버그 수정 (`develop`에서 분기)
- **refactor/***: 리팩토링 (`develop`에서 분기)
- **release/***: 릴리스 준비 (`develop` → `main` + `develop`)
- **hotfix/***: 긴급 프로덕션 수정 (`main` → `main` + `develop`)

### 브랜치 명명 규칙

```
feature/<설명>          # 예: feature/kakao-login
feature/<이슈번호>-<설명>  # 예: feature/42-attendance-export
fix/<설명>              # 예: fix/hydration-mismatch
release/v<버전>         # 예: release/v0.2.0
hotfix/v<버전>          # 예: hotfix/v0.2.1
```

### 커밋 메시지 컨벤션

Conventional Commits 형식을 따릅니다:

```
<type>(<scope>): <subject>

[body]

[footer]
```

#### 타입
- **feat**: 새 기능 추가
- **fix**: 버그 수정
- **refactor**: 코드 리팩토링 (기능 변경 없음)
- **chore**: 빌드, 설정, 의존성 변경
- **docs**: 문서 수정
- **test**: 테스트 추가/수정
- **style**: 코드 포맷팅, 세미콜론 누락 등

#### 예시

```bash
feat(auth): Kakao OAuth 로그인 구현
fix(arrangements): hydration mismatch 버그 수정
refactor(store): Zustand 스토어 타입 개선
chore: .gitignore 업데이트
```

### 버전 관리

Semantic Versioning (SemVer)을 따릅니다: `MAJOR.MINOR.PATCH`
- **MAJOR**: 호환되지 않는 API 변경
- **MINOR**: 하위 호환 기능 추가
- **PATCH**: 하위 호환 버그 수정

현재 버전: `0.x.x` (1.0 정식 릴리스 전)

### 일반적인 워크플로우

#### 기능 개발

```bash
# 1. develop에서 feature 브랜치 생성
git checkout develop
git pull origin develop
git checkout -b feature/new-feature

# 2. 작업 및 커밋
git add .
git commit -m "feat(scope): 기능 설명"

# 3. develop에 머지 및 푸시
git checkout develop
git merge feature/new-feature
git push origin develop

# 4. feature 브랜치 정리
git branch -d feature/new-feature
```

> **참고**: 작은 수정은 feature 브랜치 없이 develop에서 직접 작업해도 됩니다.

#### 릴리스

```bash
# 1. release 브랜치 생성
git checkout develop
git checkout -b release/v0.2.0

# 2. 버전 업데이트, 최종 테스트, 버그 수정
# 3. main과 develop에 머지
git checkout main
git merge release/v0.2.0
git tag v0.2.0
git push origin main --tags

git checkout develop
git merge release/v0.2.0
git push origin develop

# 4. release 브랜치 삭제
git branch -d release/v0.2.0
```

#### 핫픽스 (긴급 수정)

```bash
# 1. main에서 hotfix 브랜치 생성
git checkout main
git checkout -b hotfix/v0.2.1

# 2. 수정 및 커밋
git commit -m "fix(critical): 긴급 버그 수정"

# 3. main과 develop 모두에 머지
git checkout main
git merge hotfix/v0.2.1
git tag v0.2.1
git push origin main --tags

git checkout develop
git merge hotfix/v0.2.1
git push origin develop
```
