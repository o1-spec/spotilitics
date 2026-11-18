"use client";
import { useEffect, useRef, useState } from "react";
import { AudioLines, Disc3, Menu, Pause, Play, X } from "lucide-react";
import { Brand, SpotifyIcon } from "./brand";
import { Button } from "./ui/button";
import { Cover, sessions, type CoverKind } from "./landing/cover";
import { Visualizer } from "./landing/visualizer";
import { useLandingMotion } from "@/hooks/use-landing-motion";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { InitialLoader } from "./initial-loader";

export function Landing() {
  const root = useRef<HTMLDivElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const [menu, setMenu] = useState(false);
  const [motionPaused, setMotionPaused] = useState(false);
  const [session, setSession] = useState<CoverKind>("orange");
  const [introReady, setIntroReady] = useState(false);
  const reduced = useReducedMotion();
  useLandingMotion(root, motionPaused, introReady);
  useEffect(() => {
    if (!menu) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenu(false);
        menuButton.current?.focus();
      }
    };
    const outside = (event: PointerEvent) => {
      if (!(event.target as Element).closest(".nav")) setMenu(false);
    };
    document.addEventListener("keydown", close);
    document.addEventListener("pointerdown", outside);
    const media = window.matchMedia("(min-width: 801px)");
    const resize = () => {
      if (media.matches) setMenu(false);
    };
    media.addEventListener("change", resize);
    return () => {
      document.removeEventListener("keydown", close);
      document.removeEventListener("pointerdown", outside);
      media.removeEventListener("change", resize);
    };
  }, [menu]);
  return (
    <>
      {!introReady && <InitialLoader onComplete={() => setIntroReady(true)} />}
      <div
        ref={root}
        className={`landing${motionPaused ? " motion-paused" : ""}${introReady ? "" : " intro-pending"}`}
        aria-busy={!introReady}
      >
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="nav">
        <Brand />
        <nav
          className={menu ? "nav-links open" : "nav-links"}
          id="main-navigation"
          aria-label="Main navigation"
        >
          <a href="#features" onClick={() => setMenu(false)}>
            Your listening DNA
          </a>
          <a href="#how-it-works" onClick={() => setMenu(false)}>
            How it works
          </a>
          <a href="/dashboard">Your dashboard</a>
        </nav>
        <Button asChild variant="outline" className="nav-connect">
          <a href="/connect">
            <SpotifyIcon /> Connect Spotify
          </a>
        </Button>
        <button
          ref={menuButton}
          className="menu-toggle"
          aria-controls="main-navigation"
          aria-label={menu ? "Close menu" : "Open menu"}
          aria-expanded={menu}
          onClick={() => setMenu(!menu)}
        >
          {menu ? <X /> : <Menu />}
        </button>
      </header>
      <main id="main" tabIndex={-1}>
        <section className="hero">
          <div className="hero-topline">
            <span>
              <span className="hero-marker" aria-hidden="true" /> A LITTLE DATA.
              A LOT OF YOU.
            </span>
            <button
              className="motion-toggle"
              onClick={() => setMotionPaused((value) => !value)}
              aria-pressed={motionPaused || reduced}
              disabled={reduced}
            >
              {motionPaused || reduced ? (
                <Play size={13} />
              ) : (
                <Pause size={13} />
              )}{" "}
              {reduced
                ? "REDUCED MOTION"
                : motionPaused
                  ? "RESUME MOTION"
                  : "PAUSE MOTION"}
            </button>
          </div>
          <h1>
            <span className="word-mask">
              <span className="hero-word">YOUR MUSIC.</span>
            </span>
            <span className="word-mask">
              <span className="hero-word">
                YOUR <em>UNIVERSE.</em>
              </span>
            </span>
          </h1>
          <div className="hero-copy">
            <p>
              Every song leaves a trace.
              <br />
              Discover the story behind
              <br />
              everything you listen to.
            </p>
            <Button asChild>
              <a href="/connect">
                <SpotifyIcon /> Connect with Spotify
              </a>
            </Button>
            <a className="text-link" href="#journey">
              Explore the experience <span>↘</span>
            </a>
            <small>Made for music lovers. Powered by your listening.</small>
          </div>
          <div className="hero-art">
            <div className="hero-art-drift" aria-hidden="true">
              <div className="orbit orbit-one" />
              <div className="orbit orbit-two" />
              <span className="art-spark">✳</span>
              <Cover kind="blue" />
              <div className="record">
                <div className="record-label">
                  <span>SPOTLYTICS</span>
                  <strong>S</strong>
                  <small>{sessions[session].title.toUpperCase()}</small>
                </div>
              </div>
              <div className="selected-sleeve">
                <Cover kind={session} />
              </div>
              <div className="art-tag">
                <AudioLines size={18} />
                <span>{sessions[session].mood}</span>
              </div>
              <span className="art-coordinate">33⅓ RPM / ALWAYS YOU</span>
            </div>
            <div
              className="sleeve-selector"
              role="group"
              aria-label="Choose original sleeve artwork"
            >
              <span>SELECT A SLEEVE</span>
              {(["orange", "blue", "pink"] as CoverKind[]).map((kind) => (
                <button
                  key={kind}
                  aria-label={`Show ${sessions[kind].title} artwork`}
                  aria-pressed={session === kind}
                  style={
                    { "--swatch": sessions[kind].color } as React.CSSProperties
                  }
                  onClick={() => setSession(kind)}
                >
                  <span />
                </button>
              ))}
            </div>
            <span className="sr-only" aria-live="polite">
              {sessions[session].title} artwork selected.{" "}
              {sessions[session].mood}
            </span>
          </div>
          <div className="hero-bottom">
            <span>
              SCROLL TO FIND YOUR FREQUENCY <span className="down-line">↓</span>
            </span>
            <div className="mini-wave">
              {Array.from({ length: 26 }, (_, i) => (
                <i
                  key={i}
                  style={{
                    height: Math.round(8 + (Math.sin(i * 1.7) + 1) * 10),
                  }}
                />
              ))}
            </div>
            <span>NOT JUST STATS. A SOUNDTRACK.</span>
          </div>
        </section>
        <div className="ticker" aria-hidden="true">
          <span>ON REPEAT</span>✳<span>IN YOUR FEELINGS</span>✳
          <span>AFTER HOURS</span>✳<span>ON REPEAT</span>✳
          <span>IN YOUR FEELINGS</span>✳
        </div>
        <section className="journey" id="journey">
          <div className="section-kicker">THE SOUNDTRACK IS YOURS</div>
          <div className="journey-wash" aria-hidden="true" />
          <div className="journey-orbit" aria-hidden="true" />
          <div className="journey-art">
            <Cover kind="pink" />
          </div>
          <h2 className="journey-title">
            SOME SONGS
            <br />
            FIND YOU.
            <br />
            <em>SOME DEFINE YOU.</em>
          </h2>
          <p>
            That late-night discovery. The album you lived in.
            <br />
            The song that felt like it was written for you.
            <br />
            There’s a pattern in the things you love.
          </p>
          <span className="journey-note">LET’S FIND YOURS.</span>
          <div className="journey-progress" aria-hidden="true">
            <span />
          </div>
        </section>
        <section className="dna section-pad" id="features">
          <div className="section-heading reveal">
            <div>
              <span className="section-kicker">YOUR LISTENING DNA</span>
              <h2>
                Good taste.
                <br />
                <em>Great stories.</em>
              </h2>
            </div>
            <p>
              You bring the music.
              <br />
              We help you see the bigger picture.
            </p>
          </div>
          <div className="dna-grid">
            <article className="dna-artist reveal">
              <Cover kind="green" />
              <div className="dna-overlay">
                <span>THE ARTISTS YOU COME BACK TO</span>
                <h3>
                  Your kind
                  <br />
                  of people.
                </h3>
                <p>Explore your top artists, across every era of you.</p>
              </div>
            </article>
            <div className="dna-details">
              <article className="dna-track reveal">
                <span className="section-kicker">THE ON-REPEAT COLLECTION</span>
                <h3>
                  A little obsessed?
                  <br />
                  We get it.
                </h3>
                <div className="sample-tracks">
                  {[
                    ["01", "Midnight City", "Neon District", "blue"],
                    ["02", "Weightless", "Soft Signal", "pink"],
                    ["03", "Golden Hour", "The Daydreams", "orange"],
                  ].map(([n, t, a, k]) => (
                    <div key={n}>
                      <span>{n}</span>
                      <Cover kind={k as CoverKind} />
                      <div>
                        <strong>{t}</strong>
                        <small>{a}</small>
                      </div>
                      <AudioLines size={19} />
                    </div>
                  ))}
                </div>
                <small className="sample-label">
                  ILLUSTRATIVE TRACKS · NOT ACCOUNT DATA
                </small>
              </article>
              <article className="dna-hours reveal">
                <div>
                  <span className="section-kicker">
                    EVERY MINUTE MEANS SOMETHING
                  </span>
                  <h3>Find your rhythm.</h3>
                  <p>
                    Listening hours, favorite albums, and late-night habits.
                    Revealed with your history import.
                  </p>
                </div>
                <div className="tiny-bars" aria-hidden="true">
                  {[30, 50, 35, 65, 90, 75, 100, 50, 70].map((h, i) => (
                    <i key={i} style={{ height: h }} />
                  ))}
                </div>
              </article>
            </div>
          </div>
        </section>
        <Visualizer motionPaused={motionPaused} />
        <section className="stats-section section-pad" id="how-it-works">
          <div className="section-heading reveal">
            <div>
              <span className="section-kicker">
                A NEW PERSPECTIVE ON YOUR PLAYLIST
              </span>
              <h2>
                You listen.
                <br />
                We connect
                <br />
                <em>the dots.</em>
              </h2>
            </div>
            <div className="steps">
              <article>
                <span>CONNECT</span>
                <p>Bring your Spotify world along with a secure connection.</p>
              </article>
              <article>
                <span>DISCOVER</span>
                <p>
                  Meet your top artists, tracks, and your most recent favorites.
                </p>
              </article>
              <article>
                <span>GO DEEPER</span>
                <p>
                  Import your history to uncover listening hours and create your
                  personal recap.
                </p>
              </article>
              <Button asChild variant="outline">
                <a href="/dashboard">Explore your dashboard</a>
              </Button>
            </div>
          </div>
          <div className="preview reveal">
            <div className="preview-header">
              <Brand />
              <span>YOUR LISTENING, IN FOCUS</span>
              <small>ILLUSTRATIVE PREVIEW</small>
            </div>
            <div className="preview-content">
              <div>
                <span>YOUR MONTH IN MUSIC</span>
                <h3>
                  A good month
                  <br />
                  to get lost.
                </h3>
                <p>
                  Every discovery. Every replay.
                  <br />
                  All the moments in between.
                </p>
              </div>
              <div
                className="preview-chart"
                role="img"
                aria-label="Illustrative listening activity chart, not personal listening data"
              >
                <div className="chart-label">
                  <span>Listening rhythm</span>
                  <span>MON — SUN</span>
                </div>
                <div className="chart-bars">
                  {[
                    32, 48, 38, 60, 52, 82, 65, 50, 73, 48, 88, 67, 56, 95, 73,
                    61, 80, 45, 69, 91, 77,
                  ].map((h, i) => (
                    <i key={i} style={{ height: `${h}%` }} />
                  ))}
                </div>
                <div className="chart-label">
                  <span>MON</span>
                  <span>WED</span>
                  <span>FRI</span>
                  <span>SUN</span>
                </div>
              </div>
            </div>
          </div>
        </section>
        <section className="final-cta">
          <span className="section-kicker">
            SAME MUSIC. A WHOLE NEW PERSPECTIVE.
          </span>
          <h2 className="reveal">
            THERE’S MORE
            <br />
            TO <em>YOUR MUSIC.</em>
          </h2>
          <Button asChild>
            <a href="/connect">
              <SpotifyIcon /> Discover your listening story
            </a>
          </Button>
          <p>Your music. Your data. Your story to tell.</p>
          <Disc3 className="footer-disc" size={260} strokeWidth={0.3} />
        </section>
      </main>
      <footer>
        <Brand />
        <p>Made for the love of listening.</p>
        <a href="/privacy">Privacy & your data</a>
        <span>© {new Date().getFullYear()} Spotlytics</span>
      </footer>
      </div>
    </>
  );
}
