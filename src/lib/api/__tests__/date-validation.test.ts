/**
 * Tests for date validation utilities
 */

import {
	calculatePreviousPeriod,
	getDateParamsFromUrl,
	validateDateRange,
} from "../date-validation";

describe("validateDateRange", () => {
	it("should return error when start is missing", () => {
		const result = validateDateRange(null, "2024-01-31");

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.status).toBe(400);
		}
	});

	it("should return error when end is missing", () => {
		const result = validateDateRange("2024-01-01", null);

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.status).toBe(400);
		}
	});

	it("should return error for invalid date format", () => {
		const result = validateDateRange("invalid-date", "2024-01-31");

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.status).toBe(400);
		}
	});

	it("should return error when start is after end", () => {
		const result = validateDateRange("2024-01-31", "2024-01-01");

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.status).toBe(400);
		}
	});

	it("should return valid date range for correct input", () => {
		const result = validateDateRange("2024-01-01", "2024-01-31");

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.startDate).toBeInstanceOf(Date);
			expect(result.data.endDate).toBeInstanceOf(Date);
			expect(result.data.startDate.toISOString()).toContain("2024-01-01");
			expect(result.data.endDate.toISOString()).toContain("2024-01-31");
		}
	});

	it("should accept ISO-8601 format with time", () => {
		const result = validateDateRange(
			"2024-01-01T00:00:00Z",
			"2024-01-31T23:59:59Z",
		);

		expect(result.success).toBe(true);
	});

	it("should accept same start and end date", () => {
		const result = validateDateRange("2024-01-15", "2024-01-15");

		expect(result.success).toBe(true);
	});
});

describe("calculatePreviousPeriod", () => {
	it("should calculate previous period with same duration", () => {
		const startDate = new Date("2024-01-15T00:00:00Z");
		const endDate = new Date("2024-01-31T00:00:00Z");

		const result = calculatePreviousPeriod(startDate, endDate);

		// Duration is 16 days
		const expectedPrevStart = new Date("2023-12-30T00:00:00Z");
		const expectedPrevEnd = new Date("2024-01-15T00:00:00Z");

		expect(result.prevStart.getTime()).toBe(expectedPrevStart.getTime());
		expect(result.prevEnd.getTime()).toBe(expectedPrevEnd.getTime());
		expect(result.startDate).toBe(startDate);
		expect(result.endDate).toBe(endDate);
	});

	it("should handle single day period", () => {
		const startDate = new Date("2024-01-15T00:00:00Z");
		const endDate = new Date("2024-01-15T23:59:59Z");

		const result = calculatePreviousPeriod(startDate, endDate);

		// Previous period should be almost 24 hours before
		expect(result.prevEnd.getTime()).toBe(startDate.getTime());
		expect(result.prevStart.getTime()).toBeLessThan(result.prevEnd.getTime());
	});

	it("should handle month-long period", () => {
		const startDate = new Date("2024-02-01T00:00:00Z");
		const endDate = new Date("2024-02-29T23:59:59Z"); // Leap year

		const result = calculatePreviousPeriod(startDate, endDate);

		// Previous period ends at current start
		expect(result.prevEnd.getTime()).toBe(startDate.getTime());

		// Duration should be preserved
		const currentDuration = endDate.getTime() - startDate.getTime();
		const prevDuration = result.prevEnd.getTime() - result.prevStart.getTime();
		expect(prevDuration).toBe(currentDuration);
	});
});

describe("getDateParamsFromUrl", () => {
	it("should extract start and end params from URL", () => {
		const request = new Request(
			"https://example.com/api/test?start=2024-01-01&end=2024-01-31",
		);

		const result = getDateParamsFromUrl(request);

		expect(result.start).toBe("2024-01-01");
		expect(result.end).toBe("2024-01-31");
	});

	it("should return null for missing params", () => {
		const request = new Request("https://example.com/api/test");

		const result = getDateParamsFromUrl(request);

		expect(result.start).toBeNull();
		expect(result.end).toBeNull();
	});

	it("should handle URL-encoded dates", () => {
		const request = new Request(
			"https://example.com/api/test?start=2024-01-01T00%3A00%3A00Z&end=2024-01-31T23%3A59%3A59Z",
		);

		const result = getDateParamsFromUrl(request);

		expect(result.start).toBe("2024-01-01T00:00:00Z");
		expect(result.end).toBe("2024-01-31T23:59:59Z");
	});
});

describe("LibreChat Date Compatibility", () => {
	/**
	 * LibreChat stores timestamps as MongoDB Date objects.
	 * These tests verify compatibility with LibreChat's date handling.
	 */

	it("should handle MongoDB ISODate format strings", () => {
		const result = validateDateRange(
			"2024-01-01T00:00:00.000Z",
			"2024-01-31T23:59:59.999Z",
		);

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.startDate.getTime()).not.toBeNaN();
			expect(result.data.endDate.getTime()).not.toBeNaN();
		}
	});

	it("should handle leap year dates correctly", () => {
		// 2024 is a leap year
		const result = validateDateRange("2024-02-29", "2024-02-29");
		expect(result.success).toBe(true);
	});

	it("should handle year boundary queries (Dec to Jan)", () => {
		const result = validateDateRange("2023-12-15", "2024-01-15");

		expect(result.success).toBe(true);
		if (result.success) {
			const period = calculatePreviousPeriod(
				result.data.startDate,
				result.data.endDate,
			);
			// Previous period should span into 2023
			expect(period.prevStart.getFullYear()).toBe(2023);
		}
	});

	it("should handle timezone-aware queries", () => {
		// LibreChat stores in UTC but clients may send local times
		const utcResult = validateDateRange(
			"2024-01-15T00:00:00Z",
			"2024-01-15T23:59:59Z",
		);
		const offsetResult = validateDateRange(
			"2024-01-15T00:00:00+01:00",
			"2024-01-15T23:59:59+01:00",
		);

		expect(utcResult.success).toBe(true);
		expect(offsetResult.success).toBe(true);

		if (utcResult.success && offsetResult.success) {
			// Times should differ by timezone offset
			expect(utcResult.data.startDate.getTime()).not.toBe(
				offsetResult.data.startDate.getTime(),
			);
		}
	});

	it("should handle very recent data queries (last hour)", () => {
		const now = new Date();
		const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

		const result = validateDateRange(
			oneHourAgo.toISOString(),
			now.toISOString(),
		);

		expect(result.success).toBe(true);
		if (result.success) {
			const period = calculatePreviousPeriod(
				result.data.startDate,
				result.data.endDate,
			);
			// Previous period should be the hour before that
			const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
			expect(period.prevStart.getTime()).toBeCloseTo(twoHoursAgo.getTime(), -4); // Within 10 seconds
		}
	});

	it("should handle common dashboard presets", () => {
		// Today
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		const endOfToday = new Date(today);
		endOfToday.setHours(23, 59, 59, 999);

		const todayResult = validateDateRange(
			today.toISOString(),
			endOfToday.toISOString(),
		);
		expect(todayResult.success).toBe(true);

		// Last 7 days
		const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
		const last7Result = validateDateRange(
			sevenDaysAgo.toISOString(),
			endOfToday.toISOString(),
		);
		expect(last7Result.success).toBe(true);

		// Last 30 days
		const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
		const last30Result = validateDateRange(
			thirtyDaysAgo.toISOString(),
			endOfToday.toISOString(),
		);
		expect(last30Result.success).toBe(true);
	});

	it("should preserve millisecond precision", () => {
		const result = validateDateRange(
			"2024-01-15T12:30:45.123Z",
			"2024-01-15T12:30:45.456Z",
		);

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.startDate.getMilliseconds()).toBe(123);
			expect(result.data.endDate.getMilliseconds()).toBe(456);
		}
	});
});
