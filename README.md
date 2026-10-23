# Clinician Contest Dashboard

Self-service contest portal for clinicians (consults/hour → ballots → odds) plus a whitelisted admin portal.
Next.js 14 (App Router) · Tailwind · Google Sheets API · Upstash Redis · NextAuth.

## How the data maps (verified against the live "Productivity" tab)

The brief's column letters were one column off from the real sheet, so the parser locates columns **by header text and the month-date cell** instead of by letter.

| Field | Where it really lives |
|---|---|
| Unique ID | Y |
| Full name / THVC Email / Status | B / C / H |
| Per month block (7 cols) | ON, QC, **SUM ON/QC**, ratio, **All Up: Consults/hr**, **PSAT**, Ballots Earned |
| September | Z–AF (consults/hr = **AD**) |
| October | AG–AM (consults/hr = **AK**) |
| November | AN–AT (consults/hr = **AR**) |
| December | AU–BA (consults/hr = **AY**) |

The sheet's own ballot formula is
`IF(AND(SUM ON/QC >= 70, PSAT >= 4.65, rate >= 2.15), 2, IF(AND(same gates, rate >= 2), 1, 0))`.
The app reproduces it exactly: **min 70 consults** and **min PSAT 4.65** are on top of the rate targets, and all four numbers are editable per month in the admin portal. The Analytics card reconciles the app's ballot counts against the sheet's "Ballots Earned" column and warns on any difference.

## Privacy model

- The browser never receives the dataset. `/api/clinician-lookup` returns one clinician's own stats plus the anonymous pool size; no names, emails, peers or rankings.
- Sync reads only the needed columns (A:C, H, Y:BZ). Phone, address, personal email and pay-rate columns are never requested.
- Unknown IDs and inactive clinicians get an identical "not found" response; lookups are rate-limited (20 per 10 min per IP by default).
- Admin routes fail closed (401/403) and require an OAuth session whose email is in `src/config/adminWhitelist.ts`.

**Known limitation:** anyone who knows a colleague's email or Unique ID can look that person up. That is inherent to ID-only search. If that matters, put the whole site behind your company SSO (Vercel Authentication / Cloudflare Access / Entra) and compare the signed-in email with the record. Ask and I'll add it.

## Site password gate

`src/middleware.ts` blocks every page and API route until the visitor enters the password on `/login`. Unauthenticated requests are redirected to `/login`; after signing in, the visitor goes to `/dashboard` (or the page they originally asked for). `/` redirects to `/dashboard`.
A signed, httpOnly 12-hour cookie is issued on success; attempts are limited to 10 per 10 minutes per IP.

- **Starting password:** `password` (or `APP_PASSWORD` if you set it). The admin page shows a warning until it's changed.
- **Changing it:** sign in to `/admin` → **Site password**. The new password is stored as a salted scrypt hash in
  your storage (never in plain text) and takes effect immediately. Changing it, or pressing **Sign everyone out**,
  invalidates all existing sessions except the admin's own.
- **Requires** `GATE_SECRET` or `NEXTAUTH_SECRET` in production (the site returns 503 without one).
- With Upstash Redis configured, session invalidation is enforced on every request (within ~30 seconds across
  edge instances). In local-file dev mode, old cookies keep working until they expire.
- This is a shared password, not per-user identity. The admin whitelist/OAuth still applies on top for `/admin`.

## Run locally

```bash
npm install
cp .env.example .env.local        # fill in NEXTAUTH_SECRET at minimum
npm run dev                       # http://localhost:3000
npm test                          # parser + ballot-rule tests
```

No Google credentials yet? Sign in to /admin and use **Upload CSV** with
`sample-data/Contests_Ballot_Calculation_Productivity.sample.csv` (synthetic data), or export the real
Productivity tab as CSV (keep the two header rows).

## Deploy (GitHub + Vercel)

1. **Admin list:** edit `src/config/adminWhitelist.ts` with real names and emails.
2. **Push to GitHub** (`git init && git add . && git commit -m init && git remote add origin … && git push -u origin main`). Make the repo private.
3. **Vercel → Add New Project →** import the repo (framework auto-detected).
4. **Storage:** Vercel → Storage → add *Upstash Redis*; it injects `UPSTASH_REDIS_REST_URL/TOKEN`. (Required: serverless has no writable disk.)
5. **Google service account** (for sheet sync): Cloud Console → IAM → Service Accounts → create key (JSON) → enable *Google Sheets API* → share the spreadsheet with the service account's `client_email` as **Viewer** → paste the JSON on one line into `GOOGLE_SERVICE_ACCOUNT_JSON`.
   *Better:* copy the needed columns to a dedicated "Contest Export" tab or sheet, share only that, and set `CONTEST_SHEET_TAB`. The master workbook holds personal details.
6. **Admin sign-in:** create a Google OAuth client (redirect URI `https://YOUR-DOMAIN/api/auth/callback/google`) or an Entra app (`…/callback/azure-ad`). Set `NEXTAUTH_URL` to the production URL and `NEXTAUTH_SECRET` to `openssl rand -base64 32`.
7. Add all variables from `.env.example` in Vercel → Settings → Environment Variables, then deploy.
8. Open `/admin` → **Sync from Google Sheet** → set prizes/dates → check Analytics.

Netlify/Cloud Run work too (any Node host); keep the same env vars.

## Monthly routine

Update the sheet → admin **Sync** → check "Ballot counts match the sheet" → set the month active → after the deadline, **Preview draw**, then **Run official draw** (recorded with timestamp and admin).

## Layout

```
src/lib/csv.ts        header-driven parser (CSV text and Sheets rows)
src/lib/ballots.ts    ballot rules, pool, odds
src/lib/sheets.ts     column-limited Google Sheets fetch
src/app/api/…         overview, clinician-lookup, admin/{settings,sync,upload,analytics,draw}
src/app/page.tsx      public landing + lookup
src/app/admin/page.tsx admin portal
tests/                vitest
```
