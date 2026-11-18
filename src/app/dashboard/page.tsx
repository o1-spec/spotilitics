import { Dashboard } from "@/components/dashboard";
import { session } from "@/lib/session";
export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const params = await searchParams;
  return (
    <Dashboard
      initialView={params.view === "analytics" ? "Analytics" : "Overview"}
      connected={Boolean(await session())}
    />
  );
}
