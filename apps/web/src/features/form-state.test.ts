import { describe, expect, it } from "vitest";

import {
  clearConsumedTurnstileToken,
  getNextTurnstileResetKey,
} from "./reports/form-state";

describe("report form retry state", () => {
  it("clears only the consumed Turnstile token", () => {
    const values = {
      description: "Flooding reported near the central market.",
      needs: ["water", "shelter"],
      turnstileToken: "single-use-token",
    };

    expect(clearConsumedTurnstileToken(values)).toEqual({
      description: values.description,
      needs: values.needs,
      turnstileToken: "",
    });
    expect(values.turnstileToken).toBe("single-use-token");
  });

  it("advances the widget reset key", () => {
    expect(getNextTurnstileResetKey(3)).toBe(4);
  });
});
