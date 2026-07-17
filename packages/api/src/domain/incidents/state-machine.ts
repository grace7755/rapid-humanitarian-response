import type { CaseState } from "./types";

const ALLOWED_TRANSITIONS = {
  closed: [],
  contact_attempted: ["closed", "reviewing"],
  corroborated: ["outreach_ready", "reviewing"],
  outreach_ready: ["contact_attempted", "reviewing"],
  rejected: [],
  reviewing: ["corroborated", "rejected"],
  submitted: ["reviewing"],
} as const satisfies Record<CaseState, readonly CaseState[]>;

export function getAllowedTransitions(state: CaseState): readonly CaseState[] {
  return ALLOWED_TRANSITIONS[state];
}

export function canTransitionIncident(
  fromState: CaseState,
  toState: CaseState,
) {
  return getAllowedTransitions(fromState).some((state) => state === toState);
}
