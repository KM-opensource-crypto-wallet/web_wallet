/** @jest-environment jsdom */
import React from 'react';
import {act, render, screen} from '@testing-library/react';
import {LoadingStatus} from './ChatParts';

jest.mock('next/link', () => ({__esModule: true, default: () => null}));

const t = key => key;

describe('LoadingStatus', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  test('starts with the searching text, then escalates', () => {
    const {rerender} = render(<LoadingStatus t={t} veryLong={false} />);
    expect(screen.getByRole('status').textContent).toBe('searching');
    act(() => jest.advanceTimersByTime(4000));
    expect(screen.getByRole('status').textContent).toBe('searchingMore');
    rerender(<LoadingStatus t={t} veryLong />);
    expect(screen.getByRole('status').textContent).toBe('stillWorking');
  });
});
