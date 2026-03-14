/**
 * API Route 통합 테스트용 헬퍼
 *
 * Next.js 16 App Router의 동적 params 형식과
 * Supabase 인증/테이블별 분기 모킹을 제공합니다.
 */
import { NextRequest } from 'next/server';

import { createMockQueryBuilder, type MockSupabaseOverrides } from '@/__mocks__/supabase-helpers';
import { createClient } from '@/lib/supabase/server';

// ─── (A) Next.js 16 App Router 동적 params 형식 ─────────────────────
/**
 * Next.js 16 App Router에서 `{ params: Promise<{ id: string }> }` 형식으로
 * 동적 라우트 파라미터를 전달합니다.
 */
export function createRouteContext<T extends Record<string, string>>(params: T): {
  params: Promise<T>;
} {
  return { params: Promise.resolve(params) };
}

// ─── (B) 인증된 Supabase 클라이언트 설정 ────────────────────────────

interface AuthenticatedSupabaseConfig {
  /** 인증 사용자 (기본: test-user-id / test@test.com) */
  user?: { id: string; email: string };
  /** user_profiles에서 반환할 role (기본: 'ADMIN') */
  role?: string;
  /** 테이블별 query builder overrides */
  tables?: Record<string, MockSupabaseOverrides>;
}

/**
 * 인증된 Supabase 클라이언트를 설정합니다.
 *
 * `from()` 호출 시 테이블명에 따라 다른 query builder를 반환하며,
 * `user_profiles` 테이블은 config.role에서 자동 생성합니다.
 */
export function setupAuthenticatedSupabase(config: AuthenticatedSupabaseConfig = {}) {
  const {
    user = { id: 'test-user-id', email: 'test@test.com' },
    role = 'ADMIN',
    tables = {},
  } = config;

  // user_profiles 테이블은 role 자동 생성 (명시적 override가 없을 때)
  if (!tables['user_profiles']) {
    tables['user_profiles'] = {
      selectData: { role },
    };
  }

  // 테이블별 query builder 매핑
  const builderMap: Record<string, ReturnType<typeof createMockQueryBuilder>> = {};
  for (const [tableName, overrides] of Object.entries(tables)) {
    builderMap[tableName] = createMockQueryBuilder(overrides);
  }

  // 기본 fallback builder (설정되지 않은 테이블)
  const defaultBuilder = createMockQueryBuilder();

  const mockClient = {
    from: jest.fn().mockImplementation((tableName: string) => {
      return builderMap[tableName] || defaultBuilder;
    }),
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user },
        error: null,
      }),
      getSession: jest.fn().mockResolvedValue({
        data: { session: { access_token: 'test-token' } },
        error: null,
      }),
    },
    rpc: jest.fn().mockResolvedValue({ data: null, error: null }),
    storage: {
      from: jest.fn().mockReturnValue({
        upload: jest.fn().mockResolvedValue({ data: { path: 'test/path' }, error: null }),
        getPublicUrl: jest.fn().mockReturnValue({ data: { publicUrl: 'https://test.com/file' } }),
        remove: jest.fn().mockResolvedValue({ data: null, error: null }),
      }),
    },
  };

  (createClient as jest.Mock).mockResolvedValue(mockClient);

  return mockClient;
}

// ─── (C) 미인증 클라이언트 설정 ─────────────────────────────────────

/**
 * 미인증(user=null) Supabase 클라이언트를 설정합니다.
 */
export function setupUnauthenticatedSupabase() {
  const mockClient = {
    from: jest.fn().mockReturnValue(createMockQueryBuilder()),
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      }),
      getSession: jest.fn().mockResolvedValue({
        data: { session: null },
        error: null,
      }),
    },
    rpc: jest.fn().mockResolvedValue({ data: null, error: null }),
  };

  (createClient as jest.Mock).mockResolvedValue(mockClient);

  return mockClient;
}

// ─── (D) NextRequest 생성 헬퍼 ──────────────────────────────────────

/**
 * 테스트용 NextRequest를 생성합니다.
 * NextRequest를 직접 사용해야 `nextUrl.searchParams` 등에 접근 가능합니다.
 */
export function createTestRequest(
  url: string,
  options?: RequestInit
): NextRequest {
  const fullUrl = url.startsWith('http') ? url : `http://localhost:3000${url}`;
  return new NextRequest(fullUrl, options);
}
