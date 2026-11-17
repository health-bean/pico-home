/**
 * A span of days the way people say it: days up to two weeks, then weeks,
 * then "about N months", then "about N years". Exact counts past a couple of
 * months ("206 days") are noise for a home-maintenance schedule.
 */
export function spanInWords(days: number): string {
  const n = Math.abs(days);
  const plural = (v: number, unit: string) => `${v} ${unit}${v === 1 ? "" : "s"}`;
  if (n < 14) return plural(n, "day");
  if (n < 57) return plural(Math.round(n / 7), "week");
  if (n < 548) return `about ${plural(Math.round(n / 30.44), "month")}`;
  return `about ${plural(Math.round(n / 365.25), "year")}`;
}
