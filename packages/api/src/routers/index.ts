import type { RouterClient } from "@orpc/server";

import { operatorRouter } from "./operator";
import { publicRouter } from "./public";

export const appRouter = {
  operator: operatorRouter,
  public: publicRouter,
};
export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
