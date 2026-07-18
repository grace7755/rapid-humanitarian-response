import { requireOperator } from "./middleware/operator.js";
import { o } from "./procedure.js";

export { o } from "./procedure.js";

export const publicProcedure = o;

export const operatorProcedure = publicProcedure.use(requireOperator);
export const protectedProcedure = operatorProcedure;
