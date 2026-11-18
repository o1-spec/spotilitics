import { Dashboard } from "@/components/dashboard";
import { session } from "@/lib/session";
export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; connected?: string }>;
}) {
  const params = await searchParams;
  const initialView =
    params.view === "analytics"
      ? "Analytics"
      : params.view === "artists"
        ? "Artists"
        : params.view === "tracks"
          ? "Tracks"
          : params.view === "history"
            ? "History"
            : params.view === "personal-wrapped"
              ? "Personal Wrapped"
              : "Overview";
  return (
    <Dashboard
      initialView={initialView}
      connected={Boolean(await session())}
      showConnectedNotice={params.connected === "1"}
    />
  );
}
