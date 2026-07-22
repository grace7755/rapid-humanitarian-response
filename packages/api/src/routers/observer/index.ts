import { evidenceObserverRouter } from "./evidence.js";
import { incidentObserverRouter } from "./incidents.js";
import { matchObserverRouter } from "./matches.js";
import { monitoringObserverRouter } from "./monitoring.js";
import { notificationObserverRouter } from "./notifications.js";
import { organizationObserverRouter } from "./organizations.js";
import { scoreObserverRouter } from "./score.js";
import { verificationObserverRouter } from "./verification.js";

export const observerRouter = {
  evidence: evidenceObserverRouter,
  incident: incidentObserverRouter,
  match: matchObserverRouter,
  monitoring: monitoringObserverRouter,
  notification: notificationObserverRouter,
  organization: organizationObserverRouter,
  score: scoreObserverRouter,
  verification: verificationObserverRouter,
};
