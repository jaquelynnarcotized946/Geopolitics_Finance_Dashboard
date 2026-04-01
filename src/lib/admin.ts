export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;

  const defaultAdmins = ["yepurisasi@gmail.com"];

  const configured = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  const allowedAdmins = new Set([...defaultAdmins, ...configured]);

  if (allowedAdmins.size === 0) {
    return process.env.NODE_ENV !== "production" && process.env.VERCEL !== "1";
  }

  return allowedAdmins.has(email.toLowerCase());
}
