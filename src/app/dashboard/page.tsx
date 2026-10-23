"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { fmtDateTime } from "@/lib/format";

/* eslint-disable @typescript-eslint/no-explicit-any */
const card = "rounded-xl border border-teal-200 bg-white p-5 sm:p-6";
const input = "w-full rounded-md border-2 border-teal-300 px-3 py-2 text-base";
const btn = "rounded-md bg-teal-700 px-4 py-2 font-bold text-white hover:bg-teal-800 disabled:opacity-60";

async function api(path: string, init?: RequestInit) {
  const res = await fetch(path, { cache: "no-store", ...init });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Request failed.");
  return data;
}

export default function PublicDashboardPage() {
  const [unlocked, setUnlocked] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [gateError, setGateError] = useState("");
  
  const [data, setData] = useState<any>(null);
  const [query, setQuery] = useState("");
  const [month, setMonth] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkGate = useCallback(async () => {
    try {
      const g = await api("/api/gate");
      setUnlocked(g.unlocked);
    } catch {
      setUnlocked(false);
    }
  }, []);

  const loadData = useCallback(async (m?: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api(`/api/overview${m ? `?month=${m}` : ""}`);
      setData(res);
      setMonth(res.activeMonth);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkGate();
  }, [checkGate]);

  useEffect(() => {
    if (unlocked) loadData();
  }, [unlocked, loadData]);

  async function handleUnlock(e: React.FormEvent) {
    e.preventDefault();
    setGateError("");
    try {
      await api("/api/gate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      setUnlocked(true);
    } catch (err: any) {
      setGateError(err.message || "Incorrect password.");
    }
  }

  if (unlocked === null) return <p className="p-8">Checking access…</p>;

  if (!unlocked) {
    return (
      <main className="mx-auto max-w-md px-5 py-20">
        <h1 className="text-2xl font-bold text-teal-800">Clinician Contest Dashboard</h1>
        <p className="mt-2 text-sm text-slate-600">Enter the site password to view the contest standings.</p>
        <form onSubmit={handleUnlock} className="mt-6 space-y-4">
          <input
            type="password"
            placeholder="Site password"
            className={input}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {gateError && <p role="alert" className="text-sm text-red-600">{gateError}</p>}
          <button className={btn}>Unlock Dashboard</button>
        </form>
        <div className="mt-8 border-t border-slate-200 pt-4">
          <Link href="/admin" className="text-sm font-semibold text-teal-700 underline hover:text-teal-900">
            Admin Portal
          </Link>
        </div>
      </main>
    );
  }

  if (loading && !data) return <p className="p-8">Loading contest standings…</p>;
  if (error) return <p className="p-8 text-red-600">Error loading dashboard: {error}</p>;

  const filtered = data?.clinicians?.filter((c: any) =>
    c.name?.toLowerCase().includes(query.toLowerCase()) ||
    c.email?.toLowerCase().includes(query.toLowerCase()) ||
    String(c.id).includes(query)
  ) ?? [];

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-teal-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-5 py-4">
          <span className="text-xl font-bold text-teal-800">Clinician Contest Dashboard</span>
          <Link href="/admin" className="text-sm font-semibold text-teal-700 underline hover:text-teal-900">
            Admin Portal
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-5 py-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Contest Standings ({month})</h1>
            {data?.lastSynced && (
              <p className="mt-1 text-sm text-slate-500">
                Last updated {fmtDateTime(data.lastSynced)}
              </p>
            )}
          </div>

          {data?.months?.length > 1 && (
            <select
              className="rounded-md border-2 border-teal-300 px-3 py-2 text-sm font-medium"
              value={month}
              onChange={(e) => loadData(e.target.value)}
            >
              {data.months.map((m: string) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          )}
        </div>

        <section className={card}>
          <div className="mb-4">
            <input
              type="text"
              placeholder="Search clinician by name, email, or ID..."
              className={input}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 text-slate-600">
                <tr>
                  <th className="pb-3 font-semibold">Clinician</th>
                  <th className="pb-3 font-semibold">Consults / Hr</th>
                  <th className="pb-3 font-semibold">PSAT</th>
                  <th className="pb-3 font-semibold text-right">Ballots Earned</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((c: any) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="py-3 font-medium text-slate-800">{c.name || c.email || `ID ${c.id}`}</td>
                    <td className="py-3 text-slate-600">{c.rate?.toFixed(2) ?? "—"}</td>
                    <td className="py-3 text-slate-600">{c.psat ? `${c.psat}%` : "—"}</td>
                    <td className="py-3 text-right font-bold text-teal-700">{c.ballots}</td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-slate-500">
                      No clinicians found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
