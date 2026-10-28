import { describe, it, expect, vi, beforeEach } from "vitest";

const insertReturning = vi.fn();
const updateReturning = vi.fn();
const updateCalled = vi.fn();

vi.mock("@/lib/db", () => ({
  db: {
    insert: () => ({
      values: () => ({
        onConflictDoUpdate: () => ({ returning: insertReturning }),
      }),
    }),
    update: () => {
      updateCalled();
      return { set: () => ({ where: () => ({ returning: updateReturning }) }) };
    },
  },
}));

import { upsertAppUser, canAdoptExistingRow } from "./upsert-user";

const uniqueViolation = Object.assign(new Error("duplicate key"), {
  cause: { code: "23505" },
});

const googleUser = {
  id: "new-auth-id",
  email: "Dee@Example.com",
  email_confirmed_at: "2026-01-01T00:00:00Z",
  app_metadata: { provider: "google", providers: ["google"] },
  identities: [{ provider: "google" }],
  user_metadata: { full_name: "Dee" },
};

beforeEach(() => {
  insertReturning.mockReset();
  updateReturning.mockReset();
  updateCalled.mockReset();
});

describe("canAdoptExistingRow", () => {
  it("allows a verified Google identity", () => {
    expect(canAdoptExistingRow(googleUser)).toBe(true);
  });

  it("refuses when the email is not confirmed", () => {
    expect(canAdoptExistingRow({ ...googleUser, email_confirmed_at: null })).toBe(false);
    expect(canAdoptExistingRow({ ...googleUser, email_confirmed_at: undefined })).toBe(false);
  });

  it("refuses email/password and anonymous providers", () => {
    expect(
      canAdoptExistingRow({
        ...googleUser,
        app_metadata: { provider: "email" },
        identities: [{ provider: "email" }],
      })
    ).toBe(false);
    expect(
      canAdoptExistingRow({ ...googleUser, app_metadata: {}, identities: [], is_anonymous: true })
    ).toBe(false);
  });

  it("refuses when the provider claims google but no google identity exists", () => {
    expect(
      canAdoptExistingRow({ ...googleUser, identities: [{ provider: "email" }] })
    ).toBe(false);
  });

  it("refuses anonymous users even with google metadata", () => {
    expect(canAdoptExistingRow({ ...googleUser, is_anonymous: true })).toBe(false);
  });
});

describe("upsertAppUser", () => {
  it("returns the upserted row on the normal path", async () => {
    insertReturning.mockResolvedValue([{ id: "u1" }]);
    expect(await upsertAppUser(googleUser)).toEqual({ id: "u1" });
    expect(updateCalled).not.toHaveBeenCalled();
  });

  it("adopts an existing row on email collision for a verified Google user", async () => {
    insertReturning.mockRejectedValue(uniqueViolation);
    updateReturning.mockResolvedValue([{ id: "u1", authId: "new-auth-id" }]);
    expect(await upsertAppUser(googleUser)).toEqual({ id: "u1", authId: "new-auth-id" });
    expect(updateCalled).toHaveBeenCalledOnce();
  });

  it("refuses to adopt for an unverified email", async () => {
    insertReturning.mockRejectedValue(uniqueViolation);
    expect(await upsertAppUser({ ...googleUser, email_confirmed_at: null })).toBeNull();
    expect(updateCalled).not.toHaveBeenCalled();
  });

  it("refuses to adopt for a non-Google provider", async () => {
    insertReturning.mockRejectedValue(uniqueViolation);
    expect(
      await upsertAppUser({
        ...googleUser,
        app_metadata: { provider: "email" },
        identities: [{ provider: "email" }],
      })
    ).toBeNull();
    expect(updateCalled).not.toHaveBeenCalled();
  });

  it("rethrows errors that aren't unique violations", async () => {
    insertReturning.mockRejectedValue(new Error("connection reset"));
    await expect(upsertAppUser(googleUser)).rejects.toThrow("connection reset");
    expect(updateCalled).not.toHaveBeenCalled();
  });

  it("refuses an auth user with no email", async () => {
    expect(await upsertAppUser({ ...googleUser, email: null })).toBeNull();
  });
});
