// Application configuration — loaded from environment variables
// with sensible defaults for local development.

export const config = {
  /** Server port */
  port: parseInt(process.env.PORT || "3001", 10),

  /** Runtime environment */
  nodeEnv: process.env.NODE_ENV || "development",

  /** Base URL of the Carbon Intensity API */
  carbonIntensityApiUrl:
    process.env.CARBON_INTENSITY_API_URL || "https://api.carbonintensity.org.uk",

  /** Allowed CORS origin (frontend URL) */
  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:3000",

  /** Timeout for external API calls (ms) */
  apiTimeoutMs: parseInt(process.env.API_TIMEOUT_MS || "10000", 10),

  /** Minimum number of hours for a charging window */
  chargingHoursMin: 1,

  /** Maximum number of hours for a charging window */
  chargingHoursMax: 6,

  /** Number of days to display in the energy mix overview (today + N-1) */
  energyMixDays: 3,

  /** Number of forecast days for the charging optimizer */
  forecastDays: 2,
} as const;

/**
 * Energy sources classified as "clean" for the purpose of
 * computing the clean-energy percentage.
 */
export const CLEAN_ENERGY_SOURCES = ["biomass", "nuclear", "hydro", "wind", "solar"] as const;

/**
 * All known fuel types returned by the Carbon Intensity API.
 */
export const ALL_FUEL_TYPES = [
  "biomass",
  "coal",
  "imports",
  "gas",
  "nuclear",
  "other",
  "hydro",
  "solar",
  "wind",
] as const;
