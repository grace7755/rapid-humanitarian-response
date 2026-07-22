import { APIError } from "better-auth/api";

export function getEmailFromRequestBody(body: unknown) {
  if (typeof body !== "object" || body === null || !("email" in body)) {
    return undefined;
  }

  return body.email;
}

export function normalizeObserverEmail(email: string) {
  return email.trim().toLowerCase();
}

export function isObserverEmailAllowlisted(
  email: string,
  allowlist: readonly string[],
) {
  return allowlist.includes(normalizeObserverEmail(email));
}

export function requireAllowlistedObserverEmail(
  email: unknown,
  allowlist: readonly string[],
) {
  if (
    typeof email !== "string" ||
    !isObserverEmailAllowlisted(email, allowlist)
  ) {
    throw new APIError("FORBIDDEN", {
      message: "This account is not authorized for observer access.",
    });
  }
}
