import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  createOAuthState,
  createPkcePair,
  matchesOAuthState,
} from "../src/lib/oauth";
import { authConfigured, seal, unseal } from "../src/lib/session";

test("PKCE verifier is random and challenge is its base64url SHA-256 digest", () => {
  const first = createPkcePair();
  const second = createPkcePair();
  assert.equal(
    first.challenge,
    createHash("sha256").update(first.verifier).digest("base64url"),
  );
  assert.match(first.verifier, /^[A-Za-z0-9_-]{80,}$/);
  assert.notEqual(first.verifier, second.verifier);
});

test("OAuth state is unpredictable and comparison rejects missing or altered state", () => {
  const state = createOAuthState();
  assert.equal(state.length, 43);
  assert.equal(matchesOAuthState(state, state), true);
  assert.equal(matchesOAuthState(state, null), false);
  assert.equal(matchesOAuthState(state, `${state}x`), false);
  assert.notEqual(createOAuthState(), state);
});

test("Spotify readiness rejects placeholders and insecure non-loopback callbacks", () => {
  const envKeys = [
    "NODE_ENV",
    "SPOTIFY_CLIENT_ID",
    "SPOTIFY_REDIRECT_URI",
    "SESSION_SECRET",
  ] as const;
  const previous = Object.fromEntries(
    envKeys.map((key) => [key, process.env[key]]),
  );
  try {
    Reflect.set(process.env, "NODE_ENV", "development");
    process.env.SPOTIFY_CLIENT_ID = "your_spotify_client_id";
    process.env.SPOTIFY_REDIRECT_URI =
      "http://127.0.0.1:3000/api/auth/callback/spotify";
    process.env.SESSION_SECRET =
      "unit-test-only-session-secret-with-sufficient-length";
    assert.equal(authConfigured(), false);

    process.env.SPOTIFY_CLIENT_ID = "a".repeat(32);
    assert.equal(authConfigured(), true);
    process.env.SPOTIFY_REDIRECT_URI =
      "http://example.com/api/auth/callback/spotify";
    assert.equal(authConfigured(), false);

    Reflect.set(process.env, "NODE_ENV", "production");
    process.env.SPOTIFY_REDIRECT_URI =
      "http://127.0.0.1:3000/api/auth/callback/spotify";
    assert.equal(authConfigured(), false);
    process.env.SPOTIFY_REDIRECT_URI =
      "https://music.example/api/auth/callback/spotify";
    assert.equal(authConfigured(), true);
  } finally {
    for (const key of envKeys) {
      const value = previous[key];
      if (value === undefined) delete process.env[key];
      else Reflect.set(process.env, key, value);
    }
  }
});

test("session cookies are encrypted, expire, and reject modified ciphertext", async () => {
  process.env.SESSION_SECRET =
    "unit-test-only-session-secret-with-sufficient-length";
  const payload = {
    access_token: "test-access",
    refresh_token: "test-refresh",
    expires_at: 123456,
  };
  const token = await seal(payload, "5m");
  assert.equal(token.includes("test-access"), false);
  const opened = await unseal<typeof payload & { iat: number; exp: number }>(
    token,
  );
  assert.equal(opened?.access_token, payload.access_token);
  assert.equal(opened?.refresh_token, payload.refresh_token);
  assert.equal(opened?.expires_at, payload.expires_at);
  assert.equal(typeof opened?.iat, "number");
  assert.equal(typeof opened?.exp, "number");
  assert.equal(await unseal<typeof payload>(`${token}x`), null);
});
