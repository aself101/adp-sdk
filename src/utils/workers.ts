import type { AdpWorkAssignment } from '../types.js';

/**
 * Find the primary work assignment from a list of assignments.
 * Returns the assignment with `primaryIndicator: true`, or the first assignment
 * as a fallback when no primary is designated. Returns `undefined` for empty arrays.
 */
export function findPrimaryWorkAssignment(assignments: AdpWorkAssignment[]): AdpWorkAssignment | undefined {
  if (assignments.length === 0) return undefined;
  return assignments.find(a => a.primaryIndicator) ?? assignments[0];
}
