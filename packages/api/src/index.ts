import { requireOperator } from "./middleware/operator";
import { o } from "./procedure";

export { o } from "./procedure";

export const publicProcedure = o;

export const operatorProcedure = publicProcedure.use(requireOperator);
export const protectedProcedure = operatorProcedure;
