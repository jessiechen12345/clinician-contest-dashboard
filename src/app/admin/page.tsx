"use client";

import Link from "next/link";
import { signIn, signOut, useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";
import { fmtDateTime } from "@/lib/format";

/* eslint-disable @typescript-eslint/no-explicit-any */
const card = "rounded-xl border border-teal-200 bg-white p-5 sm:p-6";
const input = "w-full rounded-md border-2 border-teal-300 px-3 py-2 text-base";
const btn = "rounded-md bg-teal-700 px-4 py-2 font-bold text-white hover:bg-teal-800 disabled:opacity-60";
const btn2 = "rounded-md border-2 border-teal-700 px-4 py-2 font-bold text-teal-800 hover:bg-teal-50 disabled:opacity-60";

async function api(path: string, init?: RequestInit) {
  const res = await fetch(path, { cache: "no-store", ...init });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Request failed.");
  return data;
}

export default function AdminPage() {
  const { status } = useSession();
  const [meta, setMeta] = useState<any>(null);
  const [month, setMonth] = useState<string>("");
  const [denied, setDenied] = useState(false);

  const load = useCallback(async (m?: string) => {
    try {
      const d = await api(`/api/admin/settings${m ? `?month=${m}` : ""}`);
      setMeta(d);
      setMonth(d.month);
      setDenied(false);
    } catch {
      setDenied(true);
    }
  }, []);

  useEffect(() => { if (status === "authenticated") load(); }, [status, load]);

  if (status === "loading") return <p className="p-8">Loading…</p>;

  if (status !== "authenticated" || denied) {
    return (
      <main className="mx-auto max-w-md px-5 py-20">
        <h1 className="text-3xl font-bold">Admin sign in</h1>
        <p className="mt-3">Only people on the admin list can open this portal.</p>
        {status === "authenticated" && denied && (
          <p role="alert" className="mt-4 rounded-md bg-alert-soft p-3 text-alert">This account isn't on the admin list.</p>
        )}
        <div className="mt-6 flex flex-col gap-3">
          <button className={btn} onClick={() => signIn("google", { callbackUrl: "/admin" })}>Sign in with Google</button>
          <button className={btn2} onClick={() => signIn("azure-ad", { callbackUrl: "/admin" })}>Sign in with Microsoft</button>
          {status === "authenticated" && <button className="underline" onClick={() => signOut({ callbackUrl: "/" })}>Sign out</button>}
        </div>
        <Link href="/" className="mt-8 inline-block text-teal-700 underline">Back to contest page</Link>
      </main>
    );
  }

  if (!meta) return <p className="p-8">Loading…</p>;
  const months: string[] = meta.dataset?.months ?? [];

  return (
    <div className="min-h-screen">
      <header className="border-b border-teal-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-5 py-3">
          <span className="text-lg font-bold text-teal-800">Contest admin</span>
          <div className="flex items-center gap-4 text-sm">
            <span>{meta.admin.name ?? meta.admin.email}</span>
            <Link href="/" className="underline">Public page</Link>
            <button className="underline" onClick={() => signOut({ callbackUrl: "/" })}>Sign out</button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-8 px-5 py-8">
        <div className="flex flex-wrap items-end gap-4">
          <label className="text-sm">
            <span className="mb-1 block text-teal-800">Managing month</span>
            <select className={input} value={month} onChange={(e) => load(e.target.value)}>
              {Array.from(new Set([...(months), meta.settings.activeMonth])).sort().map((m) => <option key={m}>{m}</option>)}
            </select>
          </label>
          {meta.storageMode === "local-file" && (
            <p className="rounded-md bg-stub-soft p-3 text-sm">
              Saving to local files. Connect Upstash Redis before deploying, or settings will be lost on Vercel.
            </p>
          )}
        </div>

        <GateCard />
        <SettingsCard key={month} meta={meta} month={month} reload={() => load(month)} />
        <DataCard meta={meta} reload={() => load(month)} />
        <AnalyticsCard key={`a-${month}-${meta.dataset?.syncedAt}`} month={month} hasData={months.includes(month)} />
        <DrawCard key={`d-${month}`} month={month} hasData={months.includes(month)} cfg={meta.config} reload={() => load(month)} />
      </main>
    </div>
  );
}

function Notice({ n }: { n: { ok: boolean; text: string } | null }) {
  if (!n) return null;
  return <p role={n.ok ? "status" : "alert"} className={`mt-3 rounded-md p-3 ${n.ok ? "bg-teal-100" : "bg-alert-soft text-alert"}`}>{n.text}</p>;
}

function SettingsCard({ meta, month, reload }: { meta: any; month: string; reload: () => void }) {
  const c = meta.config;
  const [f, setF] = useState({
    target: String(c.target), stretch: String(c.stretch), minConsults: String(c.minConsults), minPsat: String(c.minPsat),
    startDate: c.startDate, endDate: c.endDate, prizes: (c.prizes as string[]).join("\n"),
    eligible: (meta.settings.eligibleStatuses as string[]).join(", "), makeActive: meta.settings.activeMonth === month
  });
  const [n, setN] = useState<any>(null);
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api("/api/admin/settings", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          month,
          activeMonth: f.makeActive ? month : undefined,
          eligibleStatuses: f.eligible.split(",").map((s) => s.trim()).filter(Boolean),
          config: {
            target: Number(f.target), stretch: Number(f.stretch), minConsults: Number(f.minConsults), minPsat: Number(f.minPsat),
            startDate: f.startDate, endDate: f.endDate, prizes: f.prizes.split("\n")
          }
        })
      });
      setN({ ok: true, text: "Settings saved. The public page now uses them." });
      reload();
    } catch (err: any) { setN({ ok: false, text: err.message }); }
  }

  return (
    <form onSubmit={save} className={card}>
      <h2 className="text-xl font-bold">Contest settings for {month}</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-4">
        <label>Target (consults/hr)<input className={input} type="number" step="0.01" value={f.target} onChange={set("target")} /></label>
        <label>Stretch target<input className={input} type="number" step="0.01" value={f.stretch} onChange={set("stretch")} /></label>
        <label>Minimum consults<input className={input} type="number" step="1" value={f.minConsults} onChange={set("minConsults")} /></label>
        <label>Minimum PSAT<input className={input} type="number" step="0.01" value={f.minPsat} onChange={set("minPsat")} /></label>
        <label>Start date<input className={input} type="date" value={f.startDate} onChange={set("startDate")} /></label>
        <label>End date<input className={input} type="date" value={f.endDate} onChange={set("endDate")} /></label>
        <label className="sm:col-span-2">Eligible statuses (comma-separated)<input className={input} value={f.eligible} onChange={set("eligible")} /></label>
        <label className="sm:col-span-4">Prizes (one per line)<textarea className={input} rows={3} value={f.prizes} onChange={set("prizes")} /></label>
      </div>
      <label className="mt-4 flex items-center gap-2"><input type="checkbox" checked={f.makeActive} onChange={set("makeActive")} className="h-5 w-5" /> Show this month on the public page by default</label>
      <p className="mt-2 text-sm text-teal-800">Minimum consults and PSAT mirror the spreadsheet's ballot formula. Set PSAT to 0 to turn that rule off.</p>
      <div className="mt-4"><button className={btn}>Save settings</button></div>
      <Notice n={n} />
    </form>
  );
}

function DataCard({ meta, reload }: { meta: any; reload: () => void }) {
  const [busy, setBusy] = useState(false);
  const [n, setN] = useState<any>(null);
  const d = meta.dataset;

  async function run(fn: () => Promise<any>, ok: (r: any) => string) {
    setBusy(true); setN(null);
    try { const r = await fn(); setN({ ok: true, text: ok(r) }); reload(); } catch (e: any) { setN({ ok: false, text: e.message }); } finally { setBusy(false); }
  }

  return (
    <section className={card}>
      <h2 className="text-xl font-bold">Data</h2>
      <p className="mt-2">
        {d ? <>{d.clinicians} clinicians, months {d.months.join(", ")}. Last loaded {fmtDateTime(d.syncedAt)} from {d.source === "google-sheet" ? "Google Sheet" : "CSV upload"}.</> : "No data loaded yet."}
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <button className={btn} disabled={busy} onClick={() => run(() => api("/api/admin/sync", { method: "POST" }), (r) => `Synced ${r.clinicians} clinicians.`)}>
          {busy ? "Working…" : "Sync from Google Sheet"}
        </button>
        <label className={`${btn2} cursor-pointer`}>
          Upload CSV
          <input type="file" accept=".csv,text/csv" className="sr-only" disabled={busy} onChange={(e) => {
            const file = e.target.files?.[0]; if (!file) return;
            const fd = new FormData(); fd.append("file", file);
            run(() => api("/api/admin/upload", { method: "POST", body: fd }), (r) => `Loaded ${r.clinicians} clinicians from ${file.name}.`);
            e.target.value = "";
          }} />
        </label>
      </div>
      <Notice n={n} />
    </section>
  );
}

function AnalyticsCard({ month, hasData }: { month: string; hasData: boolean }) {
  const [a, setA] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    if (!hasData) return;
    api(`/api/admin/analytics?month=${month}`).then(setA).catch((e) => setErr(e.message));
  }, [month, hasData]);

  if (!hasData) return <section className={card}><h2 className="text-xl font-bold">Pool analytics</h2><p className="mt-2">No data for {month} yet.</p></section>;
  if (err) return <section className={card}><p role="alert" className="text-alert">{err}</p></section>;
  if (!a) return <section className={card}>Loading analytics…</section>;

  const total = a.eligibleWithData || 1;
  const rows = [
    { k: "0 ballots", v: a.distribution[0] },
    { k: "1 ballot", v: a.distribution[1] },
    { k: "2 ballots", v: a.distribution[2] }
  ];
  return (
    <section className={card}>
      <h2 className="text-xl font-bold">Pool analytics for {month}</h2>
      <dl className="mt-4 grid gap-4 sm:grid-cols-4">
        {[["Eligible with data", a.eligibleWithData], ["Participants (1+ ballot)", a.participants], ["Total ballots", a.totalBallots], ["Missing month data", a.missingData]].map(([l, v]) => (
          <div key={l as string} className="rounded-lg bg-teal-50 p-3"><dt className="text-sm text-teal-800">{l}</dt><dd className="text-2xl font-bold tabular-nums">{v}</dd></div>
        ))}
      </dl>
      <h3 className="mt-6 font-bold">Ballot distribution</h3>
      <ul className="mt-2 space-y-2">
        {rows.map((r) => (
          <li key={r.k} className="flex items-center gap-3">
            <span className="w-24">{r.k}</span>
            <span className="h-4 flex-1 rounded bg-teal-100"><span className="block h-4 rounded bg-teal-600" style={{ width: `${(r.v / total) * 100}%` }} /></span>
            <span className="w-24 text-right tabular-nums">{r.v} ({Math.round((r.v / total) * 100)}%)</span>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-sm">Consults/hr percentiles: 50th {a.rateP50?.toFixed(2) ?? "—"}, 75th {a.rateP75?.toFixed(2) ?? "—"}, 85th {a.rateP85?.toFixed(2) ?? "—"}. Excluded by status: {a.excludedByStatus}.</p>
      <p className={`mt-2 text-sm ${a.sheetMismatches ? "font-bold text-alert" : ""}`}>
        {a.sheetMismatches
          ? `${a.sheetMismatches} clinicians have a different ballot count than the spreadsheet's "Ballots Earned" column. Check the thresholds above.`
          : `Ballot counts match the spreadsheet's "Ballots Earned" column.`}
      </p>
    </section>
  );
}

function DrawCard({ month, hasData, cfg, reload }: { month: string; hasData: boolean; cfg: any; reload: () => void }) {
  const [winners, setWinners] = useState("1");
  const [prize, setPrize] = useState(cfg.prizes?.[0] ?? "");
  const [res, setRes] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [n, setN] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  const loadHistory = useCallback(() => api("/api/admin/draw").then((d) => setHistory(d.draws)).catch(() => {}), []);
  useEffect(() => { loadHistory(); }, [loadHistory]);

  async function run(preview: boolean) {
    if (!preview && !confirm(`Run and record the official ${month} draw? This is saved and updates "last draw" on the public page.`)) return;
    setBusy(true); setN(null);
    try {
      const d = await api("/api/admin/draw", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ month, winners: Number(winners), prize, preview }) });
      setRes(d);
      if (d.saved) { loadHistory(); reload(); }
    } catch (e: any) { setN({ ok: false, text: e.message }); } finally { setBusy(false); }
  }

  return (
    <section className={card}>
      <h2 className="text-xl font-bold">Draw tools</h2>
      <p className="mt-1 text-sm text-teal-800">Each ballot is one entry. A clinician can win once per draw. Randomness comes from the server's cryptographic generator.</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <label>Winners<input className={input} type="number" min={1} max={20} value={winners} onChange={(e) => setWinners(e.target.value)} /></label>
        <label className="sm:col-span-2">Prize<input className={input} value={prize} onChange={(e) => setPrize(e.target.value)} placeholder="e.g. $100 gift card" /></label>
      </div>
      <div className="mt-4 flex gap-3">
        <button className={btn2} disabled={busy || !hasData} onClick={() => run(true)}>Preview draw</button>
        <button className={btn} disabled={busy || !hasData} onClick={() => run(false)}>Run official draw</button>
      </div>
      <Notice n={n} />
      {res && (
        <div className="mt-5 rounded-lg bg-stub-soft p-4">
          <p className="font-bold">{res.saved ? "Official draw recorded" : "Preview only (not saved)"}: pool of {res.record.poolBallots} ballots from {res.record.poolParticipants} clinicians</p>
          <ol className="mt-2 list-decimal pl-6">
            {res.record.winners.map((w: any) => <li key={w.id}>{w.name || "(no name)"}, {w.email}, ID {w.id} ({w.ballots} ballot{w.ballots > 1 ? "s" : ""})</li>)}
          </ol>
        </div>
      )}
      {history.length > 0 && (
        <div className="mt-6">
          <h3 className="font-bold">Draw history</h3>
          <ul className="mt-2 space-y-2 text-sm">
            {history.map((h) => (
              <li key={h.id} className="rounded-md border border-teal-100 p-3">
                <strong>{h.month}</strong>, {fmtDateTime(h.at)} by {h.by}{h.prize ? `, prize: ${h.prize}` : ""}: {h.winners.map((w: any) => w.name || w.id).join("; ")}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function GateCard() {
  const [st, setSt] = useState<any>(null);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [n, setN] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const refresh = useCallback(() => api("/api/admin/gate").then(setSt).catch(() => {}), []);
  useEffect(() => { refresh(); }, [refresh]);

  async function send(payload: any, okText: string) {
    setBusy(true); setN(null);
    try {
      await api("/api/admin/gate", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      setN({ ok: true, text: okText }); setPw(""); setPw2(""); refresh();
    } catch (e: any) { setN({ ok: false, text: e.message }); } finally { setBusy(false); }
  }

  function change(e: React.FormEvent) {
    e.preventDefault();
    if (pw !== pw2) return setN({ ok: false, text: "The two passwords don't match." });
    send({ newPassword: pw }, "Site password changed. Everyone else has been signed out and must use the new password.");
  }

  return (
    <section className={card}>
      <h2 className="text-xl font-bold">Site password</h2>
      {st?.usingDefault && (
        <p role="alert" className="mt-3 rounded-md bg-stub-soft p-3">
          The site is still using the default password ("password"). Set a new one before sharing the link.
        </p>
      )}
      {st?.updatedAt && <p className="mt-2 text-sm text-teal-800">Last changed {fmtDateTime(st.updatedAt)} by {st.updatedBy}.</p>}
      <form onSubmit={change} className="mt-4 grid gap-4 sm:grid-cols-2">
        <label>New password<input className={input} type="password" autoComplete="new-password" minLength={8} value={pw} onChange={(e) => setPw(e.target.value)} required /></label>
        <label>Confirm new password<input className={input} type="password" autoComplete="new-password" minLength={8} value={pw2} onChange={(e) => setPw2(e.target.value)} required /></label>
        <div className="flex flex-wrap gap-3 sm:col-span-2">
          <button className={btn} disabled={busy}>Change password</button>
          <button type="button" className={btn2} disabled={busy} onClick={() => confirm("Sign out everyone except you?") && send({ signOutAll: true }, "Everyone else has been signed out.")}>
            Sign everyone out
          </button>
        </div>
      </form>
      <Notice n={n} />
    </section>
  );
}
