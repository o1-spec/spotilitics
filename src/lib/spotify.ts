import { z } from "zod";

export const tokenSchema = z.object({
  access_token: z.string().min(1),
  token_type: z.string().optional(),
  scope: z.string().optional(),
  refresh_token: z.string().optional(),
  expires_in: z.number().positive(),
});

const imageSchema = z.object({
  url: z.string().url(),
  width: z.number().nullable().optional(),
  height: z.number().nullable().optional(),
});
const linkSchema = z.object({ spotify: z.string().url() }).passthrough();
export const artistSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    images: z.array(imageSchema).optional(),
    external_urls: linkSchema.optional(),
    genres: z.array(z.string()).optional(),
  })
  .passthrough();
export const trackSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    artists: z.array(
      z.object({ id: z.string().optional(), name: z.string() }).passthrough(),
    ),
    album: z
      .object({
        name: z.string(),
        images: z.array(imageSchema).optional(),
        external_urls: linkSchema.optional(),
      })
      .passthrough(),
    external_urls: linkSchema.optional(),
    duration_ms: z.number().optional(),
  })
  .passthrough();
export const profileSchema = z
  .object({
    display_name: z.string().nullable().optional(),
    images: z.array(imageSchema).optional(),
    external_urls: linkSchema.optional(),
  })
  .passthrough();
export const recentSchema = z.object({
  played_at: z.string(),
  track: trackSchema,
});
export const pagingSchema = <T extends z.ZodType>(item: T) =>
  z
    .object({
      items: z.array(item),
      limit: z.number().optional(),
      offset: z.number().optional(),
      total: z.number().optional(),
      next: z.string().nullable().optional(),
    })
    .passthrough();

export type SpotifyArtist = z.infer<typeof artistSchema>;
export type SpotifyTrack = z.infer<typeof trackSchema>;
export type SpotifyProfile = z.infer<typeof profileSchema>;
export type SpotifyRecent = z.infer<typeof recentSchema>;

export class SpotifyRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly retryAfter?: string,
    readonly reason?: string,
  ) {
    super(message);
    this.name = "SpotifyRequestError";
  }
}

export async function exchange(params: Record<string, string>) {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  if (!clientId)
    throw new Error("Spotify is not configured. Add SPOTIFY_CLIENT_ID.");
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ ...params, client_id: clientId }),
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new SpotifyRequestError(
      "Spotify token request failed.",
      res.status,
      res.headers.get("retry-after") ?? undefined,
      body.error,
    );
  }
  return tokenSchema.parse(await res.json());
}

export async function spotifyFetch<T>(
  path: string,
  accessToken: string,
  schema: z.ZodType<T>,
): Promise<T> {
  const response = await fetch(`https://api.spotify.com/v1/${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as {
      error?: { reason?: string };
    };
    throw new SpotifyRequestError(
      "Spotify could not load this data.",
      response.status,
      response.headers.get("retry-after") ?? undefined,
      body.error?.reason,
    );
  }
  return schema.parse(await response.json());
}
