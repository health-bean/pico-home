/**
 * Beta allow-list (ALLOWED_EMAILS, comma-separated). Unset or blank disables
 * the gate. Enforced centrally — auth callback, getAppUser (every apiHandler
 * route), and onboarding — so a session minted outside the callback can't
 * bypass it.
 */
export function parseAllowList(raw: string | undefined): string[] | null {
  if (!raw) return null;
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isEmailAllowed(
  email: string | null | undefined,
  raw: string | undefined = process.env.ALLOWED_EMAILS
): boolean {
  const list = parseAllowList(raw);
  if (!list) return true;
  if (!email) return false;
  return list.includes(email.trim().toLowerCase());
}
