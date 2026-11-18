# Spotlytics

A Next.js App Router application with an editorial music landing page, GSAP/ScrollTrigger + Lenis motion, a Spotify dashboard, and private extended-history analytics. Uses TypeScript, Tailwind CSS 4, a shadcn-style Radix/CVA Button, Lucide, Recharts, Zod, and encrypted server-side session handling.

## Run locally

Requires Node 20.9+ (Node 22 LTS recommended).

```sh
npm install
# Create .env.local if it doesn't exist, then copy the placeholder values from .env.example.
# If you already have .env.local, edit only the keys you need to preserve credentials.
npm run dev
```

Open **http://127.0.0.1:3000**. Public pages and history imports work without Spotify credentials. Use 127.0.0.1 consistently, not localhost, so OAuth cookies stay on the same host.

## Spotify configuration

1. Create an application in https://developer.spotify.com/dashboard and choose Web API.
2. Register this exact redirect URI: `http://127.0.0.1:3000/api/auth/callback/spotify`.
3. Set `SPOTIFY_CLIENT_ID` to its client ID.
4. Set `SPOTIFY_REDIRECT_URI` to the exact URI above.
5. Generate a session secret with `openssl rand -base64 48`, then set `SESSION_SECRET` to the output. Keep it private and stable between deployments. No Spotify client secret is required for PKCE.
6. In Development Mode, maintain an active Premium subscription for the app owner and add allowed testers in User Management. Spotify currently permits up to five allowlisted users per app. Development Mode apps also share the developer account's API quota; batch related reads and respect 429 responses.
7. Restart the dev server. Open `/connect`, approve Spotify’s read-only scopes, and return to `/dashboard`.

Scopes: `user-read-private user-top-read user-read-recently-played`. Supported calls: `/me`, `/me/top/artists`, `/me/top/tracks`, `/me/player/recently-played`. No audio features, recommendations, artist top-track endpoints, audio scraping, or playback are used. Top-item affinity is never represented as exact play counts.

Official references:

- https://developer.spotify.com/documentation/web-api/tutorials/code-pkce-flow
- https://developer.spotify.com/documentation/web-api/concepts/redirect_uri
- https://developer.spotify.com/documentation/web-api/tutorials/february-2026-migration-guide

## Vercel

Import this repository as a Next.js project. Configure the three environment variables in the project settings. Set the redirect to `https://YOUR-DOMAIN/api/auth/callback/spotify` and add that exact HTTPS URI to Spotify. Deploy using the normal Next.js build. No database is required. Production cookies are Secure, HttpOnly, SameSite=Lax; tokens are AES-GCM encrypted. OAuth state and PKCE verifier expire after 10 minutes. Sessions expire after 30 days; access tokens refresh through the server. Sign-out is POST-only and checks request origin.

## History and privacy

Request **Extended Streaming History** from Spotify’s account Privacy page. Unzip the export locally, then select or drop one or more `Streaming_History_Audio_*.json` files in Dashboard → Analytics. Files are validated with Zod in a Web Worker; export field-name variants are normalized where possible. Import multiple files in batches up to 100 MB and one million rows per file.

Imports are validated, combined, timestamp-normalized, and deduplicated. Music records with positive playback duration are included; podcast/non-music entries and zero-duration entries are excluded. A listening record is not necessarily a complete play. Durations use the supplied playback time, not track length. Streaks count consecutive UTC dates with included music. Analytics include daily, Monday-start weekly, and monthly listening; activity heatmap; listening hour radial chart; weekday/weekend patterns; active-day frequency; longest session; artist, track-count, track-duration, and album rankings; monthly artist evolution; and exact UTC date filters with a previous-period comparison. Album and artist statistics require supplied metadata. All figures are scoped to the imported records, not presumed lifetime totals. Spotify API affinity periods remain separate from exact imported-history date ranges.

History is stored in this browser's IndexedDB and stays on the device; it is never uploaded. Clear imported history removes the local database entries. The parser and analytics calculations run in Web Workers; records are persisted in batches. Personal Wrapped can be selected by year and creates up to ten cinematic slides from available data, supports arrow keys, replay, exit, reduced-motion behavior, and local PNG export. Missing artist/track metadata causes those slides to be omitted rather than inferred.

## Structure

- `src/app`: marketing, connect/privacy, dashboard, and server route handlers
- `src/components/landing.tsx`: six-section public experience and scoped motion lifecycle
- `src/components/dashboard.tsx`: account views, import UI, charts, recap export
- `src/components/ui`: reusable Radix/CVA component primitives
- `src/lib/session.ts`: encrypted cookies and configuration
- `src/lib/spotify.ts`: validated token exchange
- `src/lib/analytics.ts`: import normalization, UTC filtering, and pure aggregations
- `src/lib/history-store.ts`: IndexedDB storage abstraction for private local history
- `src/workers/history.worker.ts`: off-main-thread JSON validation and normalization
- `src/workers/analytics.worker.ts`: off-main-thread filtering, comparisons, and aggregations
- `tests`: aggregation/validation regression coverage

The analytics layer is independent of persistence so a future PostgreSQL/Prisma repository can store normalized records without changing calculations. Public artwork is original CSS-generated art, and sample tracks are explicitly illustrative. The visualizer starts silent; an explicit button enables an original Web Audio synthesized chord and actual frequency analysis. No licensed recordings or Spotify playback are used. Audio and visual rendering suspend offscreen and on hidden tabs. Reduced motion disables GSAP timelines and smooth scrolling; desktop-only pinning is omitted on smaller screens.

## Verification

```sh
npm run lint
npm run typecheck
npm test
npm run build
```

Automated tests cover aggregation, UTC date filtering, export variants, sessions, rankings, streaks, duplicate imports, invalid input, and empty data. Typecheck, lint, and production build are also available through the scripts below. Browser visual QA is intentionally not part of this implementation pass. Real Spotify login/refresh and account results require owner-supplied credentials and have not been verified against a live account.

Manual acceptance: inspect desktop and narrow mobile layouts, keyboard navigation and reduced motion; connect an allowlisted Spotify account; switch all ranking ranges; verify denial and sign-out; import overlapping history files; refresh to confirm local IndexedDB persistence; filter UTC ranges; inspect charts and download each recap slide.

In restricted environments where Turbopack’s CSS worker cannot bind a local port, use `npm run build -- --webpack`. The final application was production-built successfully with this supported Next.js alternative after the waveform hydration correction.
