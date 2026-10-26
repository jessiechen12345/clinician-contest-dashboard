"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { fmtDateTime } from "@/lib/format";
import { DEFAULT_RULES } from "@/lib/config";

/* eslint-disable @typescript-eslint/no-explicit-any */
const card = "rounded-xl border border-teal-200 bg-white p-5 sm:p-6";
const input = "w-full rounded-md border-2 border-teal-300 px-3 py-2 text-base";
const btn = "rounded-md bg-teal-700 px-4 py-2 font-bold text-white hover:bg-teal-800 disabled:opacity-60";
const btn2 = "rounded-md border-2 border-teal-700 px-4 py-2 font-bold text-teal-800 hover:bg-teal-50 disabled:opacity-60";

async function api(path: string, init?: RequestInit) {
  const res = await fetch(path, { cache: "no-store", ...init });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? `The server returned an error (HTTP ${res.status}). Check the Vercel function logs.`);
  return data;
}

function AdminLogin({ onDone }: { onDone: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("/api/admin-login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
      onDone();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5">
      <form onSubmit={submit} className={card}>
        <h1 className="text-2xl font-bold">Admin</h1>
        <p className="mt-2">Only approved email addresses can sign in here.</p>
        <label htmlFor="admin-email" className="mt-5 block font-bold">Email</label>
        <input id="admin-email" type="email" autoComplete="username" autoFocus required value={email} onChange={(e) => setEmail(e.target.value)} className={`${input} mt-1`} />
        <label htmlFor="admin-pw" className="mt-4 block font-bold">Admin password</label>
        <input id="admin-pw" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className={`${input} mt-1`} />
        {error && <p role="alert" className="mt-3 rounded-md bg-alert-soft p-3 text-alert">{error}</p>}
        <button disabled={busy} className={`${btn} mt-5 w-full py-3 text-lg`}>{busy ? "Checking…" : "Sign in"}</button>
      </form>
      <Link href="/" className="mt-6 text-center text-teal-700 underline">Back to dashboard</Link>
    </main>
  );
}

export default function AdminPage() {
  const [meta, setMeta] = useState<any>(null);
  const [month, setMonth] = useState<string>("");
  const [checking, setChecking] = useState(true);

  const load = useCallback(async (m?: string) => {
    try {
      const d = await api(`/api/admin/settings${m ? `?month=${m}` : ""}`);
      setMeta(d);
      setMonth(d.month);
    } catch {
      setMeta(null); // not signed in
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function signOut() {
    await fetch("/api/admin-login", { method: "DELETE" });
    setMeta(null);
  }

  if (checking) return <p className="p-8">Loading…</p>;
  if (!meta) return <AdminLogin onDone={() => { setChecking(true); load(); }} />;
  const months: string[] = meta.dataset?.months ?? [];

  return (
    <div className="min-h-screen">
      <header className="border-b border-teal-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-5 py-3">
          <span className="text-lg font-bold text-teal-800">Admin</span>
          <div className="flex items-center gap-4 text-sm">
            <span>{meta.admin.name ?? meta.admin.email}</span>
            <Link href="/" className="underline">Public page</Link>
            <button className="underline" onClick={signOut}>Sign out</button>
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

        <DataCard meta={meta} reload={() => load(month)} />
        <SettingsCard key={month} meta={meta} month={month} reload={() => load(month)} />
        <RulesCard key={`rules-${month}-${JSON.stringify(meta.config)}-${meta.dataset?.syncedAt}`} month={month} />
        <GateCard />
        <AnalyticsCard key={`a-${month}-${meta.dataset?.syncedAt}-${JSON.stringify(meta.config)}`} month={month} hasData={months.includes(month)} />
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
      <h2 className="text-xl font-bold">Settings for {month}</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-4">
        <label>Threshold (consults per hour)<input className={input} type="number" step="0.01" value={f.target} onChange={set("target")} /></label>
        <label>Stretch threshold<input className={input} type="number" step="0.01" value={f.stretch} onChange={set("stretch")} /></label>
        <label>Minimum consults<input className={input} type="number" step="1" value={f.minConsults} onChange={set("minConsults")} /></label>
        <label>Minimum Patient Satisfaction Score<input className={input} type="number" step="0.01" value={f.minPsat} onChange={set("minPsat")} /></label>
        <label>Start date<input className={input} type="date" value={f.startDate} onChange={set("startDate")} /></label>
        <label>End date<input className={input} type="date" value={f.endDate} onChange={set("endDate")} /></label>
        <label className="sm:col-span-2">Eligible statuses (comma-separated)<input className={input} value={f.eligible} onChange={set("eligible")} /></label>
        <label className="sm:col-span-4">Prizes (one per line)<textarea className={input} rows={3} value={f.prizes} onChange={set("prizes")} /></label>
      </div>
      <label className="mt-4 flex items-center gap-2"><input type="checkbox" checked={f.makeActive} onChange={set("makeActive")} className="h-5 w-5" /> Show this month on the public page by default</label>
      <p className="mt-2 text-sm text-teal-800">Minimum consults and minimum Patient Satisfaction Score needed to earn a ballot. Set the score to 0 to turn that rule off.</p>
      <button
        type="button"
        className="mt-2 text-sm underline"
        onClick={() => setF({ ...f, target: String(DEFAULT_RULES.target), stretch: String(DEFAULT_RULES.stretch), minConsults: String(DEFAULT_RULES.minConsults), minPsat: String(DEFAULT_RULES.minPsat) })}
      >
        Reset the four rule numbers to the spreadsheet&apos;s ({DEFAULT_RULES.minConsults} consults, {DEFAULT_RULES.minPsat} satisfaction, {DEFAULT_RULES.target.toFixed(2)} and {DEFAULT_RULES.stretch.toFixed(2)} per hour). Then press Save.
      </button>
      <div className="mt-4"><button className={btn}>Save settings</button></div>
      <Notice n={n} />
    </form>
  );
}

function DataCard({ meta, reload }: { meta: any; reload: () => void }) {
  const [busy, setBusy] = useState(false);
  const [n, setN] = useState<any>(null);
  const d = meta.dataset;

  async function upload(file: File) {
    setBusy(true);
    setN(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await api("/api/admin/upload", { method: "POST", body: fd });
      setN({ ok: true, text: `Loaded ${r.clinicians} clinicians (${r.months.join(", ")}) from ${file.name}. The dashboard now shows this data.` });
      reload();
    } catch (e: any) {
      setN({ ok: false, text: e.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={card}>
      <h2 className="text-xl font-bold">Upload data</h2>
      <p className="mt-2">
        {d ? <>Currently showing {d.clinicians} clinicians for {d.months.join(", ")}. Uploaded {fmtDateTime(d.syncedAt)}</> : "No data has been uploaded yet."}
      </p>
      <ol className="mt-3 list-decimal space-y-1 pl-6 text-sm text-teal-800">
        <li>In the Google Sheet, open the <strong>Productivity</strong> tab.</li>
        <li>Choose <strong>File → Download → Comma Separated Values (.csv)</strong>. It downloads the tab you have open.</li>
        <li>Choose that file below. A new upload replaces the previous one.</li>
        <li>Delete the downloaded file afterwards. It contains personal information.</li>
      </ol>
      <div className="mt-4">
        <label className={`${btn} inline-block cursor-pointer`}>
          {busy ? "Uploading…" : "Choose CSV file"}
          <input
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            disabled={busy}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) upload(file);
              e.target.value = "";
            }}
          />
        </label>
      </div>
      <Notice n={n} />
    </section>
  );
}

function RulesCard({ month }: { month: string }) {
  const [r, setR] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    api(`/api/admin/rules?month=${month}`).then(setR).catch((e) => setErr(e.message));
  }, [month]);

  if (err) return <section className={card}><p role="alert" className="text-alert">{err}</p></section>;
  if (!r) return <section className={card}>Loading ballot rules…</section>;

  const { rules, counts } = r;
  const rate = (n: number) => n.toFixed(2);
  const differences: string[] = [];
  if (rules.minConsults !== DEFAULT_RULES.minConsults) differences.push(`minimum consults ${rules.minConsults} (spreadsheet: ${DEFAULT_RULES.minConsults})`);
  if (rules.minPsat !== DEFAULT_RULES.minPsat) differences.push(`minimum satisfaction ${rules.minPsat} (spreadsheet: ${DEFAULT_RULES.minPsat})`);
  if (rules.target !== DEFAULT_RULES.target) differences.push(`threshold ${rate(rules.target)} (spreadsheet: ${rate(DEFAULT_RULES.target)})`);
  if (rules.stretch !== DEFAULT_RULES.stretch) differences.push(`stretch threshold ${rate(rules.stretch)} (spreadsheet: ${rate(DEFAULT_RULES.stretch)})`);
  const n = (x: number) => x.toLocaleString("en-CA");

  return (
    <section className={card} aria-labelledby="rules-h">
      <h2 id="rules-h" className="text-xl font-bold">How ballots are earned for {month}</h2>
      <p className="mt-2 text-sm text-teal-800">These come from the numbers saved under Settings above. Both of the first two rules must be met before any ballot counts.</p>
      <ol className="mt-3 list-decimal space-y-1 pl-6">
        <li>At least <strong>{rules.minConsults}</strong> consults in the month (Québec and Ontario combined).</li>
        <li>
          {rules.minPsat > 0
            ? <>A Patient Satisfaction Score of at least <strong>{rules.minPsat}</strong>. A missing or zero score earns no ballots.</>
            : <>No Patient Satisfaction Score is required (this rule is turned off).</>}
        </li>
        <li>Then <strong>{rate(rules.target)}</strong> or more consults per hour earns <strong>1 ballot</strong>, and <strong>{rate(rules.stretch)}</strong> or more earns <strong>2 ballots</strong>.</li>
      </ol>
      {differences.length === 0
        ? <p className="mt-3 rounded-md bg-teal-100 p-3 text-sm">Same as the spreadsheet formula.</p>
        : <p role="status" className="mt-3 rounded-md bg-stub-soft p-3 text-sm"><strong>Different from the spreadsheet formula:</strong> {differences.join("; ")}. Ballot counts will not match the spreadsheet&apos;s Ballots Earned column.</p>}

      <h3 className="mt-5 font-bold">What the rules do to the uploaded data</h3>
      {!counts ? (
        <p className="mt-2 text-sm">Upload data that includes {month} to see this.</p>
      ) : (
        <>
          <p className="mt-1 text-sm text-teal-800">{n(counts.eligibleWithData)} eligible clinicians have figures for this month.</p>
          <dl className="mt-3 grid gap-3 sm:grid-cols-3">
            {[
              ["Met the consults rule", counts.metConsults],
              ["Met the satisfaction rule", counts.metSatisfaction],
              ["Met both", counts.metBoth],
              ["Reached the threshold per hour", counts.reachedThreshold],
              ["…but blocked by the consults rule", counts.blockedByConsults],
              ["…but blocked by the satisfaction rule", counts.blockedBySatisfaction]
            ].map(([label, v]) => (
              <div key={label as string} className="rounded-lg bg-teal-50 p-3">
                <dt className="text-sm text-teal-800">{label}</dt>
                <dd className="text-2xl font-bold tabular-nums">{n(v as number)}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-sm">Result: <strong>{n(counts.twoBallots)}</strong> earned 2 ballots, <strong>{n(counts.oneBallot)}</strong> earned 1, and <strong>{n(counts.noBallots)}</strong> earned none.</p>
        </>
      )}
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
      <p className="mt-4 text-sm">Consults per hour percentiles: 50th {a.rateP50?.toFixed(2) ?? "—"}, 75th {a.rateP75?.toFixed(2) ?? "—"}, 85th {a.rateP85?.toFixed(2) ?? "—"}. Excluded by status: {a.excludedByStatus}.</p>
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
