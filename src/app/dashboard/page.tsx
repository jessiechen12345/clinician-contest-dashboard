import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { GATE_COOKIE, verifyGateToken } from "@/lib/gate";
import ContestDashboard from "@/components/ContestDashboard";

// Evaluated on every request so the cookie is always checked.
export const dynamic = "force-dynamic";

/**
 * Server component. Its only job is the password check (second layer behind src/middleware.ts);
 * the whole layout lives in src/components/ContestDashboard.tsx and always renders in full.
 */
export default async function DashboardPage() {
  const ok = await verifyGateToken(cookies().get(GATE_COOKIE)?.value);
  if (!ok) redirect("/login?next=%2Fdashboard");
  return <ContestDashboard />;
}
