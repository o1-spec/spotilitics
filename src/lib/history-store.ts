import type { HistoryRow } from "./analytics";
import { historyKey } from "./history-key";

const DATABASE = "spotlytics-local";
const STORE = "history-v2";
const LEGACY_STORE = "history";
const VERSION = 2;
const BATCH_SIZE = 5000;

function openDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined")
    return Promise.reject(new Error("Local history storage is unavailable."));
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, VERSION);
    request.onupgradeneeded = (event) => {
      const db = request.result;
      const transaction = request.transaction;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "key" });
        if (
          (event as IDBVersionChangeEvent).oldVersion < 2 &&
          db.objectStoreNames.contains(LEGACY_STORE) &&
          transaction
        ) {
          const legacy = transaction.objectStore(LEGACY_STORE);
          const cursorRequest = legacy.openCursor();
          cursorRequest.onsuccess = () => {
            const cursor = cursorRequest.result;
            if (cursor) {
              const value = cursor.value as { row: HistoryRow };
              const row = {
                ...value.row,
                ts: new Date(value.row.ts).toISOString(),
              };
              store.put({ key: historyKey(row), row });
              cursor.continue();
            } else {
              db.deleteObjectStore(LEGACY_STORE);
            }
          };
        }
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function readHistory(): Promise<HistoryRow[]> {
  const db = await openDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const request = db
        .transaction(STORE, "readonly")
        .objectStore(STORE)
        .getAll();
      request.onsuccess = () =>
        resolve(
          (request.result as { key: string; row: HistoryRow }[]).map(
            (item) => item.row,
          ),
        );
      request.onerror = () => reject(request.error);
    });
  } finally {
    db.close();
  }
}

export async function saveHistory(rows: HistoryRow[]) {
  const db = await openDatabase();
  try {
    for (let start = 0; start < rows.length; start += BATCH_SIZE) {
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(STORE, "readwrite");
        const store = transaction.objectStore(STORE);
        for (const row of rows.slice(start, start + BATCH_SIZE))
          store.put({ key: historyKey(row), row });
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(transaction.error);
      });
    }
  } finally {
    db.close();
  }
}

export async function clearHistory() {
  const db = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE, "readwrite");
      transaction.objectStore(STORE).clear();
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  } finally {
    db.close();
  }
}
