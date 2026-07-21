import { contactRouter } from "./contact.js";
import { evidenceRouter } from "./evidence.js";
import { incidentRouter } from "./incidents.js";
import { matchRouter } from "./match.js";
import { monitoringRouter } from "./monitoring.js";
import { organizationsRouter } from "./organizations.js";
import { scoreRouter } from "./score.js";

export const operatorRouter = {
  contact: contactRouter,
  evidence: evidenceRouter,
  incident: incidentRouter,
  match: matchRouter,
  monitoring: monitoringRouter,
  organization: organizationsRouter,
  score: scoreRouter,
};
