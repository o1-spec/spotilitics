import type { HistoryRow } from "./analytics";

/** Stable identity shared by import deduplication and the local store. */
export function historyKey(row: HistoryRow) {
  return JSON.stringify([
    row.ts,
    row.spotify_track_uri ?? "",
    row.master_metadata_track_name ?? "",
    row.master_metadata_album_artist_name ?? "",
    row.master_metadata_album_album_name ?? "",
    row.ms_played,
  ]);
}
