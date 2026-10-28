import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const getUser = vi.fn();
const selectWhere = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser } }),
}));

vi.mock("@/lib/db", () => ({
  db: { select: () => ({ from: () => ({ where: selectWhere }) }) },
}));

import { getAppUser, getAuthContext } from "./get-app-user";

const prev = process.env.ALLOWED_EMAILS;

beforeEach(() => {
  getUser.mockReset();
  selectWhere.mockReset();
  selectWhere.mockResolvedValue([{ id: "u1", email: "dee@example.com" }]);
});

afterEach(() => {
  if (prev === undefined) delete process.env.ALLOWED_EMAILS;
  else process.env.ALLOWED_EMAILS = prev;
});

function signedInAs(email: string) {
  getUser.mockResolvedValue({ data: { user: { id: "auth-1", email } } });
}

describe("getAppUser allow-list enforcement", () => {
  it("returns the app user when ALLOWED_EMAILS is unset", async () => {
    delete process.env.ALLOWED_EMAILS;
    signedInAs("anyone@example.com");
    expect(await getAppUser()).toEqual({ id: "u1", email: "dee@example.com" });
  });

  it("returns the app user for an allow-listed email", async () => {
    process.env.ALLOWED_EMAILS = "dee@example.com";
    signedInAs("Dee@example.com");
    expect(await getAppUser()).not.toBeNull();
  });

  it("returns null for a session whose email isn't allow-listed", async () => {
    process.env.ALLOWED_EMAILS = "dee@example.com";
    signedInAs("eve@example.com");
    expect(await getAppUser()).toBeNull();
    expect(await getAuthContext()).toBeNull();
    expect(selectWhere).not.toHaveBeenCalled();
  });

  it("returns null when not signed in", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    expect(await getAppUser()).toBeNull();
  });
});
