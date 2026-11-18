import test from "node:test";
import assert from "node:assert/strict";
import {
  aggregate,
  deduplicate,
  filterHistory,
  parseHistory,
} from "../src/lib/analytics";
const row = (ts: string, ms = 60000) => ({
  ts,
  ms_played: ms,
  master_metadata_track_name: "Track",
  master_metadata_album_artist_name: "Artist",
  master_metadata_album_album_name: "Album",
});
test("totals, UTC intervals, rankings and streaks derive from records", () => {
  const s = aggregate(
    parseHistory([
      row("2026-01-01T23:00:00Z"),
      row("2026-01-02T01:00:00Z", 120000),
      row("2026-01-04T01:00:00Z"),
    ]),
  );
  assert.equal(s.minutes, 4);
  assert.equal(s.streak, 2);
  assert.equal(s.tracks[0].value, 3);
  assert.equal(s.artists[0].value, 240000);
  assert.equal(s.monthly[0].minutes, 4);
  assert.equal(s.byHour[1].minutes, 3);
});
test("overlapping files deduplicate and non-music records are excluded", () => {
  const r = row("2026-01-01T00:00:00Z");
  assert.equal(deduplicate([r, r]).length, 1);
  assert.equal(
    parseHistory([
      { ...r, master_metadata_track_name: null },
      row("2026-01-02T00:00:00Z", 0),
    ]).length,
    0,
  );
});
test("invalid timestamps and negative durations fail validation", () => {
  assert.throws(() => parseHistory([row("invalid")]));
  assert.throws(() => parseHistory([row("2026-01-01T00:00:00Z", -1)]));
});
test("empty data never invents listening statistics", () => {
  const s = aggregate([]);
  assert.equal(s.hours, 0);
  assert.equal(s.streak, 0);
  assert.equal(s.from, undefined);
});

test("offset timestamps group by UTC date", () => {
  const s = aggregate(parseHistory([row("2026-01-02T01:00:00+03:00")]));
  assert.equal(s.from, "2026-01-01");
  assert.equal(s.byHour[22].minutes, 1);
});

test("offset-equivalent timestamps deduplicate after normalization", () => {
  const normalized = parseHistory([
    row("2026-01-02T01:00:00+01:00"),
    row("2026-01-02T00:00:00Z"),
  ]);
  assert.equal(normalized[0].ts, "2026-01-02T00:00:00.000Z");
  assert.equal(deduplicate(normalized).length, 1);
});

test("Spotify track URIs distinguish same-named recordings in unique counts", () => {
  const rows = parseHistory([
    { ...row("2026-01-01T10:00:00Z"), spotify_track_uri: "spotify:track:one" },
    { ...row("2026-01-01T11:00:00Z"), spotify_track_uri: "spotify:track:two" },
  ]);
  const stats = aggregate(rows);
  assert.equal(stats.trackCount, 2);
  assert.equal(stats.tracks.length, 2);
  assert.equal(stats.tracks[0].name, stats.tracks[1].name);
  assert.notEqual(stats.tracks[0].key, stats.tracks[1].key);
  assert.equal(stats.tracks[0].spotifyUri, "spotify:track:one");
});

test("normalizes older export field names and omits rows missing track metadata", () => {
  const normalized = parseHistory([
    {
      endTime: "2026-01-01T00:00:00Z",
      msPlayed: 90000,
      trackName: "Older Track",
      artistName: "Older Artist",
      albumName: "Older Album",
    },
    { ts: "2026-01-02T00:00:00Z", ms_played: 1000 },
  ]);
  assert.equal(normalized.length, 1);
  assert.equal(normalized[0].master_metadata_track_name, "Older Track");
  assert.equal(
    aggregate(normalized).albums[0].name,
    "Older Album · Older Artist",
  );
});

test("date range filters use exact UTC day boundaries", () => {
  const rows = parseHistory([
    row("2026-01-01T23:59:59Z"),
    row("2026-01-02T00:00:00Z"),
    row("2026-01-03T00:00:00Z"),
  ]);
  assert.equal(filterHistory(rows, "2026-01-02", "2026-01-02").length, 1);
});

test("reports sessions and active-day patterns from imported timestamps", () => {
  const rows = parseHistory([
    row("2026-01-01T10:00:00Z", 60000),
    row("2026-01-01T10:03:00Z", 120000),
    row("2026-01-02T10:00:00Z", 60000),
  ]);
  const stats = aggregate(rows);
  assert.equal(stats.longestSessionMinutes, 3);
  assert.equal(stats.tracksByDays[0].value, 2);
  assert.equal(stats.weekdayMinutes, 4);
  assert.equal(stats.weekendMinutes, 0);
});
