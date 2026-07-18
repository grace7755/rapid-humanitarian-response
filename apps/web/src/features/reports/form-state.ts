export function clearConsumedTurnstileToken<
  Values extends { turnstileToken: string },
>(values: Values): Values {
  return { ...values, turnstileToken: "" };
}

export function getNextTurnstileResetKey(current: number) {
  return current + 1;
}
