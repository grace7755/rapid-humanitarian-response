import { env } from "@my-better-t-app/env/server";
import { z } from "zod";

import { publicProcedure } from "../../index";

const systemStatusOutputSchema = z
  .object({
    demoMode: z.boolean(),
    service: z.literal("operational"),
  })
  .strict();

export const systemRouter = {
  status: publicProcedure.output(systemStatusOutputSchema).handler(() => ({
    demoMode: env.DEMO_MODE,
    service: "operational",
  })),
};
