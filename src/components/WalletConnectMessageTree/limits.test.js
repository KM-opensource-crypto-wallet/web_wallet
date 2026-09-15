import {limitEntries, MESSAGE_TREE_LIMITS} from './index';

describe('limitEntries', () => {
  it('passes small collections through untouched', () => {
    const entries = [
      ['a', 1],
      ['b', 2],
    ];
    expect(limitEntries(entries)).toEqual({shown: entries, hiddenCount: 0});
  });

  it('caps at maxEntries and reports how many were dropped', () => {
    const entries = Array.from({length: 250}, (_, i) => [`k${i}`, i]);
    const {shown, hiddenCount} = limitEntries(entries);
    expect(shown).toHaveLength(MESSAGE_TREE_LIMITS.maxEntries);
    expect(hiddenCount).toBe(250 - MESSAGE_TREE_LIMITS.maxEntries);
    expect(shown[0]).toEqual(['k0', 0]);
  });

  it('honours an explicit cap and tolerates a missing input', () => {
    expect(
      limitEntries(
        [
          [1, 1],
          [2, 2],
          [3, 3],
        ],
        2,
      ).hiddenCount,
    ).toBe(1);
    expect(limitEntries(undefined)).toEqual({shown: [], hiddenCount: 0});
  });

  it('keeps the depth limit small enough to bound recursion', () => {
    expect(MESSAGE_TREE_LIMITS.maxDepth).toBeGreaterThan(0);
    expect(MESSAGE_TREE_LIMITS.maxDepth).toBeLessThanOrEqual(16);
  });
});
