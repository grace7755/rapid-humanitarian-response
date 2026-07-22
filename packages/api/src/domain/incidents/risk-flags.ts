import { z } from "zod";

import { RISK_FLAG_KEYS } from "./constants.js";

export const riskFlagsSchema = z
  .object(
    Object.fromEntries(
      RISK_FLAG_KEYS.map((key) => [key, z.boolean()]),
    ) as Record<(typeof RISK_FLAG_KEYS)[number], z.ZodBoolean>,
  )
  .strict();
