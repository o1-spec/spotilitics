import { parseHistory } from "../lib/analytics";

self.addEventListener(
  "message",
  async (event: MessageEvent<{ id: number; file: File }>) => {
    const { id, file } = event.data;
    try {
      self.postMessage({ id, progress: 5, label: `Reading ${file.name}…` });
      const source = await file.text();
      self.postMessage({ id, progress: 35, label: `Parsing ${file.name}…` });
      const rows = parseHistory(JSON.parse(source));
      self.postMessage({ id, progress: 100, rows });
    } catch (error) {
      self.postMessage({
        id,
        error:
          error instanceof SyntaxError
            ? `${file.name} is not valid JSON.`
            : `${file.name} is not supported extended streaming history. Choose Streaming_History_Audio JSON files from Spotify’s extended export.`,
      });
    }
  },
);
