import { describe, it, expect } from "vitest";
import {
  DAILY_INVITE_CAP,
  isOverDailyInviteCap,
  inviteMatchesAuthUser,
  safeDisplayName,
  buildInviteEmail,
  summarizePendingInvites,
  planLeave,
} from "./rules";

describe("inviteMatchesAuthUser", () => {
  const verified = { email: "Amy@Example.com", email_confirmed_at: "2026-01-01T00:00:00Z" };

  it("matches the verified email case-insensitively", () => {
    expect(inviteMatchesAuthUser(verified, "amy@example.com")).toBe(true);
  });

  it("rejects a different email", () => {
    expect(inviteMatchesAuthUser(verified, "eve@example.com")).toBe(false);
  });

  it("rejects an unverified email even if it matches", () => {
    expect(inviteMatchesAuthUser({ ...verified, email_confirmed_at: null }, "amy@example.com")).toBe(false);
    expect(inviteMatchesAuthUser({ email: "amy@example.com" }, "amy@example.com")).toBe(false);
  });

  it("rejects a missing email", () => {
    expect(inviteMatchesAuthUser({ email: null, email_confirmed_at: "x" }, "")).toBe(false);
  });
});

describe("daily invite cap", () => {
  it("is 20 per day", () => {
    expect(DAILY_INVITE_CAP).toBe(20);
  });

  it("allows sends under the cap and blocks at it", () => {
    expect(isOverDailyInviteCap(0)).toBe(false);
    expect(isOverDailyInviteCap(19)).toBe(false);
    expect(isOverDailyInviteCap(20)).toBe(true);
    expect(isOverDailyInviteCap(25)).toBe(true);
  });
});

describe("safeDisplayName", () => {
  it("keeps ordinary names", () => {
    expect(safeDisplayName("Dee O'Brien-Smith")).toBe("Dee O'Brien-Smith");
    expect(safeDisplayName("José Álvarez")).toBe("José Álvarez");
  });

  it("strips URL- and markup-like characters so names can't carry links", () => {
    const out = safeDisplayName("Click https://evil.example/login now");
    expect(out).not.toMatch(/[:/.]/);
    expect(out).not.toContain("evil.example");
    expect(safeDisplayName("<b>Dee</b>")).not.toMatch(/[<>]/);
  });

  it("caps length and falls back to 'Someone'", () => {
    expect(safeDisplayName("a".repeat(200)).length).toBeLessThanOrEqual(40);
    expect(safeDisplayName(null)).toBe("Someone");
    expect(safeDisplayName("   ")).toBe("Someone");
    expect(safeDisplayName("://...")).toBe("Someone");
  });
});

describe("buildInviteEmail", () => {
  const email = buildInviteEmail({
    inviterName: "Dee <script> http://evil.example",
    appUrl: "https://picohome.app",
  });

  it("uses a fixed subject with no user-controlled text", () => {
    expect(email.subject).toBe("You've been invited to a home on Pico Home");
  });

  it("says the inviter invited you, and that you must accept", () => {
    expect(email.text).toMatch(/invited you to join/);
    expect(email.text).toMatch(/accept/i);
    expect(email.text).toContain("https://picohome.app");
    expect(email.text).not.toMatch(/added automatically|added you/i);
  });

  it("does not echo raw inviter text", () => {
    expect(email.text).not.toContain("evil.example");
    expect(email.text).not.toContain("<script>");
  });
});

describe("summarizePendingInvites", () => {
  const rows = [
    { id: "i1", homeId: "h1", homeName: "Maple St", inviterName: "Dee", createdAt: new Date("2026-10-01") },
    { id: "i2", homeId: "h1", homeName: "Maple St", inviterName: "Dee", createdAt: new Date("2026-10-05") },
    { id: "i3", homeId: "h2", homeName: "Cabin", inviterName: null, createdAt: new Date("2026-10-02") },
  ];

  it("keeps the newest invite per home", () => {
    const out = summarizePendingInvites(rows, []);
    expect(out.map((r) => r.id).sort()).toEqual(["i2", "i3"]);
  });

  it("drops homes the user already belongs to", () => {
    expect(summarizePendingInvites(rows, ["h1"]).map((r) => r.id)).toEqual(["i3"]);
  });
});

describe("planLeave", () => {
  it("a member just leaves", () => {
    expect(planLeave("member", null)).toEqual({ kind: "leave" });
    expect(planLeave("member", "u2")).toEqual({ kind: "leave" });
  });

  it("an owner with co-members hands ownership to the longest-tenured one", () => {
    expect(planLeave("owner", "u2")).toEqual({ kind: "transfer", heirUserId: "u2" });
  });

  it("a sole owner can't leave (would orphan the home)", () => {
    expect(planLeave("owner", null)).toEqual({ kind: "sole_member" });
  });
});
