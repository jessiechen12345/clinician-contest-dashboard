/** Month key format used everywhere: "YYYY-MM" (e.g. "2026-10"). */
export type MonthKey = string;

export interface MonthMetrics {
  /** SUM ON/QC Consults – already combined across provinces (multi-licensed safe). */
  consults: number | null;
  /** All Up: Consults/hr */
  rate: number | null;
  /** PSAT score for the month (0 / null when not enough encounters). */
  psat: number | null;
  /** "Ballots Earned" as calculated by the spreadsheet (kept for reconciliation only). */
  sheetBallots: number | null;
}

/** Minimal projection of one clinician. Lives server-side only. */
export interface ClinicianRecord {
  id: string; // Unique ID
  email: string; // THVC Email (lower-case)
  name: string; // Full Name – admin/draw use only, NEVER returned by public APIs
  status: string;
  months: Record<MonthKey, MonthMetrics>;
}

export interface Dataset {
  syncedAt: string; // ISO
  source: "google-sheet" | "csv-upload";
  months: MonthKey[]; // months detected in the file
  records: ClinicianRecord[];
}

export interface MonthConfig {
  prizes: string[];
  target: number;
  stretch: number;
  /** Minimum combined ON+QC consults to qualify (sheet rule: 70). */
  minConsults: number;
  /** Minimum PSAT to qualify (sheet rule: 4.65). Set 0 to disable. */
  minPsat: number;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  lastDrawAt: string | null;
}

export interface Settings {
  activeMonth: MonthKey;
  /** Only these statuses are counted in the pool and can win. */
  eligibleStatuses: string[];
  months: Record<MonthKey, Partial<MonthConfig>>;
}

export interface BallotCheck {
  key: "volume" | "psat" | "target" | "stretch";
  label: string;
  met: boolean;
  actual: number | null;
  required: number;
}

export interface BallotResult {
  ballots: 0 | 1 | 2;
  hasData: boolean;
  checks: BallotCheck[];
  breakdown: { label: string; ballots: number }[];
}

export interface DrawWinner {
  id: string;
  name: string;
  email: string;
  ballots: number;
}

export interface DrawRecord {
  id: string;
  month: MonthKey;
  at: string;
  by: string;
  prize: string;
  poolBallots: number;
  poolParticipants: number;
  winners: DrawWinner[];
}
