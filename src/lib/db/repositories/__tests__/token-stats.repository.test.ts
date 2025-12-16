/**
 * Tests for Token Statistics Repository
 */

import type { Collection } from "mongodb";

// Create mock implementations
const mockToArray = jest.fn();
const mockAggregate = jest.fn().mockReturnValue({ toArray: mockToArray });

const mockCollection: Partial<Collection> = {
	aggregate: mockAggregate,
};

// Mock the connection module
jest.mock("../../connection", () => ({
	getCollection: jest
		.fn()
		.mockImplementation(() => Promise.resolve(mockCollection)),
	Collections: {
		MESSAGES: "messages",
		USERS: "users",
		AGENTS: "agents",
		TRANSACTIONS: "transactions",
	},
}));

import {
	getMessageStats,
	getRequestHeatmap,
	getTokenCounts,
} from "../token-stats.repository";

describe("Token Stats Repository", () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe("getTokenCounts", () => {
		it("should return token counts for current and previous periods", async () => {
			const mockResult = [
				{
					currentInputToken: 10000,
					currentOutputToken: 50000,
					prevInputToken: 8000,
					prevOutputToken: 40000,
				},
			];
			mockToArray.mockResolvedValueOnce(mockResult);

			const params = {
				startDate: new Date("2024-01-15"),
				endDate: new Date("2024-01-31"),
				prevStart: new Date("2024-01-01"),
				prevEnd: new Date("2024-01-15"),
			};

			const result = await getTokenCounts(params);

			expect(result).toEqual(mockResult);
			expect(mockAggregate).toHaveBeenCalledTimes(1);
		});

		it("should use transactions collection with tokenType for accurate token tracking", async () => {
			mockToArray.mockResolvedValueOnce([]);

			const params = {
				startDate: new Date("2024-01-01"),
				endDate: new Date("2024-01-31"),
				prevStart: new Date("2023-12-01"),
				prevEnd: new Date("2024-01-01"),
			};

			await getTokenCounts(params);

			const pipeline = mockAggregate.mock.calls[0][0];
			const facet = pipeline[0].$facet;

			// Input tokens should filter by tokenType: "prompt"
			const currentInputStages = facet.currentInput;
			const currentInputMatch = currentInputStages[0].$match;
			expect(currentInputMatch.tokenType).toBe("prompt");

			// Output tokens should filter by tokenType: "completion"
			const currentOutputMatch = facet.currentOutput[0].$match;
			expect(currentOutputMatch.tokenType).toBe("completion");
		});

		it("should use absolute value of rawAmount for token counts", async () => {
			mockToArray.mockResolvedValueOnce([]);

			const params = {
				startDate: new Date("2024-01-01"),
				endDate: new Date("2024-01-31"),
				prevStart: new Date("2023-12-01"),
				prevEnd: new Date("2024-01-01"),
			};

			await getTokenCounts(params);

			const pipeline = mockAggregate.mock.calls[0][0];
			const facet = pipeline[0].$facet;

			// Check that we're using $abs on rawAmount
			const currentInputGroup = facet.currentInput[1].$group;
			expect(currentInputGroup.total.$sum.$abs).toBe("$rawAmount");
		});

		it("should return zero for empty results", async () => {
			mockToArray.mockResolvedValueOnce([
				{
					currentInputToken: 0,
					currentOutputToken: 0,
					prevInputToken: 0,
					prevOutputToken: 0,
				},
			]);

			const params = {
				startDate: new Date("2024-01-01"),
				endDate: new Date("2024-01-31"),
				prevStart: new Date("2023-12-01"),
				prevEnd: new Date("2024-01-01"),
			};

			const result = await getTokenCounts(params);

			expect(result[0].currentInputToken).toBe(0);
			expect(result[0].currentOutputToken).toBe(0);
		});
	});

	describe("getMessageStats", () => {
		it("should return message statistics with period comparison", async () => {
			const mockResult = [
				{
					totalMessages: 1000,
					totalTokenCount: 500000,
					totalSummaryTokenCount: 50000,
					prevTotalMessages: 800,
					prevTotalTokenCount: 400000,
					prevTotalSummaryTokenCount: 40000,
				},
			];
			mockToArray.mockResolvedValueOnce(mockResult);

			const params = {
				startDate: new Date("2024-01-15"),
				endDate: new Date("2024-01-31"),
				prevStart: new Date("2024-01-01"),
				prevEnd: new Date("2024-01-15"),
			};

			const result = await getMessageStats(params);

			expect(result).toEqual(mockResult);
			expect(result[0].totalMessages).toBe(1000);
		});

		it("should aggregate token counts correctly", async () => {
			mockToArray.mockResolvedValueOnce([]);

			const params = {
				startDate: new Date("2024-01-01"),
				endDate: new Date("2024-01-31"),
				prevStart: new Date("2023-12-01"),
				prevEnd: new Date("2024-01-01"),
			};

			await getMessageStats(params);

			const pipeline = mockAggregate.mock.calls[0][0];
			const facet = pipeline[0].$facet;

			// Verify grouping includes token counts
			const currentGroup = facet.current[1].$group;
			expect(currentGroup).toHaveProperty("totalTokenCount");
			expect(currentGroup).toHaveProperty("totalSummaryTokenCount");
			expect(currentGroup).toHaveProperty("totalMessages");
		});
	});

	describe("getRequestHeatmap", () => {
		it("should return heatmap data grouped by day and time slot", async () => {
			const mockResult = [
				{ dayOfWeek: 1, timeSlot: 2, totalRequests: 150 },
				{ dayOfWeek: 1, timeSlot: 3, totalRequests: 200 },
				{ dayOfWeek: 2, timeSlot: 2, totalRequests: 180 },
			];
			mockToArray.mockResolvedValueOnce(mockResult);

			const params = {
				startDate: new Date("2024-01-01"),
				endDate: new Date("2024-01-31"),
			};

			const result = await getRequestHeatmap(params);

			expect(result).toHaveLength(3);
			expect(result[0]).toHaveProperty("dayOfWeek");
			expect(result[0]).toHaveProperty("timeSlot");
			expect(result[0]).toHaveProperty("totalRequests");
		});

		it("should use hour directly (0-23) for time slots", async () => {
			mockToArray.mockResolvedValueOnce([]);

			const params = {
				startDate: new Date("2024-01-01"),
				endDate: new Date("2024-01-31"),
			};

			await getRequestHeatmap(params);

			const pipeline = mockAggregate.mock.calls[0][0];

			// Find the $project stage that extracts hour
			const projectStage = pipeline[1].$project;
			expect(projectStage.hour).toBeDefined();
			expect(projectStage.hour.$hour).toBeDefined();
		});

		it("should sort by date and hour", async () => {
			mockToArray.mockResolvedValueOnce([]);

			const params = {
				startDate: new Date("2024-01-01"),
				endDate: new Date("2024-01-31"),
			};

			await getRequestHeatmap(params);

			const pipeline = mockAggregate.mock.calls[0][0];

			// Find the $sort stage
			const sortStage = pipeline.find(
				(stage: Record<string, unknown>) => "$sort" in stage,
			);
			expect(sortStage).toBeDefined();
			expect(sortStage.$sort["_id.date"]).toBe(1);
			expect(sortStage.$sort["_id.hour"]).toBe(1);
		});

		it("should handle empty date range", async () => {
			mockToArray.mockResolvedValueOnce([]);

			const params = {
				startDate: new Date("2024-01-15"),
				endDate: new Date("2024-01-15"),
			};

			const result = await getRequestHeatmap(params);

			expect(result).toEqual([]);
		});
	});
});
