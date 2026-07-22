import { describe, expect, it, vi } from "vitest";

vi.mock("@my-better-t-app/db/queries/users", () => ({ getUserById: vi.fn() }));
vi.mock("@my-better-t-app/env/server", () => ({
  env: { OBSERVER_EMAIL_ALLOWLIST: ["observer@example.org"] },
}));

import { authorizeObserver } from "./observer";

const allowlist = ["observer@example.org"];
const activeUser = {
  email: "observer@example.org",
  emailVerified: false,
  id: "observer-id",
  name: "Observer",
};

describe("observer authorization", () => {
  it("rejects requests without a session", async () => {
    await expect(
      authorizeObserver(null, allowlist, vi.fn()),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
  it("rejects a non-allowlisted session before querying the user", async () => {
    const findUser = vi.fn();
    await expect(
      authorizeObserver(
        { user: { email: "other@example.org", id: "other-id" } },
        allowlist,
        findUser,
      ),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(findUser).not.toHaveBeenCalled();
  });
  it("rejects a session whose database user no longer exists", async () => {
    await expect(
      authorizeObserver(
        { user: { email: activeUser.email, id: activeUser.id } },
        allowlist,
        vi.fn().mockResolvedValue(null),
      ),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
  it("returns only required fields for an active observer", async () => {
    await expect(
      authorizeObserver(
        { user: { email: "OBSERVER@example.org", id: activeUser.id } },
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
