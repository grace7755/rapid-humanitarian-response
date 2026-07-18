import { reportRouter } from "./report.js";
import { systemRouter } from "./system.js";

export const publicRouter = {
  report: reportRouter,
  system: systemRouter,
};
