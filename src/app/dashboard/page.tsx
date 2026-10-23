import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { GATE_COOKIE, verifyGateToken } from "@/lib/gate";
import DashboardView from "@/components/DashboardView";

// Evaluated on every request so the cookie is always checked.
export const dynamic = "force-dynamic";

/**
 * Server component: keeps the password check (second layer behind src/middleware.ts).
 * All visual layout lives in src/components/DashboardView.tsx.
 */
export default async function DashboardPage() {
  const ok = await verifyGateToken(cookies().get(GATE_COOKIE)?.value);
  if (!ok) redirect("/login?next=%2Fdashboard");
  return <DashboardView />;
}
