import { describe, it, expect } from 'vitest';
import { findPrimaryWorkAssignment } from '../../src/utils/workers.js';
import type { AdpWorkAssignment } from '../../src/types.js';

describe('findPrimaryWorkAssignment', () => {
  it('returns the primary assignment', () => {
    const assignments = [
      { primaryIndicator: false, jobTitle: 'Secondary' },
      { primaryIndicator: true, jobTitle: 'Primary' },
    ] as AdpWorkAssignment[];
    expect(findPrimaryWorkAssignment(assignments).jobTitle).toBe('Primary');
  });

  it('falls back to first assignment when no primary', () => {
    const assignments = [
      { primaryIndicator: false, jobTitle: 'First' },
      { primaryIndicator: false, jobTitle: 'Second' },
    ] as AdpWorkAssignment[];
    expect(findPrimaryWorkAssignment(assignments).jobTitle).toBe('First');
  });
});
