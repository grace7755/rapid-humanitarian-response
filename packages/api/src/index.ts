import { requireObserver } from "./middleware/observer.js";
import { o } from "./procedure.js";

export const publicProcedure = o;

export const observerProcedure = publicProcedure.use(requireObserver);
