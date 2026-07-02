/**
 * Lista blanca de emails autorizados a entrar al panel.
 * Se lee de NEXT_PUBLIC_ADMIN_EMAILS (separado por coma).
 */
export function adminEmails(): string[] {
  const raw = process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? "";
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  return adminEmails().includes(email.toLowerCase());
}
