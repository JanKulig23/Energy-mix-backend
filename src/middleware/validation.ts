import { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError } from "zod";
import type { ApiErrorResponse } from "../types";

/**
 * Creates an Express middleware that validates `req.query` against
 * the provided Zod schema.
 *
 * On validation failure, responds with 400 and a structured error.
 */
export function validateQuery(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.query = schema.parse(req.query);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const body: ApiErrorResponse = {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid query parameters",
            details: error.errors.map((e) => ({
              field: e.path.join("."),
              message: e.message,
            })),
          },
        };
        res.status(400).json(body);
        return;
      }
      next(error);
    }
  };
}
