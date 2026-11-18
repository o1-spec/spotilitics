import { NextResponse } from "next/server";
import { z } from "zod";
import { cookieOptions, seal, session } from "@/lib/session";
import {
  artistSchema,
  exchange,
  pagingSchema,
  profileSchema,
  recentSchema,
  SpotifyRequestError,
  spotifyFetch,
  trackSchema,
} from "@/lib/spotify";

const querySchema = z.object({
  resource: z.enum(["profile", "artists", "tracks", "history", "overview"]),
  range: z
    .enum(["short_term", "medium_term", "long_term"])
    .default("medium_term"),
  before: z.coerce.number().int().positive().optional(),
  offset: z.coerce.number().int().min(0).max(950).default(0),
});
const errorMessage = (status: number) =>
  status === 401
    ? "Spotify authorization expired. Reconnect Spotify to continue."
    : status === 403
      ? "Spotify denied access. Check the app’s authorized users and account eligibility."
      : status === 429
        ? "Spotify is rate limiting requests. Please wait before retrying."
        : status >= 500
          ? "Spotify is temporarily unavailable. Try again shortly."
          : "Spotify could not load this data.";
const privateHeaders = { "Cache-Control": "private, no-store" };

export async function GET(request: Request) {
  const parsed = querySchema.safeParse(
    Object.fromEntries(new URL(request.url).searchParams),
  );
  if (!parsed.success)
    return NextResponse.json(
      { error: "Invalid request." },
      { status: 400, headers: privateHeaders },
    );
  const auth = await session();
  if (!auth)
    return NextResponse.json(
      { error: "Connect Spotify to view your listening data." },
      { status: 401, headers: privateHeaders },
    );
  let active = auth;
  let refreshPromise: Promise<void> | null = null;
  let sessionExpired = false;
  const refreshSession = () => {
    if (!refreshPromise) {
      refreshPromise = (async () => {
        try {
          const token = await exchange({
            grant_type: "refresh_token",
            refresh_token: active.refresh_token,
          });
          active = {
            access_token: token.access_token,
            refresh_token: token.refresh_token ?? active.refresh_token,
            expires_at: Date.now() + token.expires_in * 1000,
          };
        } catch (error) {
          if (error instanceof SpotifyRequestError && error.status === 400)
            sessionExpired = true;
          throw error;
        }
      })();
    }
    return refreshPromise.finally(() => {
      refreshPromise = null;
    });
  };
  const spotifyRequest = async <T,>(path: string, schema: z.ZodType<T>) => {
    try {
      return await spotifyFetch(path, active.access_token, schema);
    } catch (error) {
      if (!(error instanceof SpotifyRequestError) || error.status !== 401)
        throw error;
      await refreshSession();
      return spotifyFetch(path, active.access_token, schema);
    }
  };
  const persistRefreshedSession = async (response: NextResponse) => {
    if (active !== auth)
      response.cookies.set("spot_session", await seal(active), {
        ...cookieOptions,
        maxAge: 2592000,
      });
    return response;
  };
  try {
    if (active.expires_at < Date.now() + 60_000) await refreshSession();
    const { resource, range, before, offset } = parsed.data;
    const limit = 20;
    let data: unknown;
    if (resource === "profile")
      data = await spotifyRequest("me", profileSchema);
    else if (resource === "artists")
      data = await spotifyRequest(
        `me/top/artists?limit=${limit}&offset=${offset}&time_range=${range}`,
        pagingSchema(artistSchema),
      );
    else if (resource === "tracks")
      data = await spotifyRequest(
        `me/top/tracks?limit=${limit}&offset=${offset}&time_range=${range}`,
        pagingSchema(trackSchema),
      );
    else if (resource === "history")
      data = await spotifyRequest(
        `me/player/recently-played?limit=${limit}${before ? `&before=${before}` : ""}`,
        z
          .object({
            items: z.array(recentSchema),
            next: z.string().nullable().optional(),
            cursors: z
              .object({
                after: z.string().optional(),
                before: z.string().optional(),
              })
              .optional(),
          })
          .passthrough(),
      );
    else {
      const [profile, artists, tracks, history] = await Promise.all([
        spotifyRequest("me", profileSchema),
        spotifyRequest(
          `me/top/artists?limit=6&time_range=${range}`,
          pagingSchema(artistSchema),
        ),
        spotifyRequest(
          `me/top/tracks?limit=6&time_range=${range}`,
          pagingSchema(trackSchema),
        ),
        spotifyRequest(
          "me/player/recently-played?limit=10",
          z.object({ items: z.array(recentSchema) }).passthrough(),
        ),
      ]);
      data = {
        profile,
        artists: artists.items,
        tracks: tracks.items,
        recent: history.items,
      };
    }
    const response = NextResponse.json(data, {
      headers: { "Cache-Control": "private, no-store" },
    });
    return persistRefreshedSession(response);
  } catch (error) {
    if (sessionExpired) {
      const response = NextResponse.json(
        { error: "Your Spotify session expired. Reconnect Spotify to continue." },
        { status: 401, headers: privateHeaders },
      );
      response.cookies.set("spot_session", "", { ...cookieOptions, maxAge: 0 });
      return response;
    }
    if (error instanceof SpotifyRequestError) {
      const response = NextResponse.json(
        {
          error:
            error.reason === "QUOTA_EXCEEDED"
              ? "Spotlytics reached the Spotify Development Mode API quota. Wait for the quota window to reset before trying again."
              : errorMessage(error.status),
          retryAfter: error.retryAfter,
        },
        {
          status: error.status,
          headers: {
            ...(error.retryAfter ? { "Retry-After": error.retryAfter } : {}),
            ...privateHeaders,
          },
        },
      );
      if (error.status === 401)
        response.cookies.set("spot_session", "", {
          ...cookieOptions,
          maxAge: 0,
        });
      else await persistRefreshedSession(response);
      return response;
    }
    const response = NextResponse.json(
      {
        error:
          "Spotify returned data we could not read, or the service could not be reached.",
      },
      { status: 502, headers: { "Cache-Control": "private, no-store" } },
    );
    return persistRefreshedSession(response);
  }
}
