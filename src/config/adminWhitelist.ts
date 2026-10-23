/**
 * Admin Whitelist – the ONLY people who can open /admin or call /api/admin/*.
 * Edit this list in code (it is intentionally not editable from the UI) and redeploy.
 * Matching is by the e-mail returned by the identity provider (case-insensitive).
 */
export const ADMIN_WHITELIST: { name: string; email: string }[] = [
  { name: "Replace Me One", email: "admin.one@example.com" },
  { name: "Replace Me Two", email: "admin.two@example.com" }
];

export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const e = email.trim().toLowerCase();
  return ADMIN_WHITELIST.some((a) => a.email.toLowerCase() === e);
}
