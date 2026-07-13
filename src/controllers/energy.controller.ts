import { Request, Response, NextFunction } from "express";
import * as energyService from "../services/energy.service";
import type { EnergyMixResponse, OptimalChargingResponse } from "../types";

/**
 * GET /api/energy-mix
 *
 * Returns the average generation mix for three days
 * (today, tomorrow, day after tomorrow).
 */
export async function getEnergyMix(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const data = await energyService.getEnergyMix();
    const response: EnergyMixResponse = { data };
    res.json(response);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/optimal-charging?hours=N
 *
 * Returns the optimal EV charging window for the next two days
 * based on the highest clean-energy percentage.
 */
export async function getOptimalChargingWindow(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const hours = Number(req.query.hours);
    const data = await energyService.getOptimalChargingWindow(hours);
    const response: OptimalChargingResponse = { data };
    res.json(response);
  } catch (error) {
    next(error);
  }
}
