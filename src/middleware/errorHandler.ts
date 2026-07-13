import { Request, Response, NextFunction } from "express";
import { CarbonIntensityApiError } from "../clients/carbonIntensity.client";
import { InsufficientDataError } from "../services/energy.service";
import { logger } from "../utils/logger";
import type { ApiErrorResponse } from "../types";

/**
 * Express error-handling middleware (4-argument signature).
 * Maps known error types to appropriate HTTP status codes.
 */
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  logger.error({ err: err.message, stack: err.stack }, "Unhandled error");

  if (err instanceof CarbonIntensityApiError) {
    const body: ApiErrorResponse = {
      error: {
        code: "EXTERNAL_API_ERROR",
        message: "Failed to fetch data from the Carbon Intensity API",
        details: [{ originalMessage: err.message, statusCode: err.statusCode }],
      },
    };
    res.status(502).json(body);
    return;
  }

  if (err instanceof InsufficientDataError) {
    const body: ApiErrorResponse = {
      error: {
        code: "INSUFFICIENT_DATA",
        message: err.message,
      },
    };
    res.status(422).json(body);
    return;
  }

  const body: ApiErrorResponse = {
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "An unexpected error occurred",
    },
  };
  res.status(500).json(body);
}
