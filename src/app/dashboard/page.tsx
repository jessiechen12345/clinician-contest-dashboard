import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { GATE_COOKIE, verifyGateToken } from "@/lib/gate";
import DashboardClient from "./DashboardClient";

// Evaluated on every request so the cookie is always checked.
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const ok = await verifyGateToken(cookies().get(GATE_COOKIE)?.value);
  if (!ok) redirect("/login?next=%2Fdashboard");
  return <DashboardClient />;
}
