import { z } from "zod";
import { historyKey } from "./history-key";

// Spotify extended-history export rows. Optional fields vary between export generations.
export const historyRow = z
  .object({
    ts: z.string().datetime({ offset: true }),
    ms_played: z.number().finite().nonnegative().max(86_400_000),
    master_metadata_track_name: z.string().nullable().optional(),
    master_metadata_album_artist_name: z.string().nullable().optional(),
    master_metadata_album_album_name: z.string().nullable().optional(),
    spotify_track_uri: z.string().nullable().optional(),
    spotify_episode_uri: z.string().nullable().optional(),
    reason_start: z.string().nullable().optional(),
    reason_end: z.string().nullable().optional(),
    shuffle: z.boolean().nullable().optional(),
    skipped: z.boolean().nullable().optional(),
  })
  .passthrough();
export type HistoryRow = z.infer<typeof historyRow>;

export function parseHistory(input: unknown) {
  if (!Array.isArray(input)) throw new Error("History must be a JSON array.");
  if (input.length > 1_000_000)
    throw new Error("History files are limited to one million records.");
  const parsed: HistoryRow[] = [];
  for (const value of input) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      historyRow.parse(value);
      continue;
    }
    const row = value as Record<string, unknown>;
    const parsedRow = historyRow.parse({
      ...row,
      ts: row.ts ?? row.timestamp ?? row.endTime,
      ms_played: row.ms_played ?? row.msPlayed,
      master_metadata_track_name:
        row.master_metadata_track_name ?? row.track_name ?? row.trackName,
      master_metadata_album_artist_name:
        row.master_metadata_album_artist_name ??
        row.artist_name ??
        row.artistName,
      master_metadata_album_album_name:
        row.master_metadata_album_album_name ?? row.album_name ?? row.albumName,
      spotify_track_uri: row.spotify_track_uri ?? row.track_uri ?? row.trackUri,
    });
    const normalized = { ...parsedRow, ts: new Date(parsedRow.ts).toISOString() };
    if (
      normalized.master_metadata_track_name &&
      !normalized.spotify_episode_uri &&
      normalized.ms_played > 0
    )
      parsed.push(normalized);
  }
  return parsed;
}

export function deduplicate(rows: HistoryRow[]) {
  const unique = new Map<string, HistoryRow>();
  for (const row of rows) unique.set(historyKey(row), row);
  return [...unique.values()];
}

export function filterHistory(rows: HistoryRow[], from?: string, to?: string) {
  const start = from ? Date.parse(`${from}T00:00:00.000Z`) : -Infinity;
  const end = to ? Date.parse(`${to}T23:59:59.999Z`) : Infinity;
  return rows.filter((row) => {
    const time = Date.parse(row.ts);
    return time >= start && time <= end;
  });
}

export function aggregate(rows: HistoryRow[]) {
  let ms = 0;
  const days = new Map<string, number>();
  const years = new Set<string>();
  const artists = new Map<string, number>();
  const artistDays = new Map<string, Set<string>>();
  const albums = new Map<string, number>();
  const tracks = new Map<string, number>();
  const trackLabels = new Map<string, string>();
  const trackUris = new Map<string, string>();
  const trackDuration = new Map<string, number>();
  const trackDays = new Map<string, Set<string>>();
  const artistsByMonth = new Map<string, Map<string, number>>();
  const hours = Array.from({ length: 24 }, (_, hour) => ({ hour, minutes: 0 }));
  const weekdays = Array.from({ length: 7 }, (_, i) => ({
    day: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][i],
    minutes: 0,
  }));
  const sortedRows = [...rows].sort(
    (a, b) => Date.parse(a.ts) - Date.parse(b.ts),
  );
  let sessionEnd = 0;
  let sessionDuration = 0;
  let longestSession = 0;

  for (const row of sortedRows) {
    const time = Date.parse(row.ts);
    const date = new Date(time);
    const day = date.toISOString().slice(0, 10);
    years.add(day.slice(0, 4));
    const artist = row.master_metadata_album_artist_name ?? "Unknown artist";
    const track = `${row.master_metadata_track_name ?? "Unknown track"} · ${artist}`;
    ms += row.ms_played;
    days.set(day, (days.get(day) ?? 0) + row.ms_played);
    if (row.master_metadata_album_artist_name) {
      artists.set(artist, (artists.get(artist) ?? 0) + row.ms_played);
      if (!artistDays.has(artist)) artistDays.set(artist, new Set());
      artistDays.get(artist)!.add(day);
    }
    if (row.master_metadata_album_album_name) {
      const album = `${row.master_metadata_album_album_name} · ${artist}`;
      albums.set(album, (albums.get(album) ?? 0) + row.ms_played);
    }
    const trackKey = row.spotify_track_uri || track;
    trackLabels.set(trackKey, track);
    if (row.spotify_track_uri) trackUris.set(trackKey, row.spotify_track_uri);
    tracks.set(trackKey, (tracks.get(trackKey) ?? 0) + 1);
    trackDuration.set(
      trackKey,
      (trackDuration.get(trackKey) ?? 0) + row.ms_played,
    );
    if (!trackDays.has(trackKey)) trackDays.set(trackKey, new Set());
    trackDays.get(trackKey)!.add(day);
    if (row.master_metadata_album_artist_name) {
      const month = day.slice(0, 7);
      if (!artistsByMonth.has(month)) artistsByMonth.set(month, new Map());
      const monthArtists = artistsByMonth.get(month)!;
      monthArtists.set(artist, (monthArtists.get(artist) ?? 0) + row.ms_played);
    }
    hours[date.getUTCHours()].minutes += row.ms_played / 60_000;
    weekdays[date.getUTCDay()].minutes += row.ms_played / 60_000;
    const playStart = time - row.ms_played;
    if (sessionEnd && playStart - sessionEnd > 30 * 60_000) {
      longestSession = Math.max(longestSession, sessionDuration);
      sessionDuration = 0;
    }
    sessionDuration += row.ms_played;
    sessionEnd = Math.max(sessionEnd, time);
  }
  longestSession = Math.max(longestSession, sessionDuration);

  const sortedDays = [...days.keys()].sort();
  let streak = 0;
  let best = 0;
  let previous = 0;
  for (const day of sortedDays) {
    const time = Date.parse(`${day}T00:00:00Z`);
    streak = time - previous === 86_400_000 ? streak + 1 : 1;
    best = Math.max(best, streak);
    previous = time;
  }
  const rank = (map: Map<string, number>) =>
    [...map]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name));
  const rankTracks = (map: Map<string, number>) =>
    [...map]
      .map(([key, value]) => ({
        key,
        name: trackLabels.get(key) ?? key,
        value,
        spotifyUri: trackUris.get(key),
      }))
      .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name));
  const monthly = new Map<string, number>();
  const weekly = new Map<string, number>();
  for (const [day, value] of days) {
    monthly.set(day.slice(0, 7), (monthly.get(day.slice(0, 7)) ?? 0) + value);
    const weekDate = new Date(`${day}T00:00:00Z`);
    weekDate.setUTCDate(
      weekDate.getUTCDate() - ((weekDate.getUTCDay() + 6) % 7),
    );
    const week = weekDate.toISOString().slice(0, 10);
    weekly.set(week, (weekly.get(week) ?? 0) + value);
  }
  const series = (map: Map<string, number>) =>
    [...map]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, value]) => ({ date, minutes: Math.round(value / 60_000) }));
  const activeDays = sortedDays.map((date) => ({
    date,
    minutes: Math.round((days.get(date) ?? 0) / 60_000),
  }));
  const weekendMinutes = weekdays[0].minutes + weekdays[6].minutes;
  const weekdayMinutes = weekdays
    .slice(1, 6)
    .reduce((sum, day) => sum + day.minutes, 0);
  const topArtistNames = rank(artists)
    .slice(0, 3)
    .map((artist) => artist.name);
  const artistEvolution = [...artistsByMonth]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, monthArtists]) => ({
      date,
      ...Object.fromEntries(
        topArtistNames.map((name) => [
          name,
          Math.round((monthArtists.get(name) ?? 0) / 60_000),
        ]),
      ),
    }));

  return {
    minutes: Math.round(ms / 60_000),
    hours: Math.round((ms / 3_600_000) * 10) / 10,
    plays: rows.length,
    artistCount: artists.size,
    trackCount: tracks.size,
    days: days.size,
    years: [...years].sort(),
    streak: best,
    longestSessionMinutes: Math.round(longestSession / 60_000),
    averageRecordMinutes: rows.length
      ? Math.round((ms / rows.length / 60_000) * 10) / 10
      : 0,
    artists: rank(artists),
    artistsByDays: [...artistDays]
      .map(([name, activeDays]) => ({ name, value: activeDays.size }))
      .sort((a, b) => b.value - a.value),
    albums: rank(albums),
    tracks: rankTracks(tracks),
    tracksByDuration: rankTracks(trackDuration),
    tracksByDays: [...trackDays]
      .map(([key, activeDays]) => ({
        key,
        name: trackLabels.get(key) ?? key,
        value: activeDays.size,
        spotifyUri: trackUris.get(key),
      }))
      .sort((a, b) => b.value - a.value),
    daily: series(days),
    weekly: series(weekly),
    monthly: series(monthly),
    artistEvolution,
    activeDays,
    byHour: hours,
    weekdays,
    weekdayMinutes: Math.round(weekdayMinutes),
    weekendMinutes: Math.round(weekendMinutes),
    mostActiveMonth: [...monthly].sort((a, b) => b[1] - a[1])[0]?.[0],
    from: sortedDays[0],
    to: sortedDays.at(-1),
  };
}

export type Analytics = ReturnType<typeof aggregate>;
