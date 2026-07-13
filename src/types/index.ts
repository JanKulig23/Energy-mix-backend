// TypeScript types & interfaces shared across the backend.

/** Fuel types returned by the Carbon Intensity API. */
export type FuelType =
  | "biomass"
  | "coal"
  | "imports"
  | "gas"
  | "nuclear"
  | "other"
  | "hydro"
  | "solar"
  | "wind";

/** A single fuel entry within a generation mix interval. */
interface GenerationMixEntry {
  fuel: FuelType;
  perc: number;
}

/** A single 30-minute interval from the external API. */
export interface IntervalData {
  from: string;
  to: string;
  generationmix: GenerationMixEntry[];
}

/** Raw response shape from GET /generation/{from}/{to}. */
export interface CarbonIntensityApiResponse {
  data: IntervalData[];
}

/**
 * Aggregated energy mix for a single day.
 * Each fuel value is the daily average percentage.
 */
export interface DailyEnergyMix {
  date: string;
  generationMix: Record<FuelType, number>;
  cleanEnergyPercentage: number;
}

/** Response payload for the energy-mix endpoint. */
export interface EnergyMixResponse {
  data: DailyEnergyMix[];
}

/** The optimal time window for EV charging. */
export interface OptimalChargingWindow {
  startTime: string;
  endTime: string;
  cleanEnergyPercentage: number;
}

/** Response payload for the optimal-charging endpoint. */
export interface OptimalChargingResponse {
  data: OptimalChargingWindow;
}

/** Structured API error response. */
export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: unknown[];
  };
}
