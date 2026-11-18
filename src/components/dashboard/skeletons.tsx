import { Disc3 } from "lucide-react";

function Bone({ className = "" }: { className?: string }) {
  return <span className={`skeleton ${className}`} aria-hidden="true" />;
}

function Status({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="skeleton-status" role="status">
      <span className="sr-only">{label}</span>
      <div aria-hidden="true">{children}</div>
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <Status label="Loading Spotify profile">
      <div className="profile-skeleton">
        <Bone className="skeleton-avatar" />
        <Bone className="skeleton-profile-title" />
      </div>
    </Status>
  );
}

export function RankingPanelSkeleton({ title }: { title: string }) {
  return (
    <Status label={`Loading ${title.toLowerCase()}`}>
      <section className="ranking-panel ranking-panel-skeleton">
        <div className="ranking-panel-heading">
          <Bone className="skeleton-heading" />
          <Bone className="skeleton-action" />
        </div>
        {Array.from({ length: 5 }, (_, index) => (
          <div className="ranking-row" key={index}>
            <Bone className="skeleton-rank" />
            <Bone className="skeleton-ranking-art" />
            <span className="skeleton-ranking-copy">
              <Bone className="skeleton-ranking-name" />
              <Bone className="skeleton-ranking-meta" />
            </span>
          </div>
        ))}
      </section>
    </Status>
  );
}

export function RankingGridSkeleton({ kind, cards = 6 }: { kind: "artist" | "track"; cards?: number }) {
  return (
    <Status label={`Loading Spotify ${kind} rankings`}>
      <div className="data-grid ranking-grid-skeleton">
        {Array.from({ length: cards }, (_, index) => (
          <article className="data-item" key={index}>
            <Bone className="skeleton-artwork" />
            <Bone className="skeleton-affinity" />
            <Bone className="skeleton-card-title" />
            <Bone className="skeleton-card-meta" />
            {kind === "track" && <Bone className="skeleton-card-meta skeleton-album" />}
          </article>
        ))}
      </div>
    </Status>
  );
}

export function RecentListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <Status label="Loading recently played music">
      <ul className="recent-list recent-list-skeleton">
        {Array.from({ length: rows }, (_, index) => (
          <li key={index}>
            <Bone className="skeleton-recent-art" />
            <span className="skeleton-recent-copy">
              <Bone className="skeleton-recent-title" />
              <Bone className="skeleton-recent-meta" />
            </span>
            <Bone className="skeleton-time" />
            <span className="skeleton-link" />
          </li>
        ))}
      </ul>
    </Status>
  );
}

export function AnalyticsSkeleton({ label = "Preparing your listening analytics" }: { label?: string }) {
  return (
    <Status label={label}>
      <div className="analytics-skeleton">
        <div className="metric-grid">
          {Array.from({ length: 4 }, (_, index) => (
            <div className="metric" key={index}>
              <Bone className="skeleton-metric-value" />
              <Bone className="skeleton-metric-label" />
            </div>
          ))}
        </div>
        <div className="chart-panel chart-skeleton chart-skeleton-area">
          <div className="chart-skeleton-grid" />
          <svg className="chart-skeleton-line" viewBox="0 0 1000 300" preserveAspectRatio="none">
            <path className="chart-skeleton-area-fill" d="M0 258 C80 245 90 180 170 198 S275 230 350 162 S455 210 520 142 S620 180 690 104 S820 165 890 72 S960 108 1000 42 L1000 300 L0 300 Z" />
            <path className="chart-skeleton-area-stroke" d="M0 258 C80 245 90 180 170 198 S275 230 350 162 S455 210 520 142 S620 180 690 104 S820 165 890 72 S960 108 1000 42" />
          </svg>
        </div>
        <div className="heatmap-panel heatmap-skeleton">
          <div className="heatmap-heading"><Bone className="skeleton-heading" /></div>
          <div className="heatmap-weekdays">
            {Array.from({ length: 7 }, (_, index) => <Bone key={index} className="skeleton-weekday" />)}
          </div>
          <div className="heatmap-days">
            {Array.from({ length: 35 }, (_, index) => <Bone key={index} className="skeleton-heat-cell" />)}
          </div>
        </div>
        <div className="data-grid analytics-ranking-skeleton">
          {Array.from({ length: 3 }, (_, index) => (
            <div className="data-item" key={index}>
              <Bone className="skeleton-heading" />
              {Array.from({ length: 4 }, (_, row) => (
                <div className="analytics-rank-row" key={row}>
                  <Bone className="skeleton-ranking-name" />
                  <Bone className="skeleton-rank-value" />
                </div>
              ))}
            </div>
          ))}
        </div>
        <div className="chart-duo chart-duo-skeleton">
          <div className="chart-panel chart-skeleton chart-skeleton-radial">
            <Bone className="chart-skeleton-donut" />
          </div>
          <div className="chart-panel chart-skeleton chart-skeleton-area">
            <div className="chart-skeleton-grid" />
            <svg className="chart-skeleton-line" viewBox="0 0 1000 300" preserveAspectRatio="none">
              <path className="chart-skeleton-area-stroke" d="M0 230 C100 212 130 128 220 164 S350 210 440 124 S540 90 630 145 S760 205 850 92 S940 80 1000 44" />
            </svg>
          </div>
        </div>
        <div className="chart-panel chart-skeleton chart-skeleton-bars">
          <div className="chart-skeleton-grid" />
          <div className="chart-skeleton-bar-set">
            {Array.from({ length: 7 }, (_, index) => <Bone className="chart-skeleton-bar" key={index} />)}
          </div>
        </div>
      </div>
    </Status>
  );
}

export function WrappedSkeleton() {
  return (
    <Status label="Preparing your personal listening story">
      <div className="wrapped-skeleton">
        <div className="wrapped-skeleton-orbit">
          <Disc3 size={44} strokeWidth={0.8} />
        </div>
        <Bone className="wrapped-skeleton-kicker" />
        <Bone className="wrapped-skeleton-title" />
        <Bone className="wrapped-skeleton-copy" />
      </div>
    </Status>
  );
}
