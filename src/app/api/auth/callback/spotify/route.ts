import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { authConfigured, cookieOptions, seal, unseal } from "@/lib/session";
import { exchange } from "@/lib/spotify";
import { matchesOAuthState } from "@/lib/oauth";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const oauthToken = (await cookies()).get("spot_oauth")?.value;
  const oauth = oauthToken
    ? await unseal<{ state: string; verifier: string }>(oauthToken)
    : null;
  let destination = "/dashboard";
  let sessionToken: string | null = null;
  try {
    if (!authConfigured()) throw new Error("Spotify configuration is incomplete.");
    const code = url.searchParams.get("code");
    if (
      !oauth ||
      !code ||
      url.searchParams.has("error") ||
      !matchesOAuthState(oauth.state, url.searchParams.get("state"))
    )
      throw new Error("Authorization could not be validated.");
    const tokens = await exchange({
      grant_type: "authorization_code",
      code,
      redirect_uri: process.env.SPOTIFY_REDIRECT_URI!,
      code_verifier: oauth.verifier,
    });
    if (!tokens.refresh_token)
      throw new Error("Spotify did not provide a refresh token.");
    sessionToken = await seal({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: Date.now() + tokens.expires_in * 1000,
    });
  } catch {
    destination = authConfigured()
      ? "/connect?error=authorization"
      : "/connect?error=configuration";
  }
  const response = NextResponse.redirect(new URL(destination, request.url));
  if (sessionToken)
    response.cookies.set("spot_session", sessionToken, {
      ...cookieOptions,
      maxAge: 2592000,
    });
  response.cookies.set("spot_oauth", "", { ...cookieOptions, maxAge: 0 });
  return response;
}
