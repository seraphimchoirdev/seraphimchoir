# Auth Store 사용 가이드

Zustand를 사용한 전역 인증 상태 관리 시스템입니다.

## 아키텍처

```
src/
├── store/
│   └── authStore.ts           # Zustand Auth Store (상태 + 액션)
├── hooks/
│   └── useAuth.ts             # Auth Hook (기존 인터페이스 유지)
└── components/
    └── providers/
        └── AuthProvider.tsx   # Auth 초기화 Provider
```

## 주요 특징

1. **Zustand Store**: 전역 상태 관리
2. **LocalStorage Persist**: user, profile 자동 저장/복원
3. **DevTools**: Redux DevTools 통합 (개발 환경)
4. **Supabase Auth**: onAuthStateChange 리스너 통합
5. **TypeScript**: 완전한 타입 안전성

## 사용 방법

### 1. 기본 사용 (useAuth 훅)

기존 코드와 호환되는 인터페이스를 제공합니다.

```tsx
'use client';

import { useAuth } from '@/hooks/useAuth';

export function ProfilePage() {
  const { user, profile, isLoading, signOut } = useAuth();

  if (isLoading) {
    return <div>로딩 중...</div>;
  }

  if (!user) {
    return <div>로그인이 필요합니다.</div>;
  }

  return (
    <div>
      <h1>환영합니다, {profile?.name}님!</h1>
      <p>이메일: {profile?.email}</p>
      <p>역할: {profile?.role || '없음'}</p>
      <button onClick={signOut}>로그아웃</button>
    </div>
  );
}
```

### 2. 로그인/회원가입

```tsx
'use client';

import { useState } from 'react';

import { useAuth } from '@/hooks/useAuth';

export function LoginForm() {
  const { signIn, error } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const { error } = await signIn(email, password);

    if (error) {
      alert(error.message);
    } else {
      // 로그인 성공 - 자동으로 리다이렉트됨
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="이메일"
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="비밀번호"
      />
      <button type="submit">로그인</button>
      {error && <p>{error.message}</p>}
    </form>
  );
}
```

### 3. 권한 확인

```tsx
'use client';

import { useAuth } from '@/hooks/useAuth';

export function AdminPanel() {
  const { hasRole } = useAuth();

  if (!hasRole(['ADMIN'])) {
    return <div>관리자 권한이 필요합니다.</div>;
  }

  return <div>관리자 패널</div>;
}
```

### 4. 성능 최적화 (선택적 구독)

특정 상태만 구독하여 불필요한 리렌더링을 방지합니다.

```tsx
'use client';

import { useAuthProfile, useAuthStatus } from '@/hooks/useAuth';

export function UserBadge() {
  // profile만 구독 (user가 변경되어도 리렌더링 안됨)
  const profile = useAuthProfile();

  return <div>{profile?.name}</div>;
}

export function LoginButton() {
  // isAuthenticated만 구독
  const isAuthenticated = useAuthStatus();

  return <button>{isAuthenticated ? '로그아웃' : '로그인'}</button>;
}
```

### 5. Store 직접 사용 (고급)

```tsx
'use client';

import { useAuthStore } from '@/store/authStore';

export function AdvancedComponent() {
  // 상태만 가져오기
  const user = useAuthStore((state) => state.user);
  const profile = useAuthStore((state) => state.profile);

  // 액션만 가져오기
  const signOut = useAuthStore((state) => state.signOut);
  const setError = useAuthStore((state) => state.setError);

  // 여러 상태 동시에 가져오기 (얕은 비교)
  const { user, isLoading } = useAuthStore((state) => ({
    user: state.user,
    isLoading: state.isLoading,
  }));

  return <div>...</div>;
}
```

### 6. 역할 기반 접근 제어

```tsx
'use client';

import { useHasRole, useIsAdmin } from '@/hooks/useAuth';

export function RoleBasedComponent() {
  const isAdmin = useIsAdmin();
  const canEdit = useHasRole(['ADMIN', 'CONDUCTOR', 'MANAGER']);

  return (
    <div>
      {isAdmin && <button>시스템 설정</button>}
      {canEdit && <button>편집</button>}
    </div>
  );
}
```

## API 레퍼런스

### AuthStore 상태

```typescript
interface AuthState {
  user: User | null; // Supabase User 객체
  profile: UserProfile | null; // 사용자 프로필
  isAuthenticated: boolean; // 인증 여부
  isLoading: boolean; // 로딩 상태
  error: Error | null; // 에러 객체
}
```

### AuthStore 액션

```typescript
interface AuthActions {
  signIn(email, password): Promise<{ error: Error | null }>;
  signUp(email, password, name): Promise<{ error: Error | null }>;
  signOut(): Promise<{ error: Error | null }>;
  fetchUser(): Promise<void>;

  setUser(user): void;
  setProfile(profile): void;
  setLoading(loading): void;
  setError(error): void;
  clearError(): void;

  hasRole(roles): boolean;
  isAdmin(): boolean;
}
```

### useAuth 훅

```typescript
interface UseAuthReturn {
  // 상태
  user: User | null;
  profile: UserProfile | null;
  isLoading: boolean;
  error: Error | null;
  isAuthenticated: boolean;

  // 메서드
  signIn(email, password): Promise<{ data: unknown; error: Error | null }>;
  signUp(email, password, name): Promise<{ data: unknown; error: Error | null }>;
  signOut(): Promise<{ error: Error | null }>;
  hasRole(roles): boolean;
}
```

## LocalStorage Persist

다음 상태가 자동으로 localStorage에 저장됩니다:

- `user`: Supabase User 객체
- `profile`: UserProfile 객체

**주의**: `isLoading`, `error`는 persist되지 않습니다.

### 수동 초기화

```typescript
import { useAuthStore } from '@/store/authStore';

// Store 초기화
useAuthStore.persist.clearStorage();
```

## Redux DevTools

개발 환경에서 Redux DevTools로 상태를 모니터링할 수 있습니다.

1. Redux DevTools 확장 설치
2. 브라우저 개발자 도구 열기
3. Redux 탭에서 "AuthStore" 확인

## 마이그레이션 가이드

기존 useState 기반 useAuth에서 Zustand로 마이그레이션:

### Before (useState)

```tsx
const { user, signIn } = useAuth(); // useEffect로 초기화
```

### After (Zustand)

```tsx
const { user, signIn } = useAuth(); // 전역 상태, Provider에서 초기화
```

인터페이스가 동일하므로 코드 변경이 필요 없습니다.

## 트러블슈팅

### 1. "Hydration failed" 에러

**원인**: SSR과 클라이언트 상태 불일치

**해결**: 컴포넌트를 'use client'로 표시

```tsx
'use client';

import { useAuth } from '@/hooks/useAuth';
```

### 2. localStorage 에러 (SSR)

**원인**: 서버 사이드에서 localStorage 접근 불가

**해결**: Zustand persist가 자동으로 처리합니다. 추가 작업 불필요.

### 3. Auth 상태가 업데이트되지 않음

**원인**: AuthProvider가 누락되었을 수 있음

**해결**: `src/lib/providers.tsx`에 AuthProvider가 있는지 확인

```tsx
// src/lib/providers.tsx
<QueryClientProvider client={queryClient}>
  <AuthProvider>{children}</AuthProvider>
</QueryClientProvider>
```

## 성능 최적화 팁

1. **선택적 구독**: 필요한 상태만 구독

   ```tsx
   const profile = useAuthProfile(); // user 변경시 리렌더링 안됨
   ```

2. **얕은 비교**: 여러 상태를 객체로 반환할 때

   ```tsx
   const { user, profile } = useAuthStore(
     (state) => ({ user: state.user, profile: state.profile }),
     shallow
   );
   ```

3. **액션 메모이제이션**: 불필요 (Zustand가 자동 처리)

## 테스트

```typescript
import { act, renderHook } from '@testing-library/react';

import { useAuthStore } from '@/store/authStore';

describe('AuthStore', () => {
  beforeEach(() => {
    // Store 초기화
    useAuthStore.setState({
      user: null,
      profile: null,
      isLoading: false,
      error: null,
    });
  });

  it('should sign in', async () => {
    const { result } = renderHook(() => useAuthStore());

    await act(async () => {
      await result.current.signIn('test@example.com', 'password');
    });

    expect(result.current.user).toBeTruthy();
  });
});
```

## 추가 리소스

- [Zustand 공식 문서](https://docs.pmnd.rs/zustand/getting-started/introduction)
- [Supabase Auth 문서](https://supabase.com/docs/guides/auth)
- [React Query 문서](https://tanstack.com/query/latest)
