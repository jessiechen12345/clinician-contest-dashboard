"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { fmtDateTime } from "@/lib/format";

/* eslint-disable @typescript-eslint/no-explicit-any */
const card = "rounded-xl border border-teal-200 bg-white p-5 sm:p-6";
const input = "w-full rounded-md border-2 border-teal-300 px-3 py-2 text-base";

async function api(path: string, init?: RequestInit) {
  const res = await fetch(path, { cache: "no-store", ...init });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Request failed.");
  return data;
}

export default function PublicPage() {
  const [data, setData] = useState<any>(null);
  const [query, setQuery] = useState("");
  const [month, setMonth] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async (m?: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api(`/api/public${m ? `?month=${m}` : ""}`);
      setData(res);
      setMonth(res.activeMonth);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading && !data) return <p className="p-8">Loading dashboard…</p>;
  if (error) return <p className="p-8 text-alert">Error loading dashboard: {error}</p>;

  const filtered = data?.clinicians?.filter((c: any) =>
    c.name?.toLowerCase().includes(query.toLowerCase()) ||
    c.email?.toLowerCase().includes(query.toLowerCase()) ||
    String(c.id).includes(query)
  ) ?? [];

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-teal-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-5 py-4">
          <span className="text-xl font-bold text-teal-800">Clinician Dashboard</span>
          <Link href="/admin" className="text-sm font-semibold text-teal-700 underline hover:text-teal-900">
            Admin Portal
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-5 py-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Standings ({month})</h1>
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
