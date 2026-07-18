import { createRawIncident } from "@my-better-t-app/db/queries/incidents";
import { env } from "@my-better-t-app/env/server";

import {
  publicReportInputSchema,
  publicReportOutputSchema,
} from "../../domain/reports/schema.js";
import { publicProcedure } from "../../index.js";
import { createPublicReport } from "../../services/reports.js";
import { verifyTurnstileToken } from "../../services/turnstile.js";

export const reportRouter = {
  create: publicProcedure
    .input(publicReportInputSchema)
    .output(publicReportOutputSchema)
    .handler(({ input }) =>
      createPublicReport(input, {
        persistRawReport: createRawIncident,
        verifyToken: (token) =>
          verifyTurnstileToken({
            secret: env.TURNSTILE_SECRET_KEY ?? "",
            token,
          }),
      }),
    ),
};
