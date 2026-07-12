// Unit tests for date utility functions.

import { describe, it, expect } from "vitest";
import {
  startOfDayUTC,
  endOfDayUTC,
  addDaysUTC,
  toApiDateString,
  extractDateUTC,
  getThreeDayRange,
  getTwoDayForecastRange,
} from "../../src/utils/dateUtils";

describe("dateUtils", () => {
  describe("startOfDayUTC", () => {
    it("should set time to 00:00:00.000 UTC", () => {
      // Given
      const date = new Date("2026-07-10T15:30:45.123Z");

      // When
      const result = startOfDayUTC(date);

      // Then
      expect(result.toISOString()).toBe("2026-07-10T00:00:00.000Z");
    });

    it("should not mutate the original date", () => {
      // Given
      const original = new Date("2026-07-10T15:30:45.123Z");
      const originalTime = original.getTime();

      // When
      startOfDayUTC(original);

      // Then
      expect(original.getTime()).toBe(originalTime);
    });
  });

  describe("endOfDayUTC", () => {
    it("should set time to 23:59:59.999 UTC", () => {
      // Given
      const date = new Date("2026-07-10T08:00:00.000Z");

      // When
      const result = endOfDayUTC(date);

      // Then
      expect(result.toISOString()).toBe("2026-07-10T23:59:59.999Z");
    });
  });

  describe("addDaysUTC", () => {
    it("should add the specified number of days", () => {
      // Given
      const date = new Date("2026-07-10T12:00:00Z");

      // When
      const result = addDaysUTC(date, 2);

      // Then
      expect(result.toISOString()).toBe("2026-07-12T12:00:00.000Z");
    });

    it("should handle month boundaries", () => {
      // Given
      const date = new Date("2026-07-30T12:00:00Z");

      // When
      const result = addDaysUTC(date, 3);

      // Then
      expect(result.toISOString()).toBe("2026-08-02T12:00:00.000Z");
    });
  });

  describe("toApiDateString", () => {
    it("should format date for the Carbon Intensity API", () => {
      // Given
      const date = new Date("2026-07-10T00:00:00.000Z");

      // When
      const result = toApiDateString(date);

      // Then
      expect(result).toBe("2026-07-10T00:00:00Z");
    });
  });

  describe("extractDateUTC", () => {
    it("should extract YYYY-MM-DD from an ISO string", () => {
      // Given / When
      const result = extractDateUTC("2026-07-10T15:30:00Z");

      // Then
      expect(result).toBe("2026-07-10");
    });

    it("should handle dates near midnight correctly", () => {
      // Given / When
      const result = extractDateUTC("2026-07-10T23:59:59.999Z");

      // Then
      expect(result).toBe("2026-07-10");
    });
  });

  describe("getThreeDayRange", () => {
    it("should return a range spanning 3 days from today", () => {
      // Given / When
      const { from, to } = getThreeDayRange();
      const now = new Date();

      // Then
      expect(from.getUTCHours()).toBe(0);
      expect(from.getUTCMinutes()).toBe(0);
      expect(to.getUTCHours()).toBe(23);
      expect(to.getUTCMinutes()).toBe(59);

      const diffDays = (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24);
      expect(diffDays).toBeGreaterThanOrEqual(2);
      expect(diffDays).toBeLessThan(3);
    });
  });

  describe("getTwoDayForecastRange", () => {
    it("should return a range starting tomorrow", () => {
      // Given / When
      const { from, to } = getTwoDayForecastRange();
      const tomorrow = new Date();
      tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

      // Then
      expect(from.getUTCDate()).toBe(tomorrow.getUTCDate());
      expect(from.getUTCHours()).toBe(0);
    });
  });
});
