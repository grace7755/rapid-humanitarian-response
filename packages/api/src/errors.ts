import { ORPCError } from "@orpc/server";

export type SafeErrorClass =
  | "authentication"
  | "authorization"
  | "conflict"
  | "not_found"
  | "rate_limit"
  | "validation"
  | "internal";

export function classifyError(error: unknown): SafeErrorClass {
  if (!(error instanceof ORPCError)) return "internal";

  switch (error.code) {
    case "UNAUTHORIZED":
      return "authentication";
    case "FORBIDDEN":
      return "authorization";
    case "CONFLICT":
      return "conflict";
    case "NOT_FOUND":
      return "not_found";
    case "RATE_LIMITED":
      return "rate_limit";
    case "BAD_REQUEST":
    case "INPUT_VALIDATION_FAILED":
    case "OUTPUT_VALIDATION_FAILED":
      return "validation";
    default:
      return "internal";
  }
}

export function publicErrorBody(requestId: string) {
  return {
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "The request could not be completed.",
      requestId,
    },
  } as const;
}
