export function safeErrorCode(error: unknown) {
  if (!(error instanceof Error)) return "UNKNOWN_ERROR";
  if (/^[A-Z][A-Z0-9_]{2,119}$/.test(error.message)) return error.message;
  if (error.name === "ZodError") return "INVALID_AGENT_PAYLOAD";
  if (error.name === "TimeoutError") return "AGENT_TIMEOUT";
  return "AGENT_EXECUTION_FAILED";
}
