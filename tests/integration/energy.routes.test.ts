// Integration tests for API endpoints.
// Uses Supertest to make real HTTP calls against the Express app
// with the external API client mocked.

import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import app from "../../src/app";
import * as apiClient from "../../src/clients/carbonIntensity.client";
import {
  createMockDayIntervals,
  createMockIntervalsWithPeak,
} from "../mocks/carbonIntensityData";

vi.mock("../../src/clients/carbonIntensity.client");
const mockedFetchGenerationMix = vi.mocked(apiClient.fetchGenerationMix);

// ── Shared fixture ────────────────────────────────────────────────

function getThreeDayMockData() {
  const now = new Date();
  const today = now.toISOString().split("T")[0];
  const tomorrow = new Date(now.getTime() + 86400000).toISOString().split("T")[0];
  const dayAfter = new Date(now.getTime() + 172800000).toISOString().split("T")[0];

  return [
    ...createMockDayIntervals(today),
    ...createMockDayIntervals(tomorrow),
    ...createMockDayIntervals(dayAfter),
  ];
}

describe("Energy API Routes", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  // ────────────────────────────────────────────────────────────────
  // GET /api/energy-mix
  // ────────────────────────────────────────────────────────────────

  describe("GET /api/energy-mix", () => {
    it("should return 200 with daily energy mix data", async () => {
      // Given
      const mockData = getThreeDayMockData();
      mockedFetchGenerationMix.mockResolvedValue(mockData);

      // When
      const response = await request(app)
        .get("/api/energy-mix")
        .expect("Content-Type", /json/)
        .expect(200);

      // Then
      expect(response.body).toHaveProperty("data");
      expect(response.body.data).toHaveLength(3);

      for (const day of response.body.data) {
        expect(day).toHaveProperty("date");
        expect(day).toHaveProperty("generationMix");
        expect(day).toHaveProperty("cleanEnergyPercentage");
        expect(typeof day.cleanEnergyPercentage).toBe("number");

        expect(day.generationMix).toHaveProperty("biomass");
        expect(day.generationMix).toHaveProperty("coal");
        expect(day.generationMix).toHaveProperty("imports");
        expect(day.generationMix).toHaveProperty("gas");
        expect(day.generationMix).toHaveProperty("nuclear");
        expect(day.generationMix).toHaveProperty("other");
        expect(day.generationMix).toHaveProperty("hydro");
        expect(day.generationMix).toHaveProperty("solar");
        expect(day.generationMix).toHaveProperty("wind");
      }
    });

    it("should return 502 when the external API fails", async () => {
      // Given
      mockedFetchGenerationMix.mockRejectedValue(
        new apiClient.CarbonIntensityApiError("Connection refused", 503),
      );

      // When
      const response = await request(app)
        .get("/api/energy-mix")
        .expect("Content-Type", /json/)
        .expect(502);

      // Then
      expect(response.body.error.code).toBe("EXTERNAL_API_ERROR");
    });
  });

  // ────────────────────────────────────────────────────────────────
  // GET /api/optimal-charging
  // ────────────────────────────────────────────────────────────────

  describe("GET /api/optimal-charging", () => {
    it("should return 200 with optimal charging window", async () => {
      // Given
      const mockData = createMockIntervalsWithPeak();
      mockedFetchGenerationMix.mockResolvedValue(mockData);

      // When
      const response = await request(app)
        .get("/api/optimal-charging?hours=2")
        .expect("Content-Type", /json/)
        .expect(200);

      // Then
      expect(response.body).toHaveProperty("data");
      expect(response.body.data).toHaveProperty("startTime");
      expect(response.body.data).toHaveProperty("endTime");
      expect(response.body.data).toHaveProperty("cleanEnergyPercentage");
      expect(typeof response.body.data.cleanEnergyPercentage).toBe("number");
    });

    it("should return 400 when hours parameter is missing", async () => {
      // Given / When
      const response = await request(app)
        .get("/api/optimal-charging")
        .expect("Content-Type", /json/)
        .expect(400);

      // Then
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("should return 400 when hours is below minimum (0)", async () => {
      // Given / When
      const response = await request(app)
        .get("/api/optimal-charging?hours=0")
        .expect("Content-Type", /json/)
        .expect(400);

      // Then
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("should return 400 when hours exceeds maximum (7)", async () => {
      // Given / When
      const response = await request(app)
        .get("/api/optimal-charging?hours=7")
        .expect("Content-Type", /json/)
        .expect(400);

      // Then
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("should return 400 when hours is not a number", async () => {
      // Given / When
      const response = await request(app)
        .get("/api/optimal-charging?hours=abc")
        .expect("Content-Type", /json/)
        .expect(400);

      // Then
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("should return 400 when hours is a decimal", async () => {
      // Given / When
      const response = await request(app)
        .get("/api/optimal-charging?hours=2.5")
        .expect("Content-Type", /json/)
        .expect(400);

      // Then
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("should accept valid hours values (1 through 6)", async () => {
      // Given
      const mockData = createMockIntervalsWithPeak();

      for (let hours = 1; hours <= 6; hours++) {
        mockedFetchGenerationMix.mockResolvedValue(mockData);

        // When
        const response = await request(app)
          .get(`/api/optimal-charging?hours=${hours}`)
          .expect(200);

        // Then
        expect(response.body.data).toHaveProperty("cleanEnergyPercentage");
      }
    });
  });

  // ────────────────────────────────────────────────────────────────
  // Health check
  // ────────────────────────────────────────────────────────────────

  describe("GET /health", () => {
    it("should return 200 with status ok", async () => {
      // Given / When
      const response = await request(app)
        .get("/health")
        .expect("Content-Type", /json/)
        .expect(200);

      // Then
      expect(response.body.status).toBe("ok");
      expect(response.body).toHaveProperty("timestamp");
    });
  });
});
