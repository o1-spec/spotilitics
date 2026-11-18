import { NextResponse } from "next/server";
import { authConfigured, cookieOptions, seal } from "@/lib/session";
import { createOAuthState, createPkcePair } from "@/lib/oauth";

export async function GET(request: Request) {
  if (!authConfigured())
    return NextResponse.redirect(
      new URL("/connect?error=configuration", request.url),
    );
  const { verifier, challenge } = createPkcePair();
  const state = createOAuthState();
  const params = new URLSearchParams({
    client_id: process.env.SPOTIFY_CLIENT_ID!,
    response_type: "code",
    redirect_uri: process.env.SPOTIFY_REDIRECT_URI!,
    scope: "user-read-private user-top-read user-read-recently-played",
    code_challenge_method: "S256",
    code_challenge: challenge,
    state,
  });
  const response = NextResponse.redirect(
    `https://accounts.spotify.com/authorize?${params}`,
  );
  response.cookies.set("spot_oauth", await seal({ verifier, state }, "10m"), {
    ...cookieOptions,
    maxAge: 600,
  });
  return response;
}
