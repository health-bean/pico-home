/**
 * Pure rules for home invites and leaving a home. Route handlers stay thin;
 * the security-relevant decisions live (and are tested) here.
 */

/** Per-user daily invite cap, counted from home_invites (holds across
 *  serverless instances, unlike the in-memory rate limiter). */
export const DAILY_INVITE_CAP = 20;
export const INVITE_CAP_WINDOW_MS = 24 * 60 * 60 * 1000;

export function isOverDailyInviteCap(sentInWindow: number): boolean {
  return sentInWindow >= DAILY_INVITE_CAP;
}

interface AuthEmail {
  email?: string | null;
  email_confirmed_at?: string | null;
}

/** An invite belongs to the signed-in user only if it was sent to their
 *  verified email address. */
export function inviteMatchesAuthUser(authUser: AuthEmail, invitedEmail: string): boolean {
  if (!authUser.email || !authUser.email_confirmed_at) return false;
  return authUser.email.trim().toLowerCase() === invitedEmail.trim().toLowerCase();
}

/** Inviter names come from the inviter's Google profile — attacker-controlled.
 *  Keep letters, digits, spaces, apostrophes and hyphens so a "name" can't
 *  smuggle a link or markup into the invite email. */
export function safeDisplayName(name: string | null | undefined): string {
  const cleaned = (name ?? "")
    .replace(/[^\p{L}\p{M}\p{N} '-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 40)
    .trim();
  return /[\p{L}\p{N}]/u.test(cleaned) ? cleaned : "Someone";
}

export function buildInviteEmail({
  inviterName,
  appUrl,
}: {
  inviterName: string | null | undefined;
  appUrl: string;
}): { subject: string; text: string } {
  const who = safeDisplayName(inviterName);
  return {
    subject: "You've been invited to a home on Pico Home",
    text: `Hi,

${who} invited you to join their home on Pico Home — a shared list of the home's maintenance, so nobody has to ask "did you change the filter?".

To accept, sign in with Google using this email address, then choose Accept on the invite:
${appUrl}

Not expecting this? You can ignore this email, or decline the invite in the app.

— Pico Home`,
  };
}

export interface PendingInviteRow {
  id: string;
  homeId: string;
  homeName: string;
  inviterName: string | null;
  createdAt: Date;
}

/** One invite per home (newest wins), skipping homes the user is already in. */
export function summarizePendingInvites<T extends PendingInviteRow>(
  rows: T[],
  memberHomeIds: string[]
): T[] {
  const member = new Set(memberHomeIds);
  const byHome = new Map<string, T>();
  for (const row of rows) {
    if (member.has(row.homeId)) continue;
    const prev = byHome.get(row.homeId);
    if (!prev || row.createdAt > prev.createdAt) byHome.set(row.homeId, row);
  }
  return [...byHome.values()].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export type LeavePlan =
  | { kind: "leave" }
  | { kind: "transfer"; heirUserId: string }
  | { kind: "sole_member" };

/** Mirrors account deletion: an owner's home passes to the longest-tenured
 *  co-member. A sole owner can't leave — that would orphan the home. */
export function planLeave(role: string, heirUserId: string | null): LeavePlan {
  if (role !== "owner") return { kind: "leave" };
  if (heirUserId) return { kind: "transfer", heirUserId };
  return { kind: "sole_member" };
}
