import type { IncidentNeed, OrganizationSector } from "../incidents/types.js";

const NEED_TO_SECTORS = {
  food: ["food_assistance", "nutrition"],
  information: ["information_management", "community_communication"],
  medical: ["health", "emergency_medical_support"],
  other: [],
  protection: ["protection"],
  rescue: ["search_and_rescue", "emergency_response"],
  sanitation: ["water_sanitation_hygiene"],
  shelter: ["shelter", "camp_management"],
  transport: ["logistics", "emergency_transport"],
  water: ["water_sanitation_hygiene"],
} as const satisfies Record<IncidentNeed, readonly OrganizationSector[]>;

export function sectorsForNeeds(
  needs: readonly IncidentNeed[],
): OrganizationSector[] {
  return [...new Set(needs.flatMap((need) => NEED_TO_SECTORS[need]))];
}
