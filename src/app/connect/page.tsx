import Link from "next/link";
import { Disc3 } from "lucide-react";
import { Brand, SpotifyIcon } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { authConfigured } from "@/lib/session";

export default async function Connect({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const ready = authConfigured();

  return (
    <div className="app-shell connect-page">
      <header className="app-header connect-header">
        <Brand />
        <Link href="/">Back to the experience</Link>
      </header>

      <main className="connect-main">
        <div className="connect-intro">
          <span className="section-kicker">YOUR NEXT CHAPTER</span>
          <h1>
            Make it <em>personal.</em>
          </h1>
          <p>Your listening story starts here.</p>
        </div>

        <section className="connect-card" aria-labelledby="connect-title">
          <div className="connect-disc" aria-hidden="true">
            <Disc3 size={29} strokeWidth={1.4} />
          </div>
          <span className="connect-overline">A WINDOW INTO YOUR WORLD</span>
          <h2 id="connect-title">Connect your Spotify world</h2>
          <p className="connect-description">
            See your top artists, favorite tracks, and recent listening. We
            request read-only access and never change your library or play
            music.
          </p>

          {error === "authorization" && (
            <div className="notice error connect-notice" role="alert">
              Authorization was declined or expired. Please try connecting
              again.
            </div>
          )}

          {ready ? (
            <Button asChild>
              <a href="/api/auth/spotify">
                <SpotifyIcon /> Continue with Spotify
              </a>
            </Button>
          ) : (
            <div className="notice connect-notice" role="status">
              Spotify connection is not configured yet. Add SPOTIFY_CLIENT_ID,
              SPOTIFY_REDIRECT_URI, and SESSION_SECRET to .env.local, then
              restart the server. See README.md for setup instructions.
            </div>
          )}

          <div className="connect-divider" aria-hidden="true">
            <span /> OR <span />
          </div>
          <p className="connect-import-copy">
            Have your Spotify Extended Streaming History?
          </p>
          <Button asChild variant="outline">
            <Link href="/dashboard?view=analytics">
              Explore with your own data
            </Link>
          </Button>
        </section>
      </main>
    </div>
  );
}
