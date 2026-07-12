// Mock data fixtures for Carbon Intensity API responses.
// Used across unit and integration tests.

import type { IntervalData } from "../../src/types";

/**
 * Creates a single mock interval with the given fuel percentages.
 * Defaults produce a realistic UK energy mix.
 */
export function createMockInterval(
  from: string,
  to: string,
  overrides: Partial<Record<string, number>> = {},
): IntervalData {
  return {
    from,
    to,
    generationmix: [
      { fuel: "biomass", perc: overrides.biomass ?? 5.0 },
      { fuel: "coal", perc: overrides.coal ?? 0.0 },
      { fuel: "imports", perc: overrides.imports ?? 18.0 },
      { fuel: "gas", perc: overrides.gas ?? 45.0 },
      { fuel: "nuclear", perc: overrides.nuclear ?? 15.0 },
      { fuel: "other", perc: overrides.other ?? 1.0 },
      { fuel: "hydro", perc: overrides.hydro ?? 2.0 },
      { fuel: "solar", perc: overrides.solar ?? 7.0 },
      { fuel: "wind", perc: overrides.wind ?? 7.0 },
    ],
  };
}

/**
 * Generates a sequence of mock intervals for a given date.
 * Creates 48 half-hour intervals (00:00 → 23:30) to simulate a full day.
 */
export function createMockDayIntervals(
  date: string,
  overrides: Partial<Record<string, number>> = {},
): IntervalData[] {
  const intervals: IntervalData[] = [];

  for (let i = 0; i < 48; i++) {
    const hour = String(Math.floor(i / 2)).padStart(2, "0");
    const minute = i % 2 === 0 ? "00" : "30";
    const nextMinute = i % 2 === 0 ? "30" : "00";
    const nextHour =
      i % 2 === 0 ? hour : String(Math.floor(i / 2) + 1).padStart(2, "0");

    const from = `${date}T${hour}:${minute}Z`;
    const to = `${date}T${nextHour}:${nextMinute}Z`;

    intervals.push(createMockInterval(from, to, overrides));
  }

  return intervals;
}

/**
 * Creates a set of intervals where clean energy varies,
 * useful for testing the sliding-window algorithm.
 *
 * Returns 12 intervals (6 hours) with a clear peak in the middle
 * (intervals 4–7 have the highest clean energy).
 */
export function createMockIntervalsWithPeak(): IntervalData[] {
  const baseDate = "2026-07-11";
  const intervals: IntervalData[] = [];

  // Clean energy percentages for each interval:
  // [20, 25, 30, 35, 60, 65, 70, 55, 40, 30, 25, 20]
  const cleanPercentages = [20, 25, 30, 35, 60, 65, 70, 55, 40, 30, 25, 20];

  for (let i = 0; i < cleanPercentages.length; i++) {
    const hour = String(Math.floor(i / 2)).padStart(2, "0");
    const minute = i % 2 === 0 ? "00" : "30";
    const nextMinute = i % 2 === 0 ? "30" : "00";
    const nextHour =
      i % 2 === 0 ? hour : String(Math.floor(i / 2) + 1).padStart(2, "0");

    const cleanPct = cleanPercentages[i];
    // Distribute clean energy among clean sources
    const wind = cleanPct * 0.4;
    const solar = cleanPct * 0.2;
    const nuclear = cleanPct * 0.2;
    const biomass = cleanPct * 0.1;
    const hydro = cleanPct * 0.1;
    const gas = 100 - cleanPct - 10; // 10% for imports + other
    const imports = 8;
    const other = 2;

    intervals.push(
      createMockInterval(`${baseDate}T${hour}:${minute}Z`, `${baseDate}T${nextHour}:${nextMinute}Z`, {
        wind,
        solar,
        nuclear,
        biomass,
        hydro,
        gas,
        imports,
        other,
      }),
    );
  }

  return intervals;
}
