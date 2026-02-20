/**
 * useMounted Hook 테스트
 */
import { renderHook } from '@testing-library/react';

import { useMounted } from '../useMounted';

describe('useMounted', () => {
  it('클라이언트 환경에서 true를 반환해야 함', () => {
    const { result } = renderHook(() => useMounted());
    expect(result.current).toBe(true);
  });

  it('여러 번 rerender해도 안정적으로 true를 반환해야 함', () => {
    const { result, rerender } = renderHook(() => useMounted());

    expect(result.current).toBe(true);
    rerender();
    expect(result.current).toBe(true);
    rerender();
    expect(result.current).toBe(true);
  });

  it('언마운트 후 에러가 발생하지 않아야 함', () => {
    const { unmount } = renderHook(() => useMounted());
    expect(() => unmount()).not.toThrow();
  });
});
