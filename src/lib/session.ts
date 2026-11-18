import { EncryptJWT, jwtDecrypt } from "jose";
import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { z } from "zod";

export const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};
const sessionSchema = z.object({
  access_token: z.string().min(1),
  refresh_token: z.string().min(1),
  expires_at: z.number().finite(),
});
export type Session = z.infer<typeof sessionSchema>;
function key() {
  const secret = process.env.SESSION_SECRET?.trim();
  if (!secret || secret.length < 32)
    throw new Error("SESSION_SECRET must contain at least 32 characters");
  return createHash("sha256").update(secret).digest();
}
export async function seal(data: Record<string, unknown>, ttl = "30d") {
  return new EncryptJWT(data)
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .setIssuedAt()
    .setExpirationTime(ttl)
    .encrypt(key());
}
export async function unseal<T>(token: string): Promise<T | null> {
  try {
    return (await jwtDecrypt(token, key())).payload as T;
  } catch {
    return null;
  }
}
export async function session(): Promise<Session | null> {
  const token = (await cookies()).get("spot_session")?.value;
  if (!token) return null;
  const payload = await unseal<unknown>(token);
  const parsed = sessionSchema.safeParse(payload);
  return parsed.success ? parsed.data : null;
}
export function authConfigured() {
  const clientId = process.env.SPOTIFY_CLIENT_ID?.trim() ?? "";
  const secret = process.env.SESSION_SECRET?.trim() ?? "";
  const uri = process.env.SPOTIFY_REDIRECT_URI;
  try {
    const parsed = new URL(uri ?? "");
    const loopbackHosts = new Set(["127.0.0.1", "localhost", "[::1]"]);
    const redirectSecure =
      parsed.protocol === "https:" ||
      (process.env.NODE_ENV !== "production" &&
        parsed.protocol === "http:" &&
        loopbackHosts.has(parsed.hostname));
    return Boolean(
      /^[A-Za-z0-9]{16,128}$/.test(clientId) &&
      secret.length >= 32 &&
      !/^(replace_with_|your_|placeholder|change_me)/i.test(secret) &&
      parsed.pathname === "/api/auth/callback/spotify" &&
      !parsed.search &&
      !parsed.hash &&
      !parsed.username &&
      !parsed.password &&
      redirectSecure,
    );
  } catch {
    return false;
  }
}
