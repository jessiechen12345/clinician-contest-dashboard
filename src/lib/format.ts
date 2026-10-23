export const fmtRate = (n: number | null | undefined) => (n == null ? "—" : n.toFixed(2));
export const fmtInt = (n: number | null | undefined) => (n == null ? "—" : Math.round(n).toLocaleString("en-CA"));
export function fmtDateTime(iso?: string | null) {
  if (!iso) return "Not yet";
  return new Intl.DateTimeFormat("en-CA", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Vancouver"
  }).format(new Date(iso));
}
export function fmtDate(d?: string) {
  if (!d) return "";
  const [y, m, day] = d.split("-").map(Number);
  return new Intl.DateTimeFormat("en-CA", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(Date.UTC(y, m - 1, day)));
}
