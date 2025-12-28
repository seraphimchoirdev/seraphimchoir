# Antigravity 에이전트 규칙

1. **언어**: 항상 한국어로 응답합니다. 사용자가 영어로 질문하거나 기술적인 내용이더라도, 명시적으로 요청하지 않는 한 한국어로 설명을 제공합니다. 이는 작업 과정 중에 생성되는 모든 아티팩트( `implementation plan`, `walkthrough` 등)에도 적용됩니다.

2. **톤**: 도움이 되고, 전문적이며, 친근한 어조를 유지합니다.

3. **디자인 시스템 & 컴포넌트**:
    - **엄격한 컴포넌트 사용**: 네이티브 HTML 요소 대신 `@/components/ui`에서 제공하는 UI 컴포넌트를 항상 사용합니다.
        - 버튼: `import { Button } from "@/components/ui/button"`
        - 입력: `import { Input } from "@/components/ui/input"`
        - 선택: `import { Select } from "@/components/ui/select"`
        - 카드: `import { Card, ... } from "@/components/ui/card"`
        - 배지: `import { Badge } from "@/components/ui/badge"`
        - 다이얼로그: `import { Dialog, ... } from "@/components/ui/dialog"`
        - 테이블: `import { Table, ... } from "@/components/ui/table"`
    - **컴포넌트 보호**:
        - **사용자가 명시적으로 요청하지 않는 한** `src/components/ui/`의 기존 디자인 시스템 컴포넌트를 **수정하지 않습니다**.
        - 보호 대상 컴포넌트: `button.tsx`, `input.tsx`, `select.tsx`, `card.tsx`, `badge.tsx`, `dialog.tsx`, `table.tsx`, `avatar.tsx`, `alert.tsx`, `label.tsx`, `textarea.tsx`, `spinner.tsx`, `status-badge.tsx`, `switch.tsx`, `tabs.tsx`, `popover.tsx`, `calendar.tsx` 등.
        - 기능을 추가해야 하는 경우, 기본 컴포넌트를 수정하는 대신 **새로운 래퍼 컴포넌트** 또는 **variant**를 생성합니다.
        - 유일한 예외는 사용자가 특정 컴포넌트의 수정을 명시적으로 요청하는 경우입니다.
    - **스타일링**:
        - 임의의 hex 코드를 사용하지 않습니다. 항상 `globals.css`에 정의된 CSS 변수를 사용합니다 (예: `var(--color-primary-400)`).
        - 타이포그래피는 `heading-1` ~ `heading-4`, `body-large`, `body-base`, `body-small`, `label`, `caption` 클래스를 사용합니다.
    - **새 컴포넌트**: 새로운 UI 컴포넌트를 만들 때는 `UXUI_DESIGN_SYSTEM.md`의 패턴을 따르고 `src/components/ui`에 배치합니다.

4. **문서 참조**:
    - 기능 구현 시, 구현하려는 기능과 관련된 가장 최신의 공식 문서와 베스트 프랙티스를 최우선으로 참고합니다.

5. **진행 상황 업데이트**:
    - 작업이 완료되면 완료된 작업 내용을 요약하여 `Progressed.md` 파일에 업데이트합니다.
    - 또한, `task.md` 파일의 해당 항목을 체크하고 진행 상황을 반영하여 업데이트합니다.

## 프로젝트 개요

AI 기반 추천으로 찬양대원 자리배치를 관리하는 찬양대 자리배치 시스템입니다. 이 시스템은 찬양대원의 출석을 추적하고, 최적의 자리배치를 생성하며, 공유 가능한 자리배치표를 만듭니다.

메인 애플리케이션은 `choir-seat-app/` 디렉토리에 위치하며, Next.js 16과 React 19를 사용합니다.

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

```text
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

**Part Enum**: `SOPRANO`, `ALTO`, `TENOR`, `BASS`,

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

## 배포

Supabase 프로젝트를 생성한 후:

1. Supabase 대시보드에서 프로젝트 생성
2. 프로젝트 URL과 API 키를 환경 변수에 설정
3. 마이그레이션 푸시: `npx supabase db push`
4. Vercel 등에 Next.js 앱 배포
