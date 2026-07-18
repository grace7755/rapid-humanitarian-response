import type { RouterClient } from "@orpc/server";

import { operatorRouter } from "./operator/index.js";
import { publicRouter } from "./public/index.js";

export const appRouter = {
  operator: operatorRouter,
  public: publicRouter,
};
export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
