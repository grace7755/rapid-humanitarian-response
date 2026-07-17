import type { NewOrganization } from "../schema";

export const DEMO_ORGANIZATIONS = [
  {
    id: "5d218f2e-ceb8-4c63-b442-385b32328f0a",
    name: "Harbor Lantern Response Collective (Demo)",
    website: "https://harbor-lantern.example",
    contactEmail: "response@harbor-lantern.example",
    country: "Bangladesh",
    areasServed: ["Bangladesh", "Chattogram", "Cox's Bazar"],
    sectors: [
      "emergency_response",
      "shelter",
      "food_assistance",
      "water_sanitation_hygiene",
      "health",
    ],
    organizationType: "local_ngo",
    reviewStatus: "reviewed",
    reviewSources: ["https://sources.example/demo-registry-record"],
    lastReviewedAt: new Date("2026-01-01T00:00:00.000Z"),
    isDemo: true,
  },
] satisfies NewOrganization[];
