import Link from "next/link";
import { Brand } from "@/components/brand";
export default function Privacy() {
  return (
    <>
      <header className="app-header">
        <Brand />
        <Link href="/">Back home</Link>
      </header>
      <main className="app-main prose">
        <h1>Your data stays yours.</h1>
        <h2>Spotify connection</h2>
        <p>
          We use read-only access to your profile, top artists and tracks, and
          recent listening. Access and refresh tokens are encrypted in an
          HTTP-only session cookie and sent to the server only. API responses
          are not saved to a server database. Sign out to remove this app’s
          session cookies.
        </p>
        <h2>Imported history</h2>
        <p>
          Your Spotify history files are validated and analyzed on your device.
          The records are saved in this browser’s IndexedDB so they remain
          available after refresh. They are not uploaded to Spotlytics or
          third-party services. Use “Clear imported history” in Analytics to
          remove the local copy. Downloaded recap images remain on your device.
        </p>
        <h2>Disconnecting</h2>
        <p>
          Sign out to remove this application’s session cookies. To revoke
          Spotify authorization, visit your Spotify account’s Apps page and
          remove Spotlytics access.
        </p>
        <h2>Illustrations and sound</h2>
        <p>
          Public-page artwork and example tracks are original illustrative
          designs, not your listening data. The visualizer starts silent. If you
          enable sound, your browser generates an original synthesized chord
          locally; no recordings or Spotify audio are used. Audio pauses
          offscreen and stops when you leave the page. This app uses no
          analytics trackers.
        </p>
      </main>
    </>
  );
}
