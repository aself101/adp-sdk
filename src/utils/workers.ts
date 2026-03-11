import type { AdpWorkAssignment } from '../types.js';

/** Find the primary work assignment, falling back to the first one */
export function findPrimaryWorkAssignment(assignments: AdpWorkAssignment[]): AdpWorkAssignment {
  return assignments.find(a => a.primaryIndicator) ?? assignments[0]!;
}
