/**
 * React Query 테스트 래퍼
 *
 * Hook 테스트에서 QueryClientProvider를 감싸는 공용 래퍼입니다.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';

/**
 * 테스트용 QueryClient를 생성합니다.
 * retry=false로 설정하여 테스트에서 불필요한 재시도를 방지합니다.
 */
export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

/**
 * renderHook의 wrapper 옵션에 전달할 React 컴포넌트를 생성합니다.
 *
 * @example
 * const { result } = renderHook(() => useMembers(), {
 *   wrapper: createTestQueryWrapper(),
 * });
 */
export function createTestQueryWrapper() {
  const queryClient = createTestQueryClient();

  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'TestQueryWrapper';
  return Wrapper;
}
