/** @jest-environment jsdom */
import {act, renderHook} from '@testing-library/react';
import {useLauncherAttention} from './useLauncherAttention';

describe('useLauncherAttention', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    window.sessionStorage.clear();
  });
  afterEach(() => jest.useRealTimers());

  test('shows the teaser once after the first delay, then hides it', () => {
    const {result} = renderHook(() => useLauncherAttention(true));
    expect(result.current.teaser).toBe(false);
    act(() => jest.advanceTimersByTime(10000));
    expect(result.current.teaser).toBe(true);
    act(() => jest.advanceTimersByTime(10000));
    expect(result.current.teaser).toBe(false);
  });

  test('does not show the teaser twice in one session', () => {
    const first = renderHook(() => useLauncherAttention(true));
    act(() => jest.advanceTimersByTime(10000));
    first.unmount();
    const second = renderHook(() => useLauncherAttention(true));
    act(() => jest.advanceTimersByTime(10000));
    expect(second.result.current.teaser).toBe(false);
  });

  test('stays quiet when inactive and clears when it turns inactive', () => {
    const {result, rerender} = renderHook(
      ({active}) => useLauncherAttention(active),
      {initialProps: {active: false}},
    );
    act(() => jest.advanceTimersByTime(60000));
    expect(result.current.teaser).toBe(false);
    rerender({active: true});
    act(() => jest.advanceTimersByTime(10000));
    expect(result.current.teaser).toBe(true);
    rerender({active: false});
    expect(result.current.teaser).toBe(false);
  });

  test('leaves no timers running once the teaser is done', () => {
    renderHook(() => useLauncherAttention(true));
    act(() => jest.advanceTimersByTime(20000));
    expect(jest.getTimerCount()).toBe(0);
  });
});
