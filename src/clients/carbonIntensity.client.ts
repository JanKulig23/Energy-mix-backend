// Carbon Intensity API client.
// Handles all communication with the external API, including
// timeouts and error wrapping.

import axios, { AxiosError } from "axios";
import { config } from "../config";
import { logger } from "../utils/logger";
import type { CarbonIntensityApiResponse, IntervalData } from "../types";

/**
 * Fetches generation mix data from the Carbon Intensity API
 * for the specified UTC date range.
 *
 * @param from - Start datetime (ISO string)
 * @param to   - End datetime (ISO string)
 * @returns Array of 30-minute interval data
 */
export async function fetchGenerationMix(from: string, to: string): Promise<IntervalData[]> {
  const url = `${config.carbonIntensityApiUrl}/generation/${from}/${to}`;

  logger.info({ url }, "Fetching generation mix from Carbon Intensity API");

  try {
    const response = await axios.get<CarbonIntensityApiResponse>(url, {
      headers: { Accept: "application/json" },
      timeout: config.apiTimeoutMs,
    });

    const intervals = response.data?.data ?? [];
    logger.info({ intervalCount: intervals.length }, "Successfully fetched generation mix data");

    return intervals;
  } catch (error) {
    const axiosError = error as AxiosError;
    const status = axiosError.response?.status;
    const message = axiosError.message;

    logger.error({ status, message, url }, "Failed to fetch data from Carbon Intensity API");

    throw new CarbonIntensityApiError(
      `External API request failed: ${message}`,
      status,
    );
  }
}

/**
 * Custom error class for Carbon Intensity API failures.
 * Preserves the upstream HTTP status for proper error handling.
 */
export class CarbonIntensityApiError extends Error {
  public readonly statusCode?: number;

  constructor(message: string, statusCode?: number) {
    super(message);
    this.name = "CarbonIntensityApiError";
    this.statusCode = statusCode;
  }
}
