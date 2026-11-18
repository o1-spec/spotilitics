import {
  aggregate,
  filterHistory,
  type Analytics,
  type HistoryRow,
} from "../lib/analytics";

type Query = { from: string; to: string; wrappedYear: string; id: number };
let rows: HistoryRow[] = [];
let fullStats: Analytics = aggregate([]);
let query: Query = { from: "", to: "", wrappedYear: "", id: 0 };

function analyze() {
  try {
    const filtered = filterHistory(
      rows,
      query.from || undefined,
      query.to || undefined,
    );
    const stats = query.from || query.to ? aggregate(filtered) : fullStats;
    const effectiveWrappedYear =
      query.wrappedYear || fullStats.years.at(-1) || "";
    const wrappedStats = effectiveWrappedYear
      ? aggregate(
          filterHistory(
            rows,
            `${effectiveWrappedYear}-01-01`,
            `${effectiveWrappedYear}-12-31`,
          ),
        )
      : fullStats;
    let previousHours = 0;
    if (query.from && query.to) {
      const start = Date.parse(`${query.from}T00:00:00Z`);
      const end = Date.parse(`${query.to}T23:59:59.999Z`);
      const duration = end - start + 1;
      const previousFrom = new Date(start - duration).toISOString().slice(0, 10);
      const previousTo = new Date(start - 1).toISOString().slice(0, 10);
      previousHours = aggregate(
        filterHistory(rows, previousFrom, previousTo),
      ).hours;
    }
    self.postMessage({
      id: query.id,
      stats,
      fullStats,
      wrappedStats,
      filteredCount: filtered.length,
      previousHours,
    });
  } catch (error) {
    self.postMessage({
      id: query.id,
      error:
        error instanceof Error ? error.message : "Analytics calculation failed.",
    });
  }
}

self.addEventListener("message", (event: MessageEvent) => {
  if (event.data.type === "set-rows") {
    rows = event.data.rows as HistoryRow[];
    fullStats = aggregate(rows);
    return;
  }
  if (event.data.type === "analyze") {
    query = { ...event.data, id: event.data.id as number } as Query;
    analyze();
  }
});
