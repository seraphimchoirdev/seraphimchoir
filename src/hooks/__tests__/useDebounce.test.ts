/**
 * useDebounce Hook 테스트
 */
import { act, renderHook } from '@testing-library/react';

import { useDebounce } from '../useDebounce';

describe('useDebounce', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('초기값을 즉시 반환해야 함', () => {
    const { result } = renderHook(() => useDebounce('initial', 300));
    expect(result.current).toBe('initial');
  });

  it('delay 후 업데이트된 값을 반환해야 함', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 300 } }
    );

    // 값 변경
    rerender({ value: 'updated', delay: 300 });

    // delay 전에는 이전 값 유지
    expect(result.current).toBe('initial');

    // delay 후
    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(result.current).toBe('updated');
  });

  it('delay 전에는 이전 값 유지', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 500),
      { initialProps: { value: 'initial' } }
    );

    rerender({ value: 'changed' });

    // 250ms만 진행 (delay 절반)
    act(() => {
      jest.advanceTimersByTime(250);
    });

    // 아직 변경되지 않음
    expect(result.current).toBe('initial');
  });

  it('빠른 연속 변경 시 마지막 값만 반환해야 함', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: 'first' } }
    );

    // 빠른 연속 변경
    rerender({ value: 'second' });
    act(() => {
      jest.advanceTimersByTime(100);
    });

    rerender({ value: 'third' });
    act(() => {
      jest.advanceTimersByTime(100);
    });

    rerender({ value: 'final' });

    // 아직 첫 번째 값
    expect(result.current).toBe('first');

    // 마지막 변경 후 300ms
    act(() => {
      jest.advanceTimersByTime(300);
    });

    // 마지막 값만 반영
    expect(result.current).toBe('final');
  });

  it('커스텀 delay를 적용해야 함', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 1000 } }
    );

    rerender({ value: 'updated', delay: 1000 });

    // 500ms에는 아직 변경 안 됨
    act(() => {
      jest.advanceTimersByTime(500);
    });
    expect(result.current).toBe('initial');

    // 1000ms에 변경됨
    act(() => {
      jest.advanceTimersByTime(500);
    });
    expect(result.current).toBe('updated');
  });
});
