import { reportRouter } from "./report";
import { systemRouter } from "./system";

export const publicRouter = {
  report: reportRouter,
  system: systemRouter,
};
