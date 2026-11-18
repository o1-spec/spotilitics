import test from "node:test";
import assert from "node:assert/strict";
import {
  artistSchema,
  exchange,
  pagingSchema,
  profileSchema,
  recentSchema,
  SpotifyRequestError,
  spotifyFetch,
  tokenSchema,
  trackSchema,
} from "../src/lib/spotify";

test("minimal profile responses remain valid when optional profile fields are absent", () => {
  assert.deepEqual(profileSchema.parse({ display_name: null }), {
    display_name: null,
  });
  assert.throws(() => profileSchema.parse({ images: [{ url: "not a URL" }] }));
});

test("rankings validate the fields used by the dashboard and preserve Spotify metadata", () => {
  const artist = artistSchema.parse({
    id: "artist-1",
    name: "Artist",
    images: [],
    external_urls: { spotify: "https://open.spotify.com/artist/artist-1" },
  });
  assert.equal(artist.name, "Artist");
  const page = pagingSchema(trackSchema).parse({
    items: [
      {
        id: "track-1",
        name: "Track",
        artists: [{ name: "Artist" }],
        album: { name: "Album", images: [] },
        duration_ms: 1000,
      },
    ],
    total: 1,
    offset: 0,
  });
  assert.equal(page.items[0].album.name, "Album");
  assert.equal(page.total, 1);
  assert.throws(() =>
    trackSchema.parse({
      id: "missing-artists",
      name: "Track",
      album: { name: "Album" },
    }),
  );
});

test("recent-played pages require timestamps and track metadata", () => {
  assert.equal(
    recentSchema.parse({
      played_at: "2026-11-18T10:00:00Z",
      track: {
        id: "track-1",
        name: "Track",
        artists: [{ name: "Artist" }],
        album: { name: "Album" },
      },
    }).track.name,
    "Track",
  );
  assert.throws(() =>
    recentSchema.parse({ track: { id: "track-1", name: "Track" } }),
  );
});

test("token exchange validates server responses without requiring refresh tokens on refresh grants", () => {
  assert.equal(
    tokenSchema.parse({ access_token: "access", expires_in: 3600 })
      .access_token,
    "access",
  );
  assert.throws(() => tokenSchema.parse({ expires_in: 3600 }));
});

test("token exchange sends the PKCE grant fields without a client secret", async () => {
  const oldId = process.env.SPOTIFY_CLIENT_ID;
  const originalFetch = globalThis.fetch;
  let body = "";
  try {
    process.env.SPOTIFY_CLIENT_ID = "a".repeat(32);
    globalThis.fetch = async (_input, init) => {
      body = String(init?.body);
      return Response.json({ access_token: "access", expires_in: 3600 });
    };
    await exchange({
      grant_type: "authorization_code",
      code: "authorization-code",
      redirect_uri: "http://127.0.0.1:3000/api/auth/callback/spotify",
      code_verifier: "verifier",
    });
    const form = new URLSearchParams(body);
    assert.equal(form.get("grant_type"), "authorization_code");
    assert.equal(form.get("code_verifier"), "verifier");
    assert.equal(form.get("client_id"), "a".repeat(32));
    assert.equal(form.has("client_secret"), false);
  } finally {
    globalThis.fetch = originalFetch;
    if (oldId === undefined) delete process.env.SPOTIFY_CLIENT_ID;
    else process.env.SPOTIFY_CLIENT_ID = oldId;
  }
});

test("Spotify API calls validate successful JSON and keep bearer tokens off URLs", async () => {
  const originalFetch = globalThis.fetch;
  let requestedUrl = "";
  let authorization = "";
  try {
    globalThis.fetch = async (input, init) => {
      requestedUrl = String(input);
      authorization = new Headers(init?.headers).get("Authorization") ?? "";
      return Response.json({ display_name: "Listener" });
    };
    const profile = await spotifyFetch("me", "private-access-token", profileSchema);
    assert.equal(profile.display_name, "Listener");
    assert.equal(requestedUrl, "https://api.spotify.com/v1/me");
    assert.equal(authorization, "Bearer private-access-token");
    assert.equal(requestedUrl.includes("private-access-token"), false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Spotify 429 responses preserve Retry-After for the dashboard", async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () =>
      Response.json(
        { error: { status: 429, reason: "RATE_LIMITED" } },
        { status: 429, headers: { "Retry-After": "17" } },
      );
    await assert.rejects(
      spotifyFetch("me", "access", profileSchema),
      (error: unknown) =>
        error instanceof SpotifyRequestError &&
        error.status === 429 &&
        error.retryAfter === "17" &&
        error.reason === "RATE_LIMITED",
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
