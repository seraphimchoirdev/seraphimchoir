import '@testing-library/jest-dom';

// ─── 1. Supabase 클라이언트 전역 모킹 ───────────────────────────────
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(),
}));

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
  createAdminClient: jest.fn(),
}));

// ─── 2. Logger 전역 모킹 (콘솔 노이즈 방지) ─────────────────────────
const mockLoggerFn = () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  child: jest.fn().mockReturnThis(),
});

jest.mock('@/lib/logger', () => ({
  createLogger: jest.fn(mockLoggerFn),
  logger: mockLoggerFn(),
}));

// ─── 3. 환경 변수 설정 ──────────────────────────────────────────────
process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';

// ─── 4. localStorage 모킹 ──────────────────────────────────────────
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] ?? null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: jest.fn((index: number) => Object.keys(store)[index] ?? null),
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// ─── 5. Browser API 모킹 ───────────────────────────────────────────
Object.defineProperty(URL, 'createObjectURL', {
  value: jest.fn(() => 'blob:mock-url'),
});
Object.defineProperty(URL, 'revokeObjectURL', { value: jest.fn() });

// ─── 6. 테스트 간 격리 ─────────────────────────────────────────────
beforeEach(() => {
  localStorageMock.clear();
  jest.clearAllMocks();
});
