import { APIError } from "better-auth/api";

export function normalizeOperatorEmail(email: string) {
  return email.trim().toLowerCase();
}

export function isOperatorEmailAllowlisted(
  email: string,
  allowlist: readonly string[],
) {
  return allowlist.includes(normalizeOperatorEmail(email));
}

export function requireAllowlistedOperatorEmail(
  email: unknown,
  allowlist: readonly string[],
) {
  if (
    typeof email !== "string" ||
    !isOperatorEmailAllowlisted(email, allowlist)
  ) {
    throw new APIError("FORBIDDEN", {
      message: "This account is not authorized for operator access.",
    });
  }
}
