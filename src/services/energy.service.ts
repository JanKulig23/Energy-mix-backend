// Energy service - contains all business logic.
//
// • getEnergyMix():  Aggregates 30-min intervals into daily averages
//                    and computes the clean-energy percentage.
// • getOptimalChargingWindow(): Sliding-window search over forecast
//                               data to find the window with the
//                               highest clean-energy share.

import { fetchGenerationMix } from "../clients/carbonIntensity.client";
import { CLEAN_ENERGY_SOURCES, ALL_FUEL_TYPES } from "../config";
import {
  getThreeDayRange,
  getTwoDayForecastRange,
  toApiDateString,
  extractDateUTC,
  addDaysUTC,
} from "../utils/dateUtils";
import { logger } from "../utils/logger";
import type {
  DailyEnergyMix,
  FuelType,
  IntervalData,
  OptimalChargingWindow,
} from "../types";

// Public API

/**
 * Retrieves the energy mix for three days (today, tomorrow, day after tomorrow).
 *
 * Steps:
 *  1. Build the 3-day UTC date range.
 *  2. Fetch all 30-min intervals from the external API.
 *  3. Group intervals by date.
 *  4. Average each fuel type and compute the clean-energy percentage.
 */
export async function getEnergyMix(): Promise<DailyEnergyMix[]> {
  const { from, to } = getThreeDayRange();
  const intervals = await fetchGenerationMix(
    toApiDateString(from),
    toApiDateString(to),
  );

  const grouped = groupIntervalsByDate(intervals);
  const dailyMixes = computeDailyAverages(grouped);

  // The API may return intervals from adjacent days due to half-hour
  // boundary rounding. Filter to exactly the 3 expected dates.
  const expectedDates = new Set([
    extractDateUTC(from.toISOString()),
    extractDateUTC(addDaysUTC(from, 1).toISOString()),
    extractDateUTC(addDaysUTC(from, 2).toISOString()),
  ]);
  const filtered = dailyMixes.filter((d) => expectedDates.has(d.date));

  logger.info({ days: filtered.length }, "Computed daily energy mix averages");
  return filtered;
}

/**
 * Finds the contiguous time window (of the given length in hours)
 * with the highest average clean-energy percentage across the next
 * two forecast days.
 *
 * @param hours - Window length in full hours (1–6).
 */
export async function getOptimalChargingWindow(
  hours: number,
): Promise<OptimalChargingWindow> {
  const intervalsNeeded = hours * 2; // 30-min intervals per hour
  const { from, to } = getTwoDayForecastRange();

  const intervals = await fetchGenerationMix(
    toApiDateString(from),
    toApiDateString(to),
  );

  if (intervals.length < intervalsNeeded) {
    throw new InsufficientDataError(
      `Not enough forecast data available. Need ${intervalsNeeded} intervals but got ${intervals.length}.`,
    );
  }

  const result = findBestWindow(intervals, intervalsNeeded);

  logger.info(
    {
      startTime: result.startTime,
      endTime: result.endTime,
      cleanEnergyPercentage: result.cleanEnergyPercentage,
    },
    "Found optimal charging window",
  );

  return result;
}

// Internal helpers

/**
 * Groups intervals by their UTC date (derived from the `from` field).
 */
function groupIntervalsByDate(
  intervals: IntervalData[],
): Map<string, IntervalData[]> {
  const groups = new Map<string, IntervalData[]>();

  for (const interval of intervals) {
    const date = extractDateUTC(interval.from);
    const existing = groups.get(date) ?? [];
    existing.push(interval);
    groups.set(date, existing);
  }

  return groups;
}

/**
 * Computes the daily average for each fuel type and the aggregate
 * clean-energy percentage.
 */
function computeDailyAverages(
  grouped: Map<string, IntervalData[]>,
): DailyEnergyMix[] {
  const results: DailyEnergyMix[] = [];

  // Sort by date to guarantee chronological order
  const sortedDates = Array.from(grouped.keys()).sort();

  for (const date of sortedDates) {
    const intervals = grouped.get(date)!;
    const count = intervals.length;

    // Accumulate sums for each fuel type
    const sums: Record<string, number> = {};
    for (const fuel of ALL_FUEL_TYPES) {
      sums[fuel] = 0;
    }

    for (const interval of intervals) {
      for (const entry of interval.generationmix) {
        if (entry.fuel in sums) {
          sums[entry.fuel] += entry.perc;
        }
      }
    }

    // Compute averages (rounded to 1 decimal place)
    const generationMix = {} as Record<FuelType, number>;
    for (const fuel of ALL_FUEL_TYPES) {
      generationMix[fuel] = round(sums[fuel] / count, 1);
    }

    // Clean energy = sum of averaged clean sources
    const cleanEnergyPercentage = round(
      CLEAN_ENERGY_SOURCES.reduce((acc, fuel) => acc + generationMix[fuel], 0),
      1,
    );

    results.push({ date, generationMix, cleanEnergyPercentage });
  }

  return results;
}

/**
 * Computes the clean-energy percentage for a single interval.
 */
function intervalCleanPercentage(interval: IntervalData): number {
  return interval.generationmix
    .filter((entry) => (CLEAN_ENERGY_SOURCES as readonly string[]).includes(entry.fuel))
    .reduce((sum, entry) => sum + entry.perc, 0);
}

/**
 * Sliding-window search for the window with the highest average
 * clean-energy percentage.
 *
 * Time complexity: O(n) where n = number of intervals.
 */
function findBestWindow(
  intervals: IntervalData[],
  windowSize: number,
): OptimalChargingWindow {
  // Pre-compute clean percentages for every interval
  const cleanPercentages = intervals.map(intervalCleanPercentage);

  // Compute initial window sum
  let windowSum = 0;
  for (let i = 0; i < windowSize; i++) {
    windowSum += cleanPercentages[i];
  }

  let bestSum = windowSum;
  let bestStart = 0;

  // Slide the window
  for (let i = 1; i <= intervals.length - windowSize; i++) {
    windowSum = windowSum - cleanPercentages[i - 1] + cleanPercentages[i + windowSize - 1];
    if (windowSum > bestSum) {
      bestSum = windowSum;
      bestStart = i;
    }
  }

  const startTime = intervals[bestStart].from;
  const endTime = intervals[bestStart + windowSize - 1].to;
  const cleanEnergyPercentage = round(bestSum / windowSize, 1);

  return { startTime, endTime, cleanEnergyPercentage };
}

/**
 * Rounds a number to the specified number of decimal places.
 */
function round(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/**
 * Custom error for cases where the API does not return enough data
 * to fill the requested charging window.
 */
export class InsufficientDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InsufficientDataError";
  }
}
