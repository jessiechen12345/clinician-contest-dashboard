/**
 * English / French (Canada) text and formatting for the public pages.
 * French comes from the TELUS Translator (TELUS glossary), with small fixes for elision and punctuation.
 * To change a label, edit it once per language below.
 */
export type Lang = "en" | "fr";
export const LANG_COOKIE = "lang";
export const isLang = (v: unknown): v is Lang => v === "en" || v === "fr";
const NB = "\u00a0"; // non-breaking space (French puts one before ? : ;)

const en = {
  brand: "Care Capacity Initiative",
  headline: "Check your ballots & winning odds",
  overviewTitle: "{month} overview",
  month: "Month",
  prizes: "Prizes",
  prizeTbd: "Prize to be announced",
  dateRange: "Date range",
  lastSync: "Last data sync",
  notSynced: "Not synced yet",
  lastDraw: "Last draw",
  noDraw: "No draw yet",
  pacific: "Pacific",
  monthlyThreshold: "Monthly Threshold",
  stretchThreshold: "Stretch Threshold",
  perHour: "consults per hour",
  totalBallots: "Total Ballots",
  totalBallotsNote: "Total ballots in the pool across all eligible clinicians.",
  totalConsults: "Total Consults in Québec & Ontario",
  consultsNote: "Québec and Ontario combined.",
  overallSatisfaction: "Overall Patient Satisfaction Score",
  pending: "Appears once data is loaded.",
  outOf5: "out of 5",
  findTitle: "Find your results",
  findHelp: "Enter your Unique Clinician ID. You can only see your own results.",
  idLabel: "Unique Clinician ID",
  placeholder: "e.g. THVC-0042",
  checkBtn: "Check my results",
  checking: "Checking…",
  resultsTitle: "Your {month} results",
  rate: "Consults per Hour",
  mineTotalConsults: "Total Consults",
  satisfactionScore: "Patient Satisfaction Score",
  ballotsEarned: "Ballots Earned",
  thresholdPlusStretch: "Threshold + stretch",
  thresholdBallot: "Threshold ballot",
  noBallots: "No ballots yet this month.",
  winningOdds: "Winning Odds",
  oddsDetail: "About 1 in {n} ({b} of {t} ballots).",
  earnBallot: "Earn a ballot to enter the draw.",
  loading: "Loading the latest figures…",
  loadError: "Couldn't load the latest figures. Showing default values for now.",
  noData: "No data has been uploaded yet.",
  errBadRequest: "Enter your Unique Clinician ID.",
  errNotFound: "We couldn't find that Unique Clinician ID for this month. Check for typos. Still stuck? Contact your liaison.",
  errNoMonthData: "We found your record, but there's no data for {month} yet.",
  errRateLimited: "Too many searches. Please wait a few minutes and try again.",
  errUnavailable: "We couldn't load the latest figures. Please try again shortly.",
  errNetwork: "Couldn't reach the server. Check your connection and try again.",
  errGeneric: "Something went wrong. Try again.",
  footer:
    "For multi-licensed clinicians, Ontario and Québec consults are combined. Winning odds shown are for a single prize draw; with multiple prizes your overall chance is higher.",
  language: "Language",
  ballotOne: "{n} ballot",
  ballotMany: "{n} ballots",
  loginIntro: "Enter the access password to continue.",
  loginPassword: "Password",
  loginContinue: "Continue",
  loginWrong: "That password isn't right. Try again.",
  loginTooMany: "Too many attempts. Wait a few minutes and try again."
} as const;

export type Key = keyof typeof en;

const fr: Record<Key, string> = {
  brand: "Initiative Capacité de soins",
  headline: "Vérifiez vos bulletins de participation et vos chances de gagner",
  overviewTitle: "Aperçu {de_month}",
  month: "Mois",
  prizes: "Prix",
  prizeTbd: "Prix à annoncer",
  dateRange: "Plage de dates",
  lastSync: "Dernière synchronisation des données",
  notSynced: "Pas encore synchronisé",
  lastDraw: "Dernier tirage",
  noDraw: "Aucun tirage pour l’instant",
  pacific: "heure du Pacifique",
  monthlyThreshold: "Seuil mensuel",
  stretchThreshold: "Seuil additionnel",
  perHour: "consultations par heure",
  totalBallots: "Total des bulletins de participation",
  totalBallotsNote: "Nombre total de bulletins dans le bassin pour tous les cliniciens admissibles.",
  totalConsults: "Total des consultations au Québec et en Ontario",
  consultsNote: "Québec et Ontario combinés.",
  overallSatisfaction: "Score global de satisfaction des patients",
  pending: "Apparaît une fois les données chargées.",
  outOf5: "sur 5",
  findTitle: "Trouvez vos résultats",
  findHelp: "Entrez votre identifiant de clinicien unique. Vous ne pouvez consulter que vos propres résultats.",
  idLabel: "Identifiant de clinicien unique",
  placeholder: "p. ex. THVC-0042",
  checkBtn: "Vérifier mes résultats",
  checking: "Vérification en cours…",
  resultsTitle: "Vos résultats {de_month}",
  rate: "Consultations par heure",
  mineTotalConsults: "Nombre total de consultations",
  satisfactionScore: "Score de satisfaction des patients",
  ballotsEarned: "Bulletins de participation obtenus",
  thresholdPlusStretch: "Seuil + seuil additionnel",
  thresholdBallot: "Bulletin du seuil",
  noBallots: "Aucun bulletin de participation pour ce mois-ci.",
  winningOdds: "Chances de gagner",
  oddsDetail: "Environ 1 sur {n} ({b} de {t} bulletins).",
  earnBallot: "Obtenez un bulletin de participation pour prendre part au tirage.",
  loading: "Chargement des dernières données…",
  loadError: "Nous n’avons pas pu charger les derniers chiffres. Affichage des valeurs par défaut pour le moment.",
  noData: "Aucune donnée n’a encore été téléversée.",
  errBadRequest: "Entrez votre identifiant de clinicien unique.",
  errNotFound: `Nous n’avons pas pu trouver cet identifiant de clinicien unique pour ce mois-ci. Vérifiez qu’il n’y a pas de fautes de frappe. Vous avez encore des difficultés${NB}? Communiquez avec votre agent de liaison.`,
  errNoMonthData: "Nous avons trouvé votre dossier, mais il n’y a pas encore de données pour {month}.",
  errRateLimited: "Trop de recherches. Veuillez patienter quelques minutes et réessayer.",
  errUnavailable: "Nous n’avons pas pu charger les derniers chiffres. Veuillez réessayer sous peu.",
  errNetwork: "Impossible d’atteindre le serveur. Vérifiez votre connexion et réessayez.",
  errGeneric: "Une erreur est survenue. Réessayez.",
  footer: `Pour les cliniciens titulaires de plusieurs permis, les consultations en Ontario et au Québec sont combinées. Les probabilités de gagner indiquées concernent un tirage au sort unique${NB}; avec plusieurs prix, vos chances globales sont plus élevées.`,
  language: "Langue",
  ballotOne: "{n} bulletin",
  ballotMany: "{n} bulletins",
  loginIntro: "Entrez le mot de passe d’accès pour continuer.",
  loginPassword: "Mot de passe",
  loginContinue: "Continuer",
  loginWrong: "Ce mot de passe n’est pas le bon. Réessayez.",
  loginTooMany: "Trop de tentatives. Attendez quelques minutes et réessayez."
};

export const DICTIONARIES: Record<Lang, Record<Key, string>> = { en, fr };

export function t(lang: Lang, key: Key, vars?: Record<string, string | number>): string {
  const s = DICTIONARIES[lang][key];
  return vars ? s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m)) : s;
}

/** "1 ballot" / "2 ballots" (French treats 0 and 1 as singular). */
export const ballotsLabel = (lang: Lang, n: number) =>
  t(lang, (lang === "fr" ? n <= 1 : n === 1) ? "ballotOne" : "ballotMany", { n });

// ---------- formatting ----------
const loc = (l: Lang) => (l === "fr" ? "fr-CA" : "en-CA");
const DASH = "—";

export const fmtRate = (n: number | null | undefined, l: Lang) =>
  n == null ? DASH : new Intl.NumberFormat(loc(l), { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

export const fmtInt = (n: number | null | undefined, l: Lang) =>
  n == null ? DASH : new Intl.NumberFormat(loc(l), { maximumFractionDigits: 0 }).format(n);

/** ratio 0.105 -> "10.5%" (en) / "10,5 %" (fr); one decimal from 10%, two below. */
export function fmtPercent(ratio: number, l: Lang): string {
  const digits = ratio === 0 ? 0 : ratio >= 0.1 ? 1 : 2;
  return new Intl.NumberFormat(loc(l), { style: "percent", minimumFractionDigits: digits, maximumFractionDigits: digits }).format(ratio);
}

/** Ratings out of 5 show as "4.70 out of 5"; larger values are treated as a percent. */
export function satisfaction(r: number | null | undefined, l: Lang): { value: string; unit?: string } {
  if (r == null || !Number.isFinite(r)) return { value: DASH };
  return r <= 5 ? { value: fmtRate(r, l), unit: t(l, "outOf5") } : { value: fmtPercent(r / 100, l) };
}

export function fmtDateTime(iso: string | null | undefined, l: Lang): string {
  if (!iso) return DASH;
  return new Intl.DateTimeFormat(loc(l), { dateStyle: "medium", timeStyle: "short", timeZone: "America/Vancouver" }).format(new Date(iso));
}

/** "2026-10" -> "October 2026" / "octobre 2026". */
export function monthName(key: string, l: Lang): string {
  const [y, m] = key.split("-").map(Number);
  return new Intl.DateTimeFormat(loc(l), { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(y, m - 1, 1)));
}

/** French "de septembre 2026" / "d’octobre 2026" (elision before a vowel). English returns the plain name. */
export function deMonth(key: string, l: Lang): string {
  const name = monthName(key, l);
  if (l !== "fr") return name;
  return (/^[aeiouyàâéèêëîïôûù]/i.test(name) ? "d’" : "de ") + name;
}

export const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Admins can type prizes as "English text | Texte français". Without a "|", the same text is used for both. */
export function localizePrize(p: string, l: Lang): string {
  const parts = p.split("|").map((s) => s.trim()).filter(Boolean);
  if (parts.length === 0) return p;
  return l === "fr" ? parts[1] ?? parts[0] : parts[0];
}

// ---------- choosing the starting language ----------
export function langFromAcceptLanguage(header: string | null | undefined): Lang {
  let best: { lang: Lang; q: number } | null = null;
  for (const part of (header ?? "").split(",")) {
    const [tag, ...params] = part.trim().split(";");
    const base = tag.trim().toLowerCase().split("-")[0];
    if (base !== "en" && base !== "fr") continue;
    const qParam = params.find((p) => p.trim().startsWith("q="));
    const q = qParam ? Number(qParam.trim().slice(2)) : 1;
    if (Number.isFinite(q) && q > 0 && (!best || q > best.q)) best = { lang: base, q };
  }
  return best?.lang ?? "en";
}

/** First explicit choice wins (?lang=, then the lang inside ?next=, then the saved cookie); otherwise the browser's language. */
export function pickInitialLang(explicit: unknown, fromNext: unknown, cookie: unknown, acceptLanguage: string | null | undefined): Lang {
  for (const c of [explicit, fromNext, cookie]) if (isLang(c)) return c;
  return langFromAcceptLanguage(acceptLanguage);
}

export function langFromNextParam(next: string | undefined): string | null {
  try {
    return new URLSearchParams((next ?? "").split("?")[1] ?? "").get("lang");
  } catch {
    return null;
  }
}

/** Saves the choice for next time, updates <html lang>, and puts ?lang= in the address so the link can be shared. */
export function persistLang(l: Lang, { rewriteUrl = true }: { rewriteUrl?: boolean } = {}) {
  document.cookie = `${LANG_COOKIE}=${l}; path=/; max-age=31536000; samesite=lax`;
  document.documentElement.lang = l === "fr" ? "fr-CA" : "en-CA";
  if (rewriteUrl) {
    const url = new URL(window.location.href);
    url.searchParams.set("lang", l);
    window.history.replaceState(null, "", url.toString());
  }
}
