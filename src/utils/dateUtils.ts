/**
 * Returns the start of the given date in UTC (00:00:00.000Z).
 */
export function startOfDayUTC(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/**
 * Returns the end of the given date in UTC (23:59:59.999Z).
 */
export function endOfDayUTC(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(23, 59, 59, 999);
  return d;
}

/**
 * Adds the specified number of days to a date (UTC).
 */
export function addDaysUTC(date: Date, days: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

/**
 * Formats a Date to an ISO string suitable for the Carbon Intensity API.
 * Example: "2026-07-10T00:00Z"
 */
export function toApiDateString(date: Date): string {
  return date.toISOString().replace(".000Z", "Z");
}

/**
 * Extracts the date portion (YYYY-MM-DD) from an ISO datetime string
 * using the UTC date.
 */
export function extractDateUTC(isoString: string): string {
  const d = new Date(isoString);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Returns the 3-day date range [today 00:00 UTC, day-after-tomorrow 23:59 UTC].
 */
export function getThreeDayRange(): { from: Date; to: Date } {
  const now = new Date();
  const from = startOfDayUTC(now);
  const to = endOfDayUTC(addDaysUTC(now, 2));
  return { from, to };
}

/**
 * Returns the 2-day forecast range [tomorrow 00:00 UTC, day-after-tomorrow 23:59 UTC].
 */
export function getTwoDayForecastRange(): { from: Date; to: Date } {
  const now = new Date();
  const from = startOfDayUTC(addDaysUTC(now, 1));
  const to = endOfDayUTC(addDaysUTC(now, 2));
  return { from, to };
}
