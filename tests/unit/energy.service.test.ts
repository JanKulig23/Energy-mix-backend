// Unit tests for the energy service (business logic).
//
// The external API client is mocked so these tests run without
// network access and verify pure computation.

import { describe, it, expect, vi, beforeEach } from "vitest";
import * as energyService from "../../src/services/energy.service";
import * as apiClient from "../../src/clients/carbonIntensity.client";
import {
  createMockDayIntervals,
  createMockIntervalsWithPeak,
  createMockInterval,
} from "../mocks/carbonIntensityData";

// Mock the external API client
vi.mock("../../src/clients/carbonIntensity.client");
const mockedFetchGenerationMix = vi.mocked(apiClient.fetchGenerationMix);

// ── Shared test fixtures ──────────────────────────────────────────

/** Returns today's date and the next two days as YYYY-MM-DD (UTC). */
function getExpectedDates(): [string, string, string] {
  const now = new Date();
  const today = now.toISOString().split("T")[0];
  const tomorrow = new Date(now.getTime() + 86400000).toISOString().split("T")[0];
  const dayAfter = new Date(now.getTime() + 172800000).toISOString().split("T")[0];
  return [today, tomorrow, dayAfter];
}

describe("EnergyService", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  // ────────────────────────────────────────────────────────────────
  // getEnergyMix
  // ────────────────────────────────────────────────────────────────

  describe("getEnergyMix", () => {
    it("should return daily averages for three days", async () => {
      // Given
      const [today, tomorrow, dayAfter] = getExpectedDates();
      const day1 = createMockDayIntervals(today, {
        biomass: 5, nuclear: 15, hydro: 2, wind: 10, solar: 8,
        gas: 40, coal: 0, imports: 18, other: 2,
      });
      const day2 = createMockDayIntervals(tomorrow, {
        biomass: 6, nuclear: 14, hydro: 3, wind: 12, solar: 10,
        gas: 35, coal: 0, imports: 17, other: 3,
      });
      const day3 = createMockDayIntervals(dayAfter, {
        biomass: 4, nuclear: 16, hydro: 1, wind: 8, solar: 6,
        gas: 45, coal: 0, imports: 19, other: 1,
      });
      mockedFetchGenerationMix.mockResolvedValue([...day1, ...day2, ...day3]);

      // When
      const result = await energyService.getEnergyMix();

      // Then
      expect(result).toHaveLength(3);

      expect(result[0].date).toBe(today);
      expect(result[0].cleanEnergyPercentage).toBe(40); // 5+15+2+10+8
      expect(result[0].generationMix.biomass).toBe(5);
      expect(result[0].generationMix.wind).toBe(10);

      expect(result[1].date).toBe(tomorrow);
      expect(result[1].cleanEnergyPercentage).toBe(45); // 6+14+3+12+10

      expect(result[2].date).toBe(dayAfter);
      expect(result[2].cleanEnergyPercentage).toBe(35); // 4+16+1+8+6
    });

    it("should correctly average when intervals have varying values", async () => {
      // Given
      const [today] = getExpectedDates();
      const intervals = [
        createMockInterval(`${today}T00:00Z`, `${today}T00:30Z`, {
          wind: 10, solar: 20, biomass: 5, nuclear: 15, hydro: 2,
          gas: 30, coal: 0, imports: 15, other: 3,
        }),
        createMockInterval(`${today}T00:30Z`, `${today}T01:00Z`, {
          wind: 20, solar: 10, biomass: 5, nuclear: 15, hydro: 4,
          gas: 28, coal: 0, imports: 15, other: 3,
        }),
      ];
      mockedFetchGenerationMix.mockResolvedValue(intervals);

      // When
      const result = await energyService.getEnergyMix();

      // Then
      expect(result).toHaveLength(1);
      expect(result[0].generationMix.wind).toBe(15);   // (10+20)/2
      expect(result[0].generationMix.solar).toBe(15);   // (20+10)/2
      expect(result[0].generationMix.hydro).toBe(3);    // (2+4)/2
      expect(result[0].cleanEnergyPercentage).toBe(53);  // 5+15+3+15+15
    });

    it("should sort results chronologically", async () => {
      // Given — days in reverse order
      const [today, tomorrow] = getExpectedDates();
      const day2 = createMockDayIntervals(tomorrow);
      const day1 = createMockDayIntervals(today);
      mockedFetchGenerationMix.mockResolvedValue([...day2, ...day1]);

      // When
      const result = await energyService.getEnergyMix();

      // Then
      expect(result[0].date).toBe(today);
      expect(result[1].date).toBe(tomorrow);
    });

    it("should filter out days outside the 3-day range", async () => {
      // Given — extra day before today
      const [today, tomorrow, dayAfter] = getExpectedDates();
      const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
      const extraDay = createMockDayIntervals(yesterday);
      const day1 = createMockDayIntervals(today);
      const day2 = createMockDayIntervals(tomorrow);
      const day3 = createMockDayIntervals(dayAfter);
      mockedFetchGenerationMix.mockResolvedValue([...extraDay, ...day1, ...day2, ...day3]);

      // When
      const result = await energyService.getEnergyMix();

      // Then
      expect(result).toHaveLength(3);
      expect(result[0].date).toBe(today);
      expect(result[1].date).toBe(tomorrow);
      expect(result[2].date).toBe(dayAfter);
    });
  });

  // ────────────────────────────────────────────────────────────────
  // getOptimalChargingWindow
  // ────────────────────────────────────────────────────────────────

  describe("getOptimalChargingWindow", () => {
    it("should find the window with the highest clean energy percentage", async () => {
      // Given — peak at intervals 4-7
      const intervals = createMockIntervalsWithPeak();
      mockedFetchGenerationMix.mockResolvedValue(intervals);

      // When
      const result = await energyService.getOptimalChargingWindow(2);

      // Then — best 4-interval window: indices 4-7 → (60+65+70+55)/4 = 62.5
      expect(result.cleanEnergyPercentage).toBe(62.5);
      expect(result.startTime).toBe("2026-07-11T02:00Z");
      expect(result.endTime).toBe("2026-07-11T04:00Z");
    });

    it("should handle a 1-hour window (2 intervals)", async () => {
      // Given
      const intervals = createMockIntervalsWithPeak();
      mockedFetchGenerationMix.mockResolvedValue(intervals);

      // When
      const result = await energyService.getOptimalChargingWindow(1);

      // Then — best 2-interval: indices 5-6 → (65+70)/2 = 67.5
      expect(result.cleanEnergyPercentage).toBe(67.5);
    });

    it("should throw InsufficientDataError when not enough intervals", async () => {
      // Given — only 2 intervals for a 3-hour request
      const intervals = [
        createMockInterval("2026-07-11T00:00Z", "2026-07-11T00:30Z"),
        createMockInterval("2026-07-11T00:30Z", "2026-07-11T01:00Z"),
      ];
      mockedFetchGenerationMix.mockResolvedValue(intervals);

      // When / Then
      await expect(
        energyService.getOptimalChargingWindow(3),
      ).rejects.toThrow(energyService.InsufficientDataError);
    });

    it("should handle a window spanning the entire available range", async () => {
      // Given — exactly 6 intervals for a 3-hour window
      const fixedMix = { wind: 30, solar: 10, nuclear: 10, biomass: 5, hydro: 5 };
      const intervals = [
        createMockInterval("2026-07-11T00:00Z", "2026-07-11T00:30Z", fixedMix),
        createMockInterval("2026-07-11T00:30Z", "2026-07-11T01:00Z", fixedMix),
        createMockInterval("2026-07-11T01:00Z", "2026-07-11T01:30Z", fixedMix),
        createMockInterval("2026-07-11T01:30Z", "2026-07-11T02:00Z", fixedMix),
        createMockInterval("2026-07-11T02:00Z", "2026-07-11T02:30Z", fixedMix),
        createMockInterval("2026-07-11T02:30Z", "2026-07-11T03:00Z", fixedMix),
      ];
      mockedFetchGenerationMix.mockResolvedValue(intervals);

      // When
      const result = await energyService.getOptimalChargingWindow(3);

      // Then
      expect(result.startTime).toBe("2026-07-11T00:00Z");
      expect(result.endTime).toBe("2026-07-11T03:00Z");
      expect(result.cleanEnergyPercentage).toBe(60);
    });
  });
});
