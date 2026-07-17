import { describe, expect, it, vi } from "vitest";

vi.mock("@my-better-t-app/db/queries/users", () => ({
  getUserById: vi.fn(),
}));
vi.mock("@my-better-t-app/env/server", () => ({
  env: { OPERATOR_EMAIL_ALLOWLIST: ["operator@example.org"] },
}));

import { authorizeOperator } from "./operator";

const allowlist = ["operator@example.org"];
const activeUser = {
  email: "operator@example.org",
  emailVerified: false,
  id: "operator-id",
  name: "Operator",
};

describe("operator authorization", () => {
  it("rejects requests without a session", async () => {
    await expect(
      authorizeOperator(null, allowlist, vi.fn()),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("rejects a non-allowlisted session before querying the user", async () => {
    const findUser = vi.fn();

    await expect(
      authorizeOperator(
        { user: { email: "other@example.org", id: "other-id" } },
        allowlist,
        findUser,
      ),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(findUser).not.toHaveBeenCalled();
  });

  it("rejects a session whose database user no longer exists", async () => {
    await expect(
      authorizeOperator(
        { user: { email: "operator@example.org", id: "operator-id" } },
        allowlist,
        vi.fn().mockResolvedValue(null),
      ),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("returns only the required actor fields for an active operator", async () => {
    await expect(
      authorizeOperator(
        { user: { email: "OPERATOR@example.org", id: "operator-id" } },
        allowlist,
        vi.fn().mockResolvedValue(activeUser),
      ),
    ).resolves.toEqual({
      email: activeUser.email,
      id: activeUser.id,
      name: activeUser.name,
    });
  });
});
