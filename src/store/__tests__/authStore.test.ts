/**
 * authStore 유닛 테스트
 *
 * signIn / signUp / signOut / fetchUser / 권한 메서드를 검증합니다.
 * jest.setup.ts에서 @/lib/supabase/client.createClient가 전역 mock됩니다.
 */
import { createClient } from '@/lib/supabase/client';

import { useAuthStore } from '../authStore';

// ─── 헬퍼 ──────────────────────────────────────────────────────────

/** store를 초기 상태로 리셋 */
function resetStore() {
  useAuthStore.setState({
    user: null,
    profile: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
    hasHydrated: false,
  });
}

/** Supabase 클라이언트 mock을 구성하는 헬퍼 */
function setupMockClient(overrides: {
  signInWithPassword?: jest.Mock;
  signUp?: jest.Mock;
  signOut?: jest.Mock;
  getUser?: jest.Mock;
  fromSelect?: unknown;
  fromError?: { message: string; code: string } | null;
} = {}) {
  const mockClient = {
    auth: {
      signInWithPassword: overrides.signInWithPassword ?? jest.fn(),
      signUp: overrides.signUp ?? jest.fn(),
      signOut: overrides.signOut ?? jest.fn().mockResolvedValue({ error: null }),
      signInWithOAuth: jest.fn(),
      getUser: overrides.getUser ?? jest.fn().mockResolvedValue({
        data: { user: null },
        error: null,
      }),
    },
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          maybeSingle: jest.fn().mockResolvedValue({
            data: overrides.fromSelect ?? null,
            error: overrides.fromError ?? null,
          }),
        }),
      }),
    }),
  };

  (createClient as jest.Mock).mockReturnValue(mockClient);
  return mockClient;
}

// ─── 테스트 ────────────────────────────────────────────────────────

describe('authStore - 초기 상태', () => {
  beforeEach(() => resetStore());

  it('초기 상태 확인 (user=null, isAuthenticated=false)', () => {
    const state = useAuthStore.getState();

    expect(state.user).toBeNull();
    expect(state.profile).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(state.error).toBeNull();
  });
});

describe('authStore - signIn', () => {
  beforeEach(() => resetStore());

  it('로그인 성공 시 user 설정, isAuthenticated=true', async () => {
    const mockUser = { id: 'user-1', email: 'test@test.com' };

    setupMockClient({
      signInWithPassword: jest.fn().mockResolvedValue({
        data: { user: mockUser },
        error: null,
      }),
    });

    const result = await useAuthStore.getState().signIn('test@test.com', 'password123');

    expect(result.error).toBeNull();
    const state = useAuthStore.getState();
    expect(state.user).toEqual(mockUser);
    expect(state.isAuthenticated).toBe(true);
    expect(state.isLoading).toBe(false);
  });

  it('잘못된 자격증명 시 한글 에러 메시지 반환', async () => {
    setupMockClient({
      signInWithPassword: jest.fn().mockResolvedValue({
        data: { user: null },
        error: new Error('Invalid login credentials'),
      }),
    });

    const result = await useAuthStore.getState().signIn('wrong@test.com', 'wrong');

    expect(result.error).not.toBeNull();
    expect(result.error!.message).toBe('이메일 또는 비밀번호가 올바르지 않습니다.');
    expect(useAuthStore.getState().isLoading).toBe(false);
  });

  it('네트워크 에러(catch) 시 에러 설정', async () => {
    setupMockClient({
      signInWithPassword: jest.fn().mockRejectedValue(new Error('Network error')),
    });

    const result = await useAuthStore.getState().signIn('test@test.com', 'pass');

    expect(result.error).not.toBeNull();
    expect(result.error!.message).toBe('Network error');
    expect(useAuthStore.getState().isLoading).toBe(false);
  });
});

describe('authStore - signUp', () => {
  beforeEach(() => resetStore());

  it('회원가입 성공', async () => {
    setupMockClient({
      signUp: jest.fn().mockResolvedValue({ error: null }),
    });

    const result = await useAuthStore.getState().signUp('new@test.com', 'password123', '홍길동');

    expect(result.error).toBeNull();
    expect(useAuthStore.getState().isLoading).toBe(false);
  });

  it('이미 등록된 이메일 시 한글 에러 반환', async () => {
    setupMockClient({
      signUp: jest.fn().mockResolvedValue({
        error: new Error('User already registered'),
      }),
    });

    const result = await useAuthStore.getState().signUp('dup@test.com', 'pass123', '김철수');

    expect(result.error).not.toBeNull();
    expect(result.error!.message).toBe('이미 등록된 이메일입니다.');
  });

  it('짧은 비밀번호 시 한글 에러', async () => {
    setupMockClient({
      signUp: jest.fn().mockResolvedValue({
        error: new Error('Password should be at least 6 characters'),
      }),
    });

    const result = await useAuthStore.getState().signUp('test@test.com', '12', '테스트');

    expect(result.error!.message).toBe('비밀번호는 최소 6자 이상이어야 합니다.');
  });
});

describe('authStore - signOut', () => {
  beforeEach(() => resetStore());

  it('로그아웃 성공 시 상태 초기화', async () => {
    // 먼저 로그인된 상태 설정
    useAuthStore.setState({
      user: { id: 'user-1' } as never,
      profile: { id: 'user-1', email: 'test@test.com', name: '테스트', role: 'ADMIN', linked_member_id: null, link_status: null },
      isAuthenticated: true,
    });

    setupMockClient({
      signOut: jest.fn().mockResolvedValue({ error: null }),
    });

    const result = await useAuthStore.getState().signOut();

    expect(result.error).toBeNull();
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.profile).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(state.isLoading).toBe(false);
  });
});

describe('authStore - fetchUser', () => {
  beforeEach(() => resetStore());

  it('인증된 유저 + 프로필 조회 성공', async () => {
    const mockUser = { id: 'user-1', email: 'test@test.com' };
    const mockProfile = {
      id: 'user-1',
      email: 'test@test.com',
      name: '홍길동',
      role: 'ADMIN',
      linked_member_id: 'member-1',
      link_status: 'approved',
      linked_member: { name: '홍길동', part: 'SOPRANO' },
    };

    setupMockClient({
      getUser: jest.fn().mockResolvedValue({
        data: { user: mockUser },
        error: null,
      }),
      fromSelect: mockProfile,
    });

    await useAuthStore.getState().fetchUser();

    const state = useAuthStore.getState();
    expect(state.user).toEqual(mockUser);
    expect(state.isAuthenticated).toBe(true);
    expect(state.profile).toEqual({
      id: 'user-1',
      email: 'test@test.com',
      name: '홍길동',
      role: 'ADMIN',
      linked_member_id: 'member-1',
      link_status: 'approved',
      linked_member: { name: '홍길동', part: 'SOPRANO' },
    });
    expect(state.isLoading).toBe(false);
  });

  it('인증 안 된 경우 상태 초기화', async () => {
    setupMockClient({
      getUser: jest.fn().mockResolvedValue({
        data: { user: null },
        error: null,
      }),
    });

    await useAuthStore.getState().fetchUser();

    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(state.isLoading).toBe(false);
  });
});

describe('authStore - 권한 메서드', () => {
  beforeEach(() => resetStore());

  it('hasRole(["ADMIN"]) - profile.role=ADMIN → true', () => {
    useAuthStore.setState({
      profile: { id: 'p1', email: 'a@b.com', name: 'A', role: 'ADMIN', linked_member_id: null, link_status: null },
    });

    expect(useAuthStore.getState().hasRole(['ADMIN'])).toBe(true);
    expect(useAuthStore.getState().hasRole(['MEMBER'])).toBe(false);
  });

  it('isAdmin() - role=ADMIN → true, role=MEMBER → false', () => {
    useAuthStore.setState({
      profile: { id: 'p1', email: 'a@b.com', name: 'A', role: 'ADMIN', linked_member_id: null, link_status: null },
    });
    expect(useAuthStore.getState().isAdmin()).toBe(true);

    useAuthStore.setState({
      profile: { id: 'p1', email: 'a@b.com', name: 'A', role: 'MEMBER', linked_member_id: null, link_status: null },
    });
    expect(useAuthStore.getState().isAdmin()).toBe(false);
  });

  it('isMemberLinked() - linked_member_id 존재 + approved → true', () => {
    useAuthStore.setState({
      profile: { id: 'p1', email: 'a@b.com', name: 'A', role: 'MEMBER', linked_member_id: 'm1', link_status: 'approved' },
    });
    expect(useAuthStore.getState().isMemberLinked()).toBe(true);

    useAuthStore.setState({
      profile: { id: 'p1', email: 'a@b.com', name: 'A', role: 'MEMBER', linked_member_id: null, link_status: null },
    });
    expect(useAuthStore.getState().isMemberLinked()).toBe(false);
  });

  it('isLinkPending() - link_status=pending → true', () => {
    useAuthStore.setState({
      profile: { id: 'p1', email: 'a@b.com', name: 'A', role: 'MEMBER', linked_member_id: 'm1', link_status: 'pending' },
    });
    expect(useAuthStore.getState().isLinkPending()).toBe(true);

    useAuthStore.setState({
      profile: { id: 'p1', email: 'a@b.com', name: 'A', role: 'MEMBER', linked_member_id: 'm1', link_status: 'approved' },
    });
    expect(useAuthStore.getState().isLinkPending()).toBe(false);
  });
});
