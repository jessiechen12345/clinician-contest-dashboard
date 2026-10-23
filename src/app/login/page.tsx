"use client";

import { useState } from "react";

export default function LoginPage() {
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const next = new URLSearchParams(window.location.search).get("next");
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pw, next })
      });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? "Something went wrong.");
      else window.location.assign(data.next);
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5">
      <form onSubmit={submit} className="rounded-xl border border-teal-200 bg-white p-6">
        <h1 className="text-2xl font-bold">Clinician Contest</h1>
        <p className="mt-2">Enter the access password to continue.</p>
        <label htmlFor="pw" className="mt-5 block font-bold">Password</label>
        <input
          id="pw"
          type="password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          autoComplete="current-password"
          autoFocus
          required
          className="mt-1 w-full rounded-md border-2 border-teal-300 px-4 py-3 text-lg"
        />
        {error && <p role="alert" className="mt-3 rounded-md bg-alert-soft p-3 text-alert">{error}</p>}
        <button disabled={busy} className="mt-4 w-full rounded-md bg-teal-700 px-6 py-3 text-lg font-bold text-white hover:bg-teal-800 disabled:opacity-60">
          {busy ? "Checking…" : "Continue"}
        </button>
      </form>
    </main>
  );
}
