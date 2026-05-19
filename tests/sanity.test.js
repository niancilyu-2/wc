// ABOUTME: Sanity check that the Vitest harness is wired up correctly.
// ABOUTME: Real tests for scoring and bracket logic live alongside their modules.

import { describe, it, expect } from 'vitest';

describe('vitest harness', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2);
  });
});
