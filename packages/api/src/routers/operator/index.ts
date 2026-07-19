import { evidenceRouter } from "./evidence.js";
import { incidentRouter } from "./incidents.js";
import { matchRouter } from "./match.js";
import { organizationsRouter } from "./organizations.js";
import { scoreRouter } from "./score.js";

export const operatorRouter = {
  evidence: evidenceRouter,
  incident: incidentRouter,
  match: matchRouter,
  organization: organizationsRouter,
  score: scoreRouter,
};
