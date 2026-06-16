// Optional, single-password access gate. Active only when APP_PASSWORD is set —
// otherwise the app is fully open (local dev / demo). Works in both the Edge
// middleware and Node route handlers via the Web Crypto API.

export const AUTH_COOKIE = "miner_auth";

export function authEnabled(): boolean {
  return Boolean(process.env.APP_PASSWORD);
}

// Deterministic token derived from the password — stored in the cookie and
// recomputed for comparison. Not a substitute for real auth, but enough to keep
// a self-hosted instance private.
export async function passwordToken(password: string): Promise<string> {
  const salt = "opportunity-miner:v1";
  const data = new TextEncoder().encode(`${salt}:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function expectedToken(): Promise<string | null> {
  const pw = process.env.APP_PASSWORD;
  if (!pw) return null;
  return passwordToken(pw);
}
