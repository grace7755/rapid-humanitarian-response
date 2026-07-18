import { os } from "@orpc/server";

import type { Context } from "./context.js";

export const o = os.$context<Context>();
