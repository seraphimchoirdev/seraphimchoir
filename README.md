# 새로핌ON (SeraphimON)

새문안교회 새로핌찬양대를 위한 종합 플랫폼입니다.

## 주요 기능

### 현재 구현됨
- **일정 관리**: 예배 일정 및 찬양대 행사 일정 확인
- **출석 관리**: 예배 등단 여부, 행사 참석 여부 투표
- **자리배치**: AI 기반 좌석 배치 추천 및 드래그 앤 드롭 편집
- **찬양대원 관리**: 프로필 등록 및 관리
- **지휘자 전용 메모**: AES-256-GCM 암호화로 보호되는 CONDUCTOR 전용 메모 기능

### 개발 예정
- **음악 연습**: 파트별 연습용 음원 스트리밍 (OMR 기반, 저작권 준수)
- **커뮤니티**: 글/사진 공유, 소통 공간
- **카카오톡 연동**: 등단 현황 수집 및 배치표 공유 자동화

## 기술 스택

- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS
- **Backend & Database**: Supabase (PostgreSQL + Auth + Storage + Realtime)
- **Security**: AES-256-GCM Encryption (Node.js crypto)
- **State Management**: Zustand, React Query
- **Drag & Drop**: React DnD
- **ML Service**: Python FastAPI (별도 구현 예정)

## 시작하기

### 사전 요구사항

- Node.js 18.0 이상
- Supabase 계정 및 프로젝트
- npm 또는 yarn
- Docker (로컬 Supabase 사용 시)

### 설치

1. 저장소 클론 및 의존성 설치

```bash
git clone <repository-url>
cd choir-seat-app
npm install
```

2. 환경 변수 설정

```bash
cp .env.example .env
```

`.env` 파일을 열고 Supabase 프로젝트 정보를 입력합니다:

```env
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# 지휘자 메모 암호화 키 (64자리 16진수)
CONDUCTOR_NOTES_ENCRYPTION_KEY="your-64-character-hex-key"
```

**암호화 키 생성 방법**:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Supabase 프로젝트 생성 방법**:
1. [Supabase](https://supabase.com)에 가입 및 로그인
2. "New Project" 클릭하여 프로젝트 생성
3. Project Settings > API에서 URL과 API Keys 확인

3. 데이터베이스 마이그레이션

**옵션 A: 로컬 Supabase 사용 (Docker 필요)**

```bash
npx supabase init
npx supabase start
npx supabase db reset
```

**옵션 B: 원격 Supabase 사용**

```bash
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

4. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 확인합니다.

## 프로젝트 구조

```
src/
├── app/                  # Next.js App Router 페이지
│   ├── layout.tsx
│   └── page.tsx
├── components/           # 재사용 가능한 컴포넌트
│   ├── ui/              # 기본 UI 컴포넌트
│   ├── layout/          # 레이아웃 컴포넌트
│   └── features/        # 기능별 컴포넌트
│       ├── members/
│       ├── arrangements/
│       └── seats/
├── lib/                 # 유틸리티 함수
│   ├── prisma.ts        # Prisma 클라이언트
│   ├── providers.tsx    # React Query Provider
│   └── utils.ts         # 공통 유틸리티
├── types/               # TypeScript 타입 정의
├── hooks/               # 커스텀 React 훅
└── store/               # Zustand 상태 관리

prisma/
├── schema.prisma        # 데이터베이스 스키마
└── migrations/          # 마이그레이션 파일
```

## 데이터베이스 스키마

- **members**: 찬양대원 정보
- **attendances**: 주간 등단 여부
- **arrangements**: 자리배치표
- **seats**: 개별 좌석 정보
- **user_profiles**: 사용자 프로필 (Supabase Auth와 연동)

**Row Level Security (RLS)**: 모든 테이블에 RLS가 활성화되어 인증된 사용자만 접근 가능합니다.

## 개발 로드맵

- [x] Phase 1: 프로젝트 초기화 및 기본 구조
- [x] Phase 1.5: 지휘자 전용 메모 기능 (암호화)
- [x] Phase 2: 인원 관리 기능
- [x] Phase 3: 자리배치 UI 구현
- [ ] Phase 4: AI 자동 배치 알고리즘
- [ ] Phase 5: 배치표 이미지 생성
- [ ] Phase 6: 카카오톡 연동
- [ ] Phase 7: 배포 및 최적화

## 주요 기능 상세

### 지휘자 전용 메모

CONDUCTOR 권한을 가진 사용자만 접근할 수 있는 암호화된 메모 시스템입니다.

**보안 특징**:
- AES-256-GCM 암호화 알고리즘 사용
- 서버 측 환경 변수로 암호화 키 관리
- ADMIN도 데이터베이스에서 평문을 확인할 수 없음
- 데이터 무결성 검증 (변조 감지)

**사용 방법**:
```tsx
import { ConductorNotes } from '@/components/features/members';

<ConductorNotes
  memberId={member.id}
  memberName={member.name}
  userRole={profile?.role}
/>
```

**API 엔드포인트**:
- `GET /api/members/[id]/conductor-notes` - 메모 조회
- `PUT /api/members/[id]/conductor-notes` - 메모 저장
- `DELETE /api/members/[id]/conductor-notes` - 메모 삭제

**테스트**:
```bash
# 암호화 기능 테스트
npx tsx scripts/test-crypto.ts
```

자세한 내용은 [docs/CONDUCTOR_NOTES.md](./docs/CONDUCTOR_NOTES.md)를 참고하세요.

## 라이선스

MIT License
