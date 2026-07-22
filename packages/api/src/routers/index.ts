import type { RouterClient } from "@orpc/server";

import { observerRouter } from "./observer/index.js";
import { publicRouter } from "./public/index.js";

export const appRouter = {
  observer: observerRouter,
  public: publicRouter,
};
export type AppRouterClient = RouterClient<typeof appRouter>;
