import { createRawIncident } from "@my-better-t-app/db/queries/incidents";
import { env } from "@my-better-t-app/env/server";

import {
  publicReportInputSchema,
  publicReportOutputSchema,
} from "../../domain/reports/schema";
import { publicProcedure } from "../../index";
import { createPublicReport } from "../../services/reports";
import { verifyTurnstileToken } from "../../services/turnstile";

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
