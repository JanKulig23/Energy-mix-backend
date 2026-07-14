import { Router } from "express";
import { z } from "zod";
import * as energyController from "../controllers/energy.controller";
import { validateQuery } from "../middleware/validation";
import { config } from "../config";

const router = Router();

const dateQuerySchema = z.coerce.date().optional();

const energyMixQuerySchema = z.object({
  from: dateQuerySchema,
  to: dateQuerySchema,
}).refine(data => {
  if (data.from && data.to) {
    return data.from <= data.to;
  }
  return true;
}, { message: "'from' date must be before or equal to 'to' date", path: ["from"] });

// Validation schema for the optimal-charging query params
const optimalChargingQuerySchema = z.object({
  hours: z.coerce
    .number({
      required_error: "The 'hours' query parameter is required",
      invalid_type_error: "The 'hours' parameter must be a number",
    })
    .int("Hours must be a whole number")
    .min(config.chargingHoursMin, `Hours must be at least ${config.chargingHoursMin}`)
    .max(config.chargingHoursMax, `Hours must be at most ${config.chargingHoursMax}`),
  from: dateQuerySchema,
  to: dateQuerySchema,
}).refine(data => {
  if (data.from && data.to) {
    return data.from <= data.to;
  }
  return true;
}, { message: "'from' date must be before or equal to 'to' date", path: ["from"] });

/**
 * @openapi
 * /api/energy-mix:
 *   get:
 *     summary: Get energy generation mix
 *     description: |
 *       Returns the average energy generation mix for three days
 *       (today, tomorrow, day after tomorrow). Each day includes
 *       the percentage share of each fuel type and the total
 *       clean energy percentage.
 *     tags:
 *       - Energy
 *     responses:
 *       200:
 *         description: Successful response with daily energy mix data
 *       502:
 *         description: Failed to fetch data from the external API
 */
router.get(
  "/energy-mix",
  validateQuery(energyMixQuerySchema),
  energyController.getEnergyMix,
);

/**
 * @openapi
 * /api/optimal-charging:
 *   get:
 *     summary: Find optimal EV charging window
 *     description: |
 *       Calculates the optimal time window for EV charging within the
 *       next two forecast days. The window is chosen to maximise the
 *       average clean energy percentage (biomass, nuclear, hydro, wind, solar).
 *     tags:
 *       - Charging
 *     parameters:
 *       - in: query
 *         name: hours
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 6
 *         description: Length of the charging window in full hours (1–6)
 *       - in: query
 *         name: from
 *         required: false
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Start date for the window
 *       - in: query
 *         name: to
 *         required: false
 *         schema:
 *           type: string
 *           format: date-time
 *         description: End date for the window
 *     responses:
 *       200:
 *         description: Successful response with optimal charging window
 *       400:
 *         description: Validation error (invalid hours parameter)
 *       422:
 *         description: Not enough forecast data available
 *       502:
 *         description: Failed to fetch data from the external API
 */
router.get(
  "/optimal-charging",
  validateQuery(optimalChargingQuerySchema),
  energyController.getOptimalChargingWindow,
);

export default router;
