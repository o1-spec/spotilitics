"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Legend,
  ResponsiveContainer,
  RadialBar,
  RadialBarChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Disc3, Download, Upload, Music2 } from "lucide-react";
import gsap from "gsap";
import { Brand } from "./brand";
import { Button } from "./ui/button";
import {
  aggregate,
  deduplicate,
  type HistoryRow,
  type Analytics,
} from "@/lib/analytics";
import { clearHistory, readHistory, saveHistory } from "@/lib/history-store";
type Item = {
  id: string;
  name: string;
  images?: { url: string }[];
  external_urls?: { spotify: string };
  artists?: { name: string }[];
  album?: { name: string; images: { url: string }[] };
  genres?: string[];
};
type Profile = {
  display_name?: string | null;
  images?: { url: string }[];
  external_urls?: { spotify: string };
};
type Recent = { track: Item; played_at: string };
const emptyAnalytics = aggregate([]);
const views = [
  "Overview",
  "Artists",
  "Tracks",
  "History",
  "Analytics",
  "Personal Wrapped",
];
export function Dashboard({
  connected,
  initialView,
}: {
  connected: boolean;
  initialView: string;
}) {
  const [view, setView] = useState(initialView);
  const [range, setRange] = useState("medium_term");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [artists, setArtists] = useState<Item[]>([]);
  const [recent, setRecent] = useState<Recent[]>([]);
  const [recentBefore, setRecentBefore] = useState<number | null>(null);
  const [total, setTotal] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [reload, setReload] = useState(0);
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [importError, setImportError] = useState("");
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importSummary, setImportSummary] = useState("");
  const [storageReady, setStorageReady] = useState(false);
  const [storageError, setStorageError] = useState("");
  const [analyticsError, setAnalyticsError] = useState("");
  const [analyticsPending, setAnalyticsPending] = useState(true);
  const [filteredCount, setFilteredCount] = useState(0);
  const [previousHours, setPreviousHours] = useState(0);
  const [stats, setStats] = useState<Analytics>(emptyAnalytics);
  const [allStats, setAllStats] = useState<Analytics>(emptyAnalytics);
  const [wrappedYear, setWrappedYear] = useState("");
  const [wrappedStats, setWrappedStats] = useState<Analytics>(emptyAnalytics);
  const [dragging, setDragging] = useState(false);
  const [period, setPeriod] = useState("daily");
  const [fromFilter, setFromFilter] = useState("");
  const [toFilter, setToFilter] = useState("");
  const [heatmapMonth, setHeatmapMonth] = useState("");
  const [search, setSearch] = useState("");
  const [slide, setSlide] = useState(0);
  const recap = useRef<HTMLDivElement>(null);
  const wrappedExperience = useRef<HTMLDivElement>(null);
  const analyticsWorker = useRef<Worker | null>(null);
  const analyticsRequest = useRef(0);
  const selectedWrappedYear = wrappedYear || allStats.years.at(-1) || "";
  const wrappedSlides = useMemo(
    () => buildWrappedSlides(wrappedStats),
    [wrappedStats],
  );
  const safeSlide = Math.min(slide, Math.max(0, wrappedSlides.length - 1));
  const activeHeatmapMonth =
    heatmapMonth &&
    (!stats.from || heatmapMonth >= stats.from.slice(0, 7)) &&
    (!stats.to || heatmapMonth <= stats.to.slice(0, 7))
      ? heatmapMonth
      : stats.from?.slice(0, 7) || allStats.from?.slice(0, 7) || "";
  useEffect(() => {
    let active = true;
    readHistory()
      .then((saved) => {
        if (active) setRows(saved);
      })
      .catch(() => {
        if (active)
          setStorageError(
            "Could not read locally saved history in this browser.",
          );
      })
      .finally(() => {
        if (active) setStorageReady(true);
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (!storageReady) return;
    const worker = new Worker(
      new URL("../workers/analytics.worker.ts", import.meta.url),
      { type: "module" },
    );
    analyticsWorker.current = worker;
    worker.onmessage = (event: MessageEvent) => {
      if (event.data.id !== analyticsRequest.current) return;
      if (event.data.error) {
        setAnalyticsError("Could not calculate analytics for this history.");
        setAnalyticsPending(false);
        return;
      }
      setStats(event.data.stats as Analytics);
      setAllStats(event.data.fullStats as Analytics);
      setWrappedStats(event.data.wrappedStats as Analytics);
      setWrappedYear(
        (value) =>
          value || (event.data.fullStats as Analytics).years.at(-1) || "",
      );
      setFilteredCount(event.data.filteredCount as number);
      setPreviousHours(event.data.previousHours as number);
      setAnalyticsError("");
      setAnalyticsPending(false);
    };
    worker.onerror = () => {
      setAnalyticsError("The analytics worker stopped unexpectedly.");
      setAnalyticsPending(false);
    };
    return () => {
      analyticsWorker.current = null;
      worker.terminate();
    };
  }, [storageReady]);
  useEffect(() => {
    analyticsWorker.current?.postMessage({ type: "set-rows", rows });
  }, [rows, storageReady]);
  useEffect(() => {
    if (!storageReady || !analyticsWorker.current) return;
    const id = ++analyticsRequest.current;
    analyticsWorker.current.postMessage({
      type: "analyze",
      id,
      from: fromFilter,
      to: toFilter,
      wrappedYear: selectedWrappedYear,
    });
  }, [rows, fromFilter, toFilter, storageReady, selectedWrappedYear]);
  useEffect(() => {
    if (view !== "Personal Wrapped") return;
    const previousFocus = document.activeElement;
    wrappedExperience.current?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "ArrowRight")
        setSlide((value) => Math.min(value + 1, wrappedSlides.length - 1));
      if (event.key === "ArrowLeft")
        setSlide((value) => Math.max(value - 1, 0));
      if (event.key === "Escape") setView("Analytics");
      if (event.key === "Tab") {
        const controls =
          wrappedExperience.current?.querySelectorAll<HTMLElement>(
            'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), [tabindex]:not([tabindex="-1"])',
          );
        if (!controls?.length) return;
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      if (previousFocus instanceof HTMLElement) previousFocus.focus();
    };
  }, [view, wrappedSlides.length]);
  useEffect(() => {
    if (!connected || view === "Analytics" || view === "Personal Wrapped")
      return;
    const controller = new AbortController();
    // Reset the loading state for a new external Spotify request.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setError("");
    const resource =
      view === "Overview"
        ? "overview"
        : view === "Artists"
          ? "artists"
          : view === "History"
            ? "history"
            : "tracks";
    const query = new URLSearchParams({ resource, range });
    fetch(`/api/spotify?${query}`, {
      signal: controller.signal,
    })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok)
          throw new Error(
            data.error +
              (data.retryAfter ? ` Retry in ${data.retryAfter} seconds.` : ""),
          );
        if (resource === "overview") {
          setProfile(data.profile);
          setArtists(data.artists ?? []);
          setItems(data.tracks ?? []);
          setRecent(data.recent ?? []);
        } else if (resource === "artists") {
          setArtists(data.items ?? []);
          setTotal(data.total ?? 0);
        } else if (resource === "history") {
          setRecent(data.items ?? []);
          setRecentBefore(
            data.cursors?.before ? Number(data.cursors.before) : null,
          );
        } else {
          setItems(data.items ?? []);
          setTotal(data.total ?? 0);
        }
      })
      .catch((reason: Error & { status?: number; retryAfter?: string }) => {
        if (reason.name !== "AbortError")
          setError(
            reason.status === 429 && reason.retryAfter
              ? `${reason.message} Retry in ${reason.retryAfter} seconds.`
              : reason.message,
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [connected, view, range, reload]);
  async function loadMore() {
    if (loadingMore) return;
    setLoadingMore(true);
    try {
      const query = new URLSearchParams({
        resource: view === "History" ? "history" : view.toLowerCase(),
        range,
      });
      if (view === "History" && recentBefore)
        query.set("before", String(recentBefore));
      else
        query.set(
          "offset",
          String(view === "Artists" ? artists.length : items.length),
        );
      const response = await fetch(`/api/spotify?${query}`);
      const data = await response.json();
      if (!response.ok)
        throw new Error(
          `${data.error ?? "Spotify could not load more data."}${data.retryAfter ? ` Retry in ${data.retryAfter} seconds.` : ""}`,
        );
      if (view === "History") {
        setRecent((current) => [...current, ...(data.items ?? [])]);
        setRecentBefore(
          data.cursors?.before ? Number(data.cursors.before) : null,
        );
      } else if (view === "Artists")
        setArtists((current) => [...current, ...(data.items ?? [])]);
      else setItems((current) => [...current, ...(data.items ?? [])]);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Spotify could not load more data.",
      );
    } finally {
      setLoadingMore(false);
    }
  }
  useEffect(() => {
    if (
      recap.current &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      const ctx = gsap.context(() =>
        gsap.from(recap.current, { opacity: 0, y: 20, duration: 0.6 }),
      );
      return () => ctx.revert();
    }
  }, [slide, view]);
  async function importFiles(files: FileList | null) {
    if (!files?.length || !storageReady) return;
    setImporting(true);
    setImportError("");
    setImportSummary("");
    setImportProgress(0);
    setAnalyticsPending(true);
    try {
      const selected = Array.from(files);
      const totalBytes = selected.reduce((sum, file) => sum + file.size, 0);
      if (totalBytes > 100 * 1024 * 1024)
        throw new Error(
          "Choose at most 100 MB per import. You can add more files in another batch.",
        );
      const imported: HistoryRow[] = [];
      const worker = new Worker(
        new URL("../workers/history.worker.ts", import.meta.url),
        { type: "module" },
      );
      try {
        for (let index = 0; index < selected.length; index++) {
          const file = selected[index];
          const parsed = await new Promise<HistoryRow[]>((resolve, reject) => {
            const id = index;
            worker.onmessage = (event: MessageEvent) => {
              if (event.data.id !== id) return;
              setImportProgress(
                Math.round(
                  (index / selected.length) * 100 +
                    (event.data.progress ?? 0) / selected.length,
                ),
              );
              if (event.data.error) reject(new Error(event.data.error));
              if (event.data.rows) resolve(event.data.rows as HistoryRow[]);
            };
            worker.onerror = () =>
              reject(new Error("History import worker failed."));
            worker.postMessage({ id, file });
          });
          for (const row of parsed) imported.push(row);
        }
      } finally {
        worker.terminate();
      }
      if (!imported.length)
        throw new Error(
          "No music listening records with positive play time were found.",
        );
      const uniqueImported = deduplicate(imported);
      const merged = deduplicate([...rows, ...uniqueImported]);
      const added = merged.length - rows.length;
      try {
        await saveHistory(uniqueImported);
        setStorageError("");
      } catch {
        setStorageError(
          "This browser could not persist history locally. Your import is available until this dashboard is closed.",
        );
      }
      setRows(merged);
      setImportProgress(100);
      setImportSummary(
        `Added ${added.toLocaleString()} new records from ${selected.length} file${selected.length === 1 ? "" : "s"}; ${imported.length - added} duplicate records skipped.`,
      );
    } catch (e) {
      setImportError(e instanceof Error ? e.message : "Import failed");
      setAnalyticsPending(false);
    } finally {
      setImporting(false);
    }
  }
  const importUI = (
    <div
      className={`import-zone${dragging ? " is-dragging" : ""}`}
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        void importFiles(event.dataTransfer.files);
      }}
    >
      <Upload size={25} />
      <h3>Bring your whole listening story.</h3>
      <p>
        Choose Spotify Extended Streaming History JSON files. Multiple files are
        combined and duplicates removed. Files are parsed in a worker and saved
        privately in this browser with IndexedDB. Times use UTC.
      </p>
      <label
        className={`button button-outline${importing || !storageReady ? " is-disabled" : ""}`}
      >
        {importing
          ? `Reading history… ${importProgress}%`
          : storageReady
            ? "Choose or drop history files"
            : "Opening local history…"}
        <input
          type="file"
          accept=".json,application/json"
          multiple
          disabled={importing || !storageReady}
          className="sr-only"
          onChange={(e) => {
            void importFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </label>
      {importing && (
        <progress
          className="import-progress"
          max={100}
          value={importProgress}
          aria-label="History import progress"
        />
      )}
      {importSummary && (
        <p className="import-summary" role="status">
          {importSummary}
        </p>
      )}
      {storageError && (
        <p className="notice error" role="alert">
          {storageError}
        </p>
      )}
      {rows.length > 0 && (
        <Button
          variant="ghost"
          onClick={() => {
            void clearHistory()
              .then(() => {
                setRows([]);
                setAnalyticsPending(true);
                setWrappedYear("");
                setImportSummary("");
                setImportError("");
                setFromFilter("");
                setToFilter("");
                setHeatmapMonth("");
              })
              .catch(() =>
                setStorageError("Could not clear locally stored history."),
              );
          }}
        >
          Clear imported history
        </Button>
      )}
      {importError && (
        <p role="alert" className="notice error">
          {importError}
        </p>
      )}
      <p>
        <a
          href="https://www.spotify.com/account/privacy/"
          target="_blank"
          rel="noreferrer"
        >
          Request your extended history from Spotify
        </a>
      </p>
    </div>
  );
  return (
    <div className="app-shell">
      <header className="app-header">
        <Brand />
        {connected ? (
          <form action="/api/auth/logout" method="post">
            <Button variant="outline" type="submit">
              Sign out
            </Button>
          </form>
        ) : (
          <Button asChild variant="outline">
            <a href="/connect">Connect Spotify</a>
          </Button>
        )}
      </header>
      <main className="app-main">
        <span className="section-kicker">YOUR LISTENING, IN FOCUS</span>
        <div className="profile-heading">
          {profile?.images?.[0]?.url && (
            <img
              src={profile.images[0].url}
              alt=""
              className="profile-avatar"
            />
          )}
          <h1>
            {profile?.display_name
              ? `${profile.display_name}’s universe.`
              : "Your music. In focus."}
          </h1>
        </div>
        <p>
          {connected
            ? "A new perspective on the music you love."
            : "Connect Spotify for your top music, or import your history to discover your patterns."}
        </p>
        <div className="app-tabs" role="tablist" aria-label="Dashboard views">
          {views.map((v) => (
            <button
              key={v}
              role="tab"
              id={`tab-${v.replaceAll(" ", "-")}`}
              aria-selected={view === v}
              aria-controls="dashboard-panel"
              onClick={() => setView(v)}
            >
              {v}
            </button>
          ))}
        </div>
        <section
          id="dashboard-panel"
          role="tabpanel"
          aria-labelledby={`tab-${view.replaceAll(" ", "-")}`}
        >
          <div className="toolbar">
            <h2>{view}</h2>
            {["Overview", "Artists", "Tracks"].includes(view) && connected && (
              <label>
                Time period{" "}
                <select
                  value={range}
                  onChange={(e) => setRange(e.target.value)}
                >
                  <option value="short_term">Last 4 weeks</option>
                  <option value="medium_term">Last 6 months</option>
                  <option value="long_term">Last 12 months</option>
                </select>
              </label>
            )}
          </div>
          {["Overview", "Artists", "Tracks", "History"].includes(view) &&
            !connected && (
              <div className="empty-state">
                <Music2 size={40} />
                <h2>Your story belongs here.</h2>
                <p>
                  Connect your account to see actual Spotify data. No sample
                  statistics are shown in your dashboard.
                </p>
                <Button asChild>
                  <a href="/connect">Connect with Spotify</a>
                </Button>
              </div>
            )}
          {loading &&
            ["Overview", "Artists", "Tracks", "History"].includes(view) && (
              <div
                className="loading-state"
                role="status"
                aria-label="Loading Spotify listening data"
              >
                <span className="sr-only">
                  Loading your listening data from Spotify.
                </span>
                <div className="skeleton skeleton-line" />
                <div className="skeleton-grid">
                  {Array.from(
                    { length: view === "Overview" ? 4 : 6 },
                    (_, index) => (
                      <div className="skeleton-card" key={index}>
                        <div className="skeleton skeleton-art" />
                        <div className="skeleton skeleton-line" />
                        <div className="skeleton skeleton-short" />
                      </div>
                    ),
                  )}
                </div>
              </div>
            )}
          {error &&
            ["Overview", "Artists", "Tracks", "History"].includes(view) && (
              <div className="notice error" role="alert">
                {error}
                <div>
                  <Button
                    variant="ghost"
                    onClick={() => setReload((v) => v + 1)}
                  >
                    Try again
                  </Button>
                  <a href="/connect">Reconnect Spotify</a>
                </div>
              </div>
            )}
          {["Overview", "Artists", "Tracks"].includes(view) &&
            connected &&
            !loading &&
            !error && (
              <>
                <p className="notice">
                  {view === "Overview"
                    ? "Your Spotify profile, top-item affinity rankings, and recently played music."
                    : "Spotify affinity rankings. These are not play counts or lifetime listening totals."}
                </p>
                {view === "Overview" && profile?.external_urls?.spotify && (
                  <p className="profile-link">
                    <a
                      href={profile.external_urls.spotify}
                      target="_blank"
                      rel="noreferrer"
                    >
                      View your Spotify profile
                    </a>
                  </p>
                )}
                {view === "Overview" ? (
                  <div className="overview-columns">
                    <RankingCards
                      title="Your top artists"
                      items={artists}
                      kind="artist"
                      onOpen={() => setView("Artists")}
                    />
                    <RankingCards
                      title="Your top tracks"
                      items={items}
                      kind="track"
                      onOpen={() => setView("Tracks")}
                    />
                  </div>
                ) : (view === "Artists" ? artists : items).length ? (
                  <>
                    <label className="ranking-search">
                      Find a {view === "Artists" ? "artist" : "track"}
                      <input
                        type="search"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder={`Search ${view.toLowerCase()}…`}
                      />
                    </label>
                    <div className="data-grid">
                      {(view === "Artists" ? artists : items)
                        .map((item, index) => ({ item, rank: index + 1 }))
                        .filter(({ item }) =>
                          `${item.name} ${item.artists?.map((artist) => artist.name).join(" ") ?? ""}`
                            .toLowerCase()
                            .includes(search.toLowerCase()),
                        )
                        .map(({ item, rank }) => (
                          <article className="data-item" key={item.id}>
                            <Artwork item={item} />
                            <small>
                              #{rank} ·{" "}
                              {view === "Artists"
                                ? "ARTIST AFFINITY"
                                : "TRACK AFFINITY"}
                            </small>
                            <h3>{item.name}</h3>
                            <p>
                              {item.artists?.map((a) => a.name).join(", ") ??
                                item.genres?.join(" · ")}
                            </p>
                            {item.album && <p>{item.album.name}</p>}
                            {item.external_urls?.spotify && (
                              <a
                                href={item.external_urls.spotify}
                                target="_blank"
                                rel="noreferrer"
                              >
                                Open in Spotify
                              </a>
                            )}
                          </article>
                        ))}
                    </div>
                    {(view === "Artists" ? artists : items).filter((item) =>
                      `${item.name} ${item.artists?.map((artist) => artist.name).join(" ") ?? ""}`
                        .toLowerCase()
                        .includes(search.toLowerCase()),
                    ).length === 0 && (
                      <p className="notice">
                        No {view.toLowerCase()} match “{search}”.
                      </p>
                    )}
                  </>
                ) : view !== "Overview" ? (
                  <div className="empty-state">
                    <h2>No rankings yet</h2>
                    <p>
                      Try another time period or come back after more listening.
                    </p>
                  </div>
                ) : null}
                {((view === "Artists" && artists.length < total) ||
                  (view === "Tracks" && items.length < total)) && (
                  <Button
                    variant="outline"
                    disabled={loadingMore}
                    onClick={() => void loadMore()}
                  >
                    {loadingMore ? "Loading…" : "Load more rankings"}
                  </Button>
                )}
                {view === "Overview" && (
                  <>
                    <div className="recent-heading">
                      <div>
                        <span className="section-kicker">
                          THE LAST FEW NOTES
                        </span>
                        <h3>Recently played</h3>
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => setView("History")}
                      >
                        Full recent history
                      </Button>
                    </div>
                    <RecentList items={recent.slice(0, 5)} />
                    <p className="data-note">
                      Spotify top items are affinity rankings, not exact stream
                      counts. Recently played is limited to activity Spotify
                      makes available.
                    </p>
                  </>
                )}
              </>
            )}
          {view === "History" && (
            <>
              {connected && !loading && !error && (
                <>
                  <p className="notice">
                    Source: Spotify recently played, up to 50 available entries.
                    This is not a complete listening history.
                  </p>
                  <RecentList items={recent} />
                  {recentBefore && (
                    <Button
                      variant="outline"
                      disabled={loadingMore}
                      onClick={() => void loadMore()}
                    >
                      {loadingMore ? "Loading…" : "Load older plays"}
                    </Button>
                  )}
                </>
              )}
              {importUI}
            </>
          )}
          {view === "Analytics" && (
            <>
              {importUI}
              {rows.length > 0 && (
                <div
                  className="date-filter"
                  aria-label="Imported history date range"
                >
                  <span>Exact imported-history range · UTC</span>
                  <label>
                    From{" "}
                    <input
                      type="date"
                      value={fromFilter}
                      min={allStats.from}
                      max={toFilter || allStats.to}
                      onChange={(event) => {
                        setAnalyticsPending(true);
                        setFromFilter(event.target.value);
                      }}
                    />
                  </label>
                  <label>
                    To{" "}
                    <input
                      type="date"
                      value={toFilter}
                      min={fromFilter || allStats.from}
                      max={allStats.to}
                      onChange={(event) => {
                        setAnalyticsPending(true);
                        setToFilter(event.target.value);
                      }}
                    />
                  </label>
                  {(fromFilter || toFilter) && (
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setAnalyticsPending(true);
                        setFromFilter("");
                        setToFilter("");
                      }}
                    >
                      Clear range
                    </Button>
                  )}
                </div>
              )}
              {analyticsError && (
                <p className="notice error" role="alert">
                  {analyticsError}
                </p>
              )}
              {analyticsPending && (
                <p className="data-note" role="status">
                  Updating your listening story…
                </p>
              )}
              {filteredCount > 0 && (
                <>
                  <p className="notice">
                    Imported records · {stats.from} to {stats.to} · UTC ·{" "}
                    {stats.plays.toLocaleString()} music records. The exact date
                    range applies only to imported history; Spotify affinity
                    periods above are separate API rankings.
                  </p>
                  <div className="metric-grid">
                    {[
                      [stats.hours, "Listening hours"],
                      [stats.plays, "Listening records"],
                      [stats.artistCount, "Artists"],
                      [stats.streak, "Longest daily streak"],
                    ].map(([v, l]) => (
                      <div className="metric" key={l}>
                        <strong>{Number(v).toLocaleString()}</strong>
                        <span>{l}</span>
                      </div>
                    ))}
                  </div>
                  <div className="insight-strip">
                    <article>
                      <span>Listening frequency</span>
                      <strong>
                        {stats.days
                          ? (stats.plays / stats.days).toFixed(1)
                          : "0"}
                      </strong>
                      <small>records per active day</small>
                    </article>
                    <article>
                      <span>Most active day</span>
                      <strong>
                        {stats.activeDays.reduce(
                          (best, day) =>
                            day.minutes > (best?.minutes ?? 0) ? day : best,
                          stats.activeDays[0],
                        )?.date ?? "—"}
                      </strong>
                      <small>by listening duration</small>
                    </article>
                    <article>
                      <span>Weekday / weekend</span>
                      <strong>
                        {stats.weekdayMinutes.toLocaleString()} /{" "}
                        {stats.weekendMinutes.toLocaleString()}
                      </strong>
                      <small>minutes · UTC</small>
                    </article>
                    <article>
                      <span>Longest session</span>
                      <strong>
                        {stats.longestSessionMinutes.toLocaleString()}
                      </strong>
                      <small>minutes · records within 30-minute gaps</small>
                    </article>
                  </div>
                  {fromFilter && toFilter && (
                    <ComparisonNote
                      currentHours={stats.hours}
                      previousHours={previousHours}
                    />
                  )}
                  <div className="toolbar">
                    <h3>Your listening rhythm</h3>
                    <select
                      aria-label="Chart interval"
                      value={period}
                      onChange={(e) => setPeriod(e.target.value)}
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>
                  <div className="chart-panel">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={
                          period === "daily"
                            ? stats.daily
                            : period === "weekly"
                              ? stats.weekly
                              : stats.monthly
                        }
                      >
                        <CartesianGrid stroke="#363e2c" vertical={false} />
                        <XAxis
                          dataKey="date"
                          tick={{ fill: "#a5af98", fontSize: 11 }}
                          minTickGap={45}
                        />
                        <YAxis tick={{ fill: "#a5af98", fontSize: 11 }} />
                        <Tooltip
                          contentStyle={{
                            background: "#20251c",
                            borderColor: "#556044",
                          }}
                        />
                        <Area
                          dataKey="minutes"
                          name="Listening minutes"
                          stroke="#c1fa69"
                          fill="#c1fa6933"
                          isAnimationActive={false}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  <h3 className="analytics-subhead">
                    Your listening year, in days
                  </h3>
                  <ListeningHeatmap
                    days={stats.activeDays}
                    month={activeHeatmapMonth}
                    minMonth={stats.from?.slice(0, 7)}
                    maxMonth={stats.to?.slice(0, 7)}
                    onMonthChange={setHeatmapMonth}
                  />
                  <label className="ranking-search">
                    Filter local rankings
                    <input
                      type="search"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Search artists, albums, or tracks…"
                    />
                  </label>
                  <div className="data-grid">
                    <Ranking
                      title="Most replayed tracks"
                      list={stats.tracks}
                      unit="records"
                      search={search}
                    />
                    <Ranking
                      title="Artist listening time"
                      list={stats.artists}
                      unit="minutes"
                      search={search}
                    />
                    <Ranking
                      title="Album listening time"
                      list={stats.albums}
                      unit="minutes"
                      search={search}
                    />
                    <Ranking
                      title="Track listening time"
                      list={stats.tracksByDuration}
                      unit="minutes"
                      search={search}
                    />
                    <Ranking
                      title="Most consistent artists · active days"
                      list={stats.artistsByDays}
                      unit="days"
                      search={search}
                    />
                    <Ranking
                      title="Tracks revisited on different days"
                      list={stats.tracksByDays}
                      unit="days"
                      search={search}
                    />
                  </div>
                  <div className="chart-duo">
                    <section>
                      <h3>Your listening clock · UTC</h3>
                      <p>
                        Distribution of recorded listening duration by hour of
                        day.
                      </p>
                      <div className="chart-panel clock-chart">
                        <ResponsiveContainer width="100%" height="100%">
                          <RadialBarChart
                            data={stats.byHour}
                            innerRadius="24%"
                            outerRadius="92%"
                            startAngle={90}
                            endAngle={-270}
                          >
                            <RadialBar
                              dataKey="minutes"
                              background={{ fill: "#252b20" }}
                              minAngle={2}
                              isAnimationActive={false}
                            >
                              {stats.byHour.map((hour) => (
                                <Cell
                                  key={hour.hour}
                                  fill={
                                    hour.hour >= 6 && hour.hour < 18
                                      ? "#c1fa69"
                                      : "#86a3d8"
                                  }
                                />
                              ))}
                            </RadialBar>
                            <Tooltip
                              formatter={(value) => [
                                `${Number(value).toFixed(0)} min`,
                                "Listening",
                              ]}
                              labelFormatter={(label) =>
                                `${String(label).padStart(2, "0")}:00 UTC`
                              }
                              contentStyle={{
                                background: "#20251c",
                                borderColor: "#556044",
                              }}
                            />
                          </RadialBarChart>
                        </ResponsiveContainer>
                      </div>
                    </section>
                    <section>
                      <h3>Listening evolution</h3>
                      <p>
                        Monthly duration across the selected imported range.
                      </p>
                      <div className="chart-panel">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={stats.monthly}>
                            <CartesianGrid stroke="#363e2c" vertical={false} />
                            <XAxis
                              dataKey="date"
                              tick={{ fill: "#a5af98", fontSize: 11 }}
                              minTickGap={25}
                            />
                            <YAxis tick={{ fill: "#a5af98", fontSize: 11 }} />
                            <Tooltip
                              formatter={(value) => [
                                `${Number(value).toLocaleString()} min`,
                                "Listening",
                              ]}
                              contentStyle={{
                                background: "#20251c",
                                borderColor: "#556044",
                              }}
                            />
                            <Line
                              type="monotone"
                              dataKey="minutes"
                              stroke="#c1fa69"
                              strokeWidth={3}
                              dot={false}
                              isAnimationActive={false}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </section>
                    {stats.artistEvolution.length > 0 && (
                      <section>
                        <h3>Artist preferences over time</h3>
                        <p>
                          Monthly listening duration for your three
                          most-listened artists.
                        </p>
                        <div className="chart-panel">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={stats.artistEvolution}>
                              <CartesianGrid
                                stroke="#363e2c"
                                vertical={false}
                              />
                              <XAxis
                                dataKey="date"
                                tick={{ fill: "#a5af98", fontSize: 11 }}
                                minTickGap={25}
                              />
                              <YAxis tick={{ fill: "#a5af98", fontSize: 11 }} />
                              <Tooltip
                                formatter={(value) => [
                                  `${Number(value).toLocaleString()} min`,
                                  "Listening",
                                ]}
                                contentStyle={{
                                  background: "#20251c",
                                  borderColor: "#556044",
                                }}
                              />
                              <Legend />
                              {stats.artists
                                .slice(0, 3)
                                .map((artist, index) => (
                                  <Line
                                    key={artist.name}
                                    type="monotone"
                                    dataKey={artist.name}
                                    stroke={
                                      ["#c1fa69", "#89b9ec", "#ed9b78"][index]
                                    }
                                    strokeWidth={2}
                                    dot={false}
                                    isAnimationActive={false}
                                  />
                                ))}
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </section>
                    )}
                  </div>
                  <h3 className="analytics-subhead">Weekday rhythm · UTC</h3>
                  <div className="chart-panel">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats.weekdays}>
                        <XAxis dataKey="day" tick={{ fill: "#a5af98" }} />
                        <YAxis tick={{ fill: "#a5af98" }} />
                        <Tooltip
                          formatter={(value) => [
                            `${Number(value).toLocaleString()} min`,
                            "Listening",
                          ]}
                          contentStyle={{
                            background: "#20251c",
                            borderColor: "#556044",
                          }}
                        />
                        <Bar
                          dataKey="minutes"
                          name="Listening minutes"
                          fill="#c1fa69"
                          isAnimationActive={false}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </>
              )}
              {rows.length > 0 && filteredCount === 0 && !analyticsError && (
                <div className="empty-state">
                  <h3>No imported records in that range</h3>
                  <p>Adjust or clear the exact UTC date filters.</p>
                </div>
              )}
            </>
          )}
          {view === "Personal Wrapped" &&
            (rows.length ? (
              analyticsPending ? (
                <p className="data-note" role="status">
                  Building your year from the history you imported…
                </p>
              ) : (
                <div
                  className="wrapped-experience"
                  ref={wrappedExperience}
                  role="dialog"
                  aria-modal="true"
                  aria-label="Personal Wrapped listening story"
                  tabIndex={-1}
                >
                  <div className="wrapped-year-picker">
                    <label htmlFor="wrapped-year">
                      Choose a year from your import
                    </label>
                    <select
                      id="wrapped-year"
                      value={selectedWrappedYear}
                      onChange={(event) => {
                        setAnalyticsPending(true);
                        setWrappedYear(event.target.value);
                        setSlide(0);
                      }}
                    >
                      {allStats.years.map((year) => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                    </select>
                  </div>
                  <p className="notice">
                    This story uses only imported records from{" "}
                    {wrappedStats.from} — {wrappedStats.to} · UTC.
                  </p>
                  <div className="wrapped-topline">
                    <span>PERSONAL WRAPPED / {selectedWrappedYear}</span>
                    <Button
                      variant="outline"
                      onClick={() => setView("Analytics")}
                    >
                      Exit story
                    </Button>
                  </div>
                  <div
                    className={`recap wrapped-slide wrapped-slide-${safeSlide % 4}`}
                    ref={recap}
                    role="group"
                    aria-live="polite"
                    aria-label={`Wrapped slide ${safeSlide + 1} of ${wrappedSlides.length}`}
                  >
                    <span>SPOTLYTICS / YOUR LISTENING STORY</span>
                    <small className="wrapped-eyebrow">
                      {wrappedSlides[safeSlide]?.eyebrow}
                    </small>
                    <h2>{wrappedSlides[safeSlide]?.title}</h2>
                    <p>{wrappedSlides[safeSlide]?.subtitle}</p>
                    {wrappedSlides[safeSlide]?.list && (
                      <ol className="wrapped-rank-list">
                        {wrappedSlides[safeSlide].list!.map((name, index) => (
                          <li key={`${name}-${index}`}>
                            <span>{String(index + 1).padStart(2, "0")}</span>
                            {name}
                          </li>
                        ))}
                      </ol>
                    )}
                    <small>
                      {safeSlide + 1} / {wrappedSlides.length}
                    </small>
                  </div>
                  <div className="wrapped-controls">
                    <Button
                      variant="outline"
                      disabled={safeSlide === 0}
                      onClick={() =>
                        setSlide((value) => Math.max(0, value - 1))
                      }
                    >
                      Previous
                    </Button>
                    <Button onClick={() => setSlide(0)}>Replay story</Button>
                    <Button
                      onClick={() =>
                        downloadRecap(wrappedSlides[safeSlide], safeSlide)
                      }
                    >
                      <Download size={16} /> Save recap image
                    </Button>
                    <Button
                      variant="outline"
                      disabled={safeSlide === wrappedSlides.length - 1}
                      onClick={() =>
                        setSlide((value) =>
                          Math.min(wrappedSlides.length - 1, value + 1),
                        )
                      }
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )
            ) : (
              <div className="empty-state">
                <Disc3 size={45} />
                <h2>A recap that’s actually yours.</h2>
                <p>
                  Import your extended history to reveal your listening hours,
                  favorite artist, most replayed track, and longest streak.
                </p>
                <Button onClick={() => setView("Analytics")}>
                  Import your history
                </Button>
              </div>
            ))}
        </section>
      </main>
    </div>
  );
}
function RankingCards({
  title,
  items,
  kind,
  onOpen,
}: {
  title: string;
  items: Item[];
  kind: "artist" | "track";
  onOpen: () => void;
}) {
  return (
    <section className="ranking-panel">
      <div className="ranking-panel-heading">
        <h3>{title}</h3>
        <button className="text-button" onClick={onOpen}>
          Explore all
        </button>
      </div>
      {items.slice(0, 5).map((item, index) => {
        const content = (
          <>
            <span className="rank-number">
              {String(index + 1).padStart(2, "0")}
            </span>
            <Artwork item={item} />
            <span className="ranking-copy">
              <strong>{item.name}</strong>
              <small>
                {kind === "artist"
                  ? item.genres?.slice(0, 2).join(" · ") || "Artist"
                  : item.artists?.map((artist) => artist.name).join(", ")}
              </small>
            </span>
            {item.external_urls?.spotify && (
              <span aria-hidden="true" className="ranking-open">
                ↗
              </span>
            )}
          </>
        );
        return item.external_urls?.spotify ? (
          <a
            className="ranking-row"
            href={item.external_urls.spotify}
            target="_blank"
            rel="noreferrer"
            key={item.id}
          >
            {content}
          </a>
        ) : (
          <div className="ranking-row" key={item.id}>
            {content}
          </div>
        );
      })}
    </section>
  );
}

function RecentList({ items }: { items: Recent[] }) {
  if (!items.length)
    return (
      <div className="recent-empty">No recent plays are available yet.</div>
    );
  return (
    <ul className="recent-list">
      {items.map((entry, index) => (
        <li key={`${entry.played_at}-${index}`}>
          <Artwork item={entry.track} />
          <span>
            <strong>{entry.track.name}</strong>
            <small>
              {entry.track.artists?.map((artist) => artist.name).join(", ")} ·{" "}
              {entry.track.album?.name}
            </small>
          </span>
          <time dateTime={entry.played_at}>
            {new Date(entry.played_at).toLocaleString(undefined, {
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
          </time>
          {entry.track.external_urls?.spotify && (
            <a
              href={entry.track.external_urls.spotify}
              target="_blank"
              rel="noreferrer"
              aria-label={`Open ${entry.track.name} in Spotify`}
            >
              ↗
            </a>
          )}
        </li>
      ))}
    </ul>
  );
}

function Artwork({ item }: { item: Item }) {
  const src = item.images?.[0]?.url ?? item.album?.images?.[0]?.url;
  return src ? (
    <img src={src} alt={item.name} loading="lazy" />
  ) : (
    <div className="empty-state">
      <Disc3 size={40} />
    </div>
  );
}
function Ranking({
  title,
  list,
  unit,
  search,
}: {
  title: string;
  list: { name: string; value: number; key?: string; spotifyUri?: string }[];
  unit: string;
  search?: string;
}) {
  const filtered = list.filter((item) =>
    item.name.toLowerCase().includes((search ?? "").toLowerCase()),
  );
  return (
    <article className="data-item">
      <h3>{title}</h3>
      <ol className="rank-list">
        {filtered.slice(0, 5).map((r) => (
          <li key={r.key ?? r.name}>
            <span>{r.name}</span>
            <small>
              {Math.round(
                unit === "minutes" ? r.value / 60000 : r.value,
              ).toLocaleString()}{" "}
              {unit}
            </small>
            {r.spotifyUri && spotifyTrackUrl(r.spotifyUri) && (
              <a
                href={spotifyTrackUrl(r.spotifyUri)}
                target="_blank"
                rel="noreferrer"
                aria-label={`Open ${r.name} in Spotify`}
              >
                Open
              </a>
            )}
          </li>
        ))}
      </ol>
      {!filtered.length && (
        <p>
          {list.length
            ? "No matches for that filter."
            : "No data is available."}
        </p>
      )}
    </article>
  );
}
function spotifyTrackUrl(uri: string) {
  const match = /^spotify:track:([A-Za-z0-9]+)$/.exec(uri);
  return match ? `https://open.spotify.com/track/${match[1]}` : undefined;
}
function ComparisonNote({
  currentHours,
  previousHours,
}: {
  currentHours: number;
  previousHours: number;
}) {
  if (!previousHours) return null;
  const change = Math.round(
    ((currentHours - previousHours) / previousHours) * 100,
  );
  return (
    <p className="comparison-note">
      Compared with the same-length prior range:{" "}
      <strong>
        {change > 0 ? "+" : ""}
        {change}%
      </strong>{" "}
      listening time ({previousHours.toLocaleString()} prior hours).
    </p>
  );
}

function ListeningHeatmap({
  days,
  month,
  minMonth,
  maxMonth,
  onMonthChange,
}: {
  days: { date: string; minutes: number }[];
  month: string;
  minMonth?: string;
  maxMonth?: string;
  onMonthChange: (month: string) => void;
}) {
  if (!month) return null;
  const date = new Date(`${month}-01T00:00:00Z`);
  const first = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1),
  );
  const daysInMonth = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0),
  ).getUTCDate();
  const sums = new Map(days.map((day) => [day.date, day.minutes]));
  const shiftMonth = (amount: number) => {
    const next = new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + amount, 1),
    );
    onMonthChange(next.toISOString().slice(0, 7));
  };
  return (
    <section className="heatmap-panel" aria-label="Listening activity calendar">
      <div className="heatmap-heading">
        <div>
          <span className="section-kicker">ACTIVITY CALENDAR</span>
          <h3>
            {date.toLocaleDateString("en", {
              month: "long",
              year: "numeric",
              timeZone: "UTC",
            })}
          </h3>
        </div>
        <div className="heatmap-nav">
          <Button
            variant="outline"
            aria-label="Previous month"
            disabled={Boolean(minMonth && month <= minMonth)}
            onClick={() => shiftMonth(-1)}
          >
            ←
          </Button>
          <Button
            variant="outline"
            aria-label="Next month"
            disabled={Boolean(maxMonth && month >= maxMonth)}
            onClick={() => shiftMonth(1)}
          >
            →
          </Button>
        </div>
      </div>
      <div className="heatmap-weekdays" aria-hidden="true">
        {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => (
          <span key={`${day}-${index}`}>{day}</span>
        ))}
      </div>
      <ol className="heatmap-days">
        {Array.from({ length: daysInMonth }, (_, index) => {
          const day = index + 1;
          const key = `${month}-${String(day).padStart(2, "0")}`;
          const minutes = Math.round((sums.get(key) ?? 0) / 60_000);
          const level =
            minutes === 0
              ? 0
              : minutes < 15
                ? 1
                : minutes < 45
                  ? 2
                  : minutes < 120
                    ? 3
                    : 4;
          return (
            <li
              key={key}
              className={`heatmap-day level-${level}`}
              style={{
                gridColumn: Math.floor((first.getUTCDay() + index) / 7) + 1,
                gridRow: ((first.getUTCDay() + index) % 7) + 1,
              }}
              title={`${key}: ${minutes.toLocaleString()} listening minutes`}
              aria-label={`${key}: ${minutes.toLocaleString()} listening minutes`}
              tabIndex={0}
            >
              <span>{day}</span>
            </li>
          );
        })}
      </ol>
      <div className="heatmap-legend">
        <span>Less</span>
        {[0, 1, 2, 3, 4].map((level) => (
          <i key={level} className={`level-${level}`} />
        ))}
        <span>More · listening minutes</span>
      </div>
    </section>
  );
}

type WrappedSlide = {
  eyebrow: string;
  title: string;
  subtitle: string;
  list?: string[];
};

function buildWrappedSlides(stats: Analytics): WrappedSlide[] {
  const artists = stats.artists.filter(
    (artist) => artist.name !== "Unknown artist",
  );
  const tracks = stats.tracks;
  const hour = [...stats.byHour].sort((a, b) => b.minutes - a.minutes)[0];
  const month = stats.mostActiveMonth;
  const slides: WrappedSlide[] = [
    {
      eyebrow: "A PERSONAL LISTENING ARCHIVE",
      title: `${stats.from?.slice(0, 4) ?? "Your"} in music.`,
      subtitle: `A story shaped by ${stats.plays.toLocaleString()} recorded listening moments, from ${stats.from} through ${stats.to}.`,
    },
    {
      eyebrow: "TIME WELL SPENT",
      title: `${stats.hours.toLocaleString()} hours.`,
      subtitle: `That is ${stats.minutes.toLocaleString()} minutes across ${stats.days.toLocaleString()} active days in the imported history.`,
    },
  ];
  if (artists[0])
    slides.push({
      eyebrow: "THE ARTIST YOU RETURNED TO",
      title: artists[0].name,
      subtitle: `${Math.round(artists[0].value / 60_000).toLocaleString()} minutes of recorded listening. Ranked by actual imported duration.`,
    });
  if (artists.length)
    slides.push({
      eyebrow: "FIVE NAMES IN YOUR ORBIT",
      title: "Your top artists.",
      subtitle: "Ranked by listening duration in the records you imported.",
      list: artists.slice(0, 5).map((artist) => artist.name),
    });
  if (tracks[0])
    slides.push({
      eyebrow: "THE TRACK ON REPEAT",
      title: tracks[0].name.split(" · ")[0],
      subtitle: `${tracks[0].value.toLocaleString()} listening records. A record is not necessarily a completed play.`,
    });
  if (tracks.length)
    slides.push({
      eyebrow: "FIVE TRACKS THAT STAYED",
      title: "Your top tracks.",
      subtitle: "Ordered by listening records, based only on imported history.",
      list: tracks.slice(0, 5).map((track) => track.name.split(" · ")[0]),
    });
  if (hour && hour.minutes > 0)
    slides.push({
      eyebrow: "WHEN THE MUSIC FOUND YOU",
      title: `${String(hour.hour).padStart(2, "0")}:00`,
      subtitle: `Your favorite listening hour in UTC, with ${Math.round(hour.minutes).toLocaleString()} recorded minutes.`,
    });
  if (month)
    slides.push({
      eyebrow: "A MONTH THAT SOUNDED LIKE YOU",
      title: new Date(`${month}-01T00:00:00Z`).toLocaleDateString("en", {
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      }),
      subtitle: "Your most active month by recorded listening duration.",
    });
  const obsession = tracks[0];
  if (obsession)
    slides.push({
      eyebrow: "THE OBSESSION",
      title: obsession.name.split(" · ")[0],
      subtitle: `Revisited across ${stats.tracksByDays.find((track) => track.key === obsession.key)?.value ?? 1} different days. ${stats.longestSessionMinutes.toLocaleString()} minutes was your longest listening session.`,
    });
  slides.push({
    eyebrow: "THE LAST NOTE",
    title: `${stats.artistCount} artists. ${stats.trackCount} tracks.`,
    subtitle: `${stats.hours.toLocaleString()} hours across ${stats.days} active days. This is the story of the history you shared, not an estimate of everything you have ever played.`,
  });
  return slides;
}

function downloadRecap(content: WrappedSlide, index: number) {
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1350;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const colors = ["#c1fa69", "#d2d7f5", "#f1a681", "#b3c5a0"];
  const background = colors[index % colors.length];
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, 1080, 1350);
  ctx.globalAlpha = 0.16;
  ctx.fillStyle = index % 2 ? "#7557e8" : "#ef7757";
  ctx.beginPath();
  ctx.arc(900, 380, 310, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = "#19230f";
  ctx.font = "bold 26px Arial";
  ctx.fillText("SPOTLYTICS / YOUR LISTENING STORY", 70, 110);
  ctx.font = "bold 25px Arial";
  ctx.fillText(content.eyebrow.toUpperCase(), 70, 250);
  ctx.font = "bold 82px Arial";
  let y = 420;
  let line = "";
  for (const word of content.title.split(" ")) {
    if (ctx.measureText(line + word).width > 920) {
      ctx.fillText(line, 70, y);
      y += 95;
      line = "";
    }
    line += word + " ";
  }
  ctx.fillText(line, 70, y);
  ctx.font = "30px Arial";
  y += 120;
  line = "";
  for (const word of content.subtitle.split(" ")) {
    if (ctx.measureText(line + word).width > 920) {
      ctx.fillText(line, 70, y);
      y += 45;
      line = "";
    }
    line += word + " ";
  }
  ctx.fillText(line, 70, y);
  ctx.font = "24px Arial";
  if (content.list?.length) {
    ctx.font = "bold 28px Arial";
    content.list.forEach((name, position) =>
      ctx.fillText(
        `${String(position + 1).padStart(2, "0")}   ${name}`,
        70,
        850 + position * 58,
      ),
    );
  }
  ctx.font = "24px Arial";
  ctx.fillText("Made from your imported history · spotlytics", 70, 1230);
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `spotlytics-wrapped-${index + 1}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
}
