import { classifyError } from "../errors.js";

export type SafeLogFields = {
  incidentId?: string;
  modelId?: string;
  procedure?: string;
  requestId?: string;
  status?: number;
  validationResult?: "accepted" | "rejected";
};

export type SafeRequestLogger = {
  set(context: Record<string, unknown>): void;
  setLevel(level: "error" | "warn" | "info" | "debug"): void;
};

export function recordSafeError(
  log: SafeRequestLogger,
  error: unknown,
  fields: SafeLogFields = {},
) {
  log.setLevel("error");
  log.set({
    ...fields,
    error: {
      class: classifyError(error),
    },
  });
}
