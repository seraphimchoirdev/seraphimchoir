# Authentication API 구현 가이드

## 개요

Next.js 16 App Router와 Supabase Auth를 사용한 인증 시스템이 구현되었습니다.

## 구현된 기능

### 1. API Routes (Server-side)

다음 5개의 인증 API 엔드포인트가 구현되었습니다:

#### `/api/auth/signup` - 회원가입
- **Method**: POST
- **기능**: 새로운 사용자 계정 생성
- **입력**: email, password, name
- **검증**: 이메일 형식, 비밀번호 길이(6자 이상), 이름 길이(2자 이상)
- **자동 처리**: user_profiles 테이블에 프로필 자동 생성 (DB 트리거)

#### `/api/auth/login` - 로그인
- **Method**: POST
- **기능**: 이메일/비밀번호 인증
- **입력**: email, password
- **반환**: user, session, profile 정보

#### `/api/auth/logout` - 로그아웃
- **Method**: POST
- **기능**: 현재 세션 종료
- **인증**: 로그인 상태 필요

#### `/api/auth/me` - 현재 사용자 조회
- **Method**: GET
- **기능**: 로그인한 사용자의 정보 조회
- **인증**: 로그인 상태 필요
- **반환**: user 및 profile 정보

#### `/api/auth/roles` - 역할 변경
- **Method**: PATCH
- **기능**: 사용자 역할 변경
- **권한**: ADMIN만 가능
- **입력**: userId, role
- **제약**: 자기 자신의 역할은 변경 불가
- **역할 종류**: ADMIN, CONDUCTOR, MANAGER, PART_LEADER

### 2. 파일 구조

```
src/app/api/auth/
├── signup/
│   └── route.ts          # 회원가입 API
├── login/
│   └── route.ts          # 로그인 API
├── logout/
│   └── route.ts          # 로그아웃 API
├── me/
│   └── route.ts          # 현재 사용자 조회 API
├── roles/
│   └── route.ts          # 역할 변경 API
├── types.ts              # TypeScript 타입 정의
├── utils.ts              # 유틸리티 함수
├── test-api.http         # API 테스트 파일
└── README.md             # API 문서

src/lib/
└── auth-api.ts           # 클라이언트 헬퍼 함수
```

### 3. 주요 기능

#### 입력 검증
- 이메일 형식 검증 (RFC 5322 표준)
- 비밀번호 강도 검증 (최소 6자, 최대 72자)
- 역할 유효성 검증

#### 보안
- Row Level Security (RLS) 활성화
- ADMIN 권한 확인
- Service Role Key 사용 (역할 변경 시)
- 자기 역할 변경 방지
- 적절한 HTTP 상태 코드 사용

#### 에러 처리
- 한국어 에러 메시지
- 상세한 에러 로깅
- 일관된 에러 응답 형식

## 사용 방법

### 1. 클라이언트 측 사용 (React Component)

```typescript
import { signupWithApi, loginWithApi, logoutWithApi } from '@/lib/auth-api';

// 회원가입
const handleSignup = async () => {
  const { data, error } = await signupWithApi(
    'user@example.com',
    'password123',
    '홍길동'
  );

  if (error) {
    alert(error);
  } else {
    console.log('회원가입 성공:', data);
    // 로그인 페이지로 이동 또는 자동 로그인
  }
};

// 로그인
const handleLogin = async () => {
  const { data, error } = await loginWithApi(
    'user@example.com',
    'password123'
  );

  if (error) {
    alert(error);
  } else {
    console.log('로그인 성공:', data?.profile);
    // 홈 페이지로 이동
  }
};

// 로그아웃
const handleLogout = async () => {
  const { error } = await logoutWithApi();
  if (!error) {
    // 로그인 페이지로 이동
  }
};
```

### 2. 기존 useAuth 훅 업데이트

현재 `src/hooks/useAuth.ts`는 클라이언트 측 Supabase Auth를 직접 사용합니다.
선택적으로 API Routes를 사용하도록 변경할 수 있습니다:

```typescript
// 기존 방식 (클라이언트 -> Supabase)
const { signIn, signUp, signOut } = useAuth();

// API Routes 방식 (클라이언트 -> Next.js API -> Supabase)
import { loginWithApi, signupWithApi, logoutWithApi } from '@/lib/auth-api';
```

두 방식 모두 사용 가능하며, 프로젝트 요구사항에 따라 선택하세요.

### 3. 서버 컴포넌트에서 사용

```typescript
import { getCurrentUser, getCurrentUserProfile } from '@/app/api/auth/utils';

export default async function ProtectedPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  const profile = await getCurrentUserProfile();

  return (
    <div>
      <h1>안녕하세요, {profile?.name}님</h1>
      <p>역할: {profile?.role}</p>
    </div>
  );
}
```

### 4. 역할 기반 권한 확인

```typescript
import { hasRole, isAdmin } from '@/app/api/auth/utils';

// 서버 컴포넌트 또는 API Route
const isAdminUser = await isAdmin();

if (!isAdminUser) {
  return NextResponse.json(
    { error: 'ADMIN 권한이 필요합니다.' },
    { status: 403 }
  );
}
```

## API 테스트

### VS Code REST Client 사용

1. VS Code에 "REST Client" 확장 설치
2. `src/app/api/auth/test-api.http` 파일 열기
3. 각 요청 위에 "Send Request" 링크 클릭

### cURL 사용

```bash
# 회원가입
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123456","name":"테스트"}'

# 로그인
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123456"}' \
  -c cookies.txt

# 현재 사용자 조회 (쿠키 사용)
curl http://localhost:3000/api/auth/me -b cookies.txt

# 로그아웃
curl -X POST http://localhost:3000/api/auth/logout -b cookies.txt
```

## 역할 및 권한

### 역할 종류

| 역할 | 설명 | 권한 |
|-----|------|-----|
| ADMIN | 관리자 | 모든 권한 |
| CONDUCTOR | 지휘자 | 자리배치 관리, 찬양대원 관리 |
| MANAGER | 매니저 | 찬양대원 관리 |
| PART_LEADER | 파트 리더 | 파트별 출석 관리 |

### 권한 매트릭스

```typescript
const RolePermissions = {
  ADMIN: [
    'manage_users',
    'manage_roles',
    'manage_members',
    'manage_arrangements',
    'view_conductor_notes',
  ],
  CONDUCTOR: [
    'manage_members',
    'manage_arrangements',
    'view_conductor_notes',
  ],
  MANAGER: [
    'manage_members',
    'view_arrangements',
  ],
  PART_LEADER: [
    'manage_part_attendance',
    'view_arrangements',
  ],
};
```

## 데이터베이스 스키마

### user_profiles 테이블

```sql
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT,  -- ADMIN, CONDUCTOR, MANAGER, PART_LEADER
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### RLS 정책

모든 테이블에 Row Level Security가 활성화되어 있습니다:

```sql
-- 인증된 사용자만 자신의 프로필 조회 가능
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = id);

-- ADMIN만 역할 변경 가능 (Service Role Key 사용)
```

## 다음 단계

1. **미들웨어 개선**: `/middleware.ts`에서 역할 기반 페이지 접근 제어 추가
2. **이메일 인증**: Supabase Email Confirmation 활성화
3. **비밀번호 재설정**: 비밀번호 찾기 기능 추가
4. **OAuth 연동**: Kakao OAuth 추가 (Phase 6)
5. **API Rate Limiting**: 무차별 대입 공격 방지

## 트러블슈팅

### 로그인 후 세션이 유지되지 않음

- `middleware.ts`에서 Supabase 쿠키를 올바르게 처리하고 있는지 확인
- `createClient()` 함수가 쿠키를 읽고 쓸 수 있는지 확인

### ADMIN 권한 부여 방법

초기 ADMIN을 생성하려면 Supabase Studio에서 직접 설정:

```sql
UPDATE user_profiles
SET role = 'ADMIN'
WHERE email = 'admin@example.com';
```

### 프로필이 자동 생성되지 않음

데이터베이스 트리거가 제대로 설정되어 있는지 확인:

```sql
-- supabase/migrations/에 트리거 생성 스크립트 확인
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();
```

## 참고 자료

- [Next.js App Router 문서](https://nextjs.org/docs/app)
- [Supabase Auth 문서](https://supabase.com/docs/guides/auth)
- [Supabase SSR 가이드](https://supabase.com/docs/guides/auth/server-side/nextjs)
- [프로젝트 CLAUDE.md](/Users/munseunghyeon/workspace/choir-seat/CLAUDE.md)
