/**
 * Tests for Model Statistics Repository
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
	},
}));

import {
	getModelStatsTable,
	getModelsAndAgents,
	getModelTimeSeries,
	getModelUsageByProvider,
} from "../model-stats.repository";

describe("Model Stats Repository", () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe("getModelsAndAgents", () => {
		it("should return models grouped by endpoint", async () => {
			const mockResult = [
				{
					_id: "openAI",
					models: [
						{ model: "gpt-4", firstCreatedAt: new Date("2024-01-01") },
						{ model: "gpt-3.5-turbo", firstCreatedAt: new Date("2024-01-05") },
					],
				},
				{
					_id: "agents",
					models: [
						{
							model: "agent-1",
							firstCreatedAt: new Date("2024-01-10"),
							agentName: ["Assistant"],
						},
					],
				},
			];
			mockToArray.mockResolvedValueOnce(mockResult);

			const result = await getModelsAndAgents();

			expect(result).toHaveLength(2);
			expect(result[0]._id).toBe("openAI");
			expect(result[0].models).toHaveLength(2);
		});

		it("should filter out null models", async () => {
			mockToArray.mockResolvedValueOnce([]);

			await getModelsAndAgents();

			const pipeline = mockAggregate.mock.calls[0][0];
			const matchStage = pipeline[0].$match;

			expect(matchStage.model).toEqual({ $ne: null });
		});

		it("should include agentName only for agents endpoint", async () => {
			mockToArray.mockResolvedValueOnce([]);

			await getModelsAndAgents();

			const pipeline = mockAggregate.mock.calls[0][0];

			// Find the $group stage that creates models array
			const groupStage = pipeline.find(
				(stage: Record<string, unknown>) =>
					"$group" in stage && (stage.$group as Record<string, unknown>).models,
			);

			expect(groupStage).toBeDefined();
		});
	});

	describe("getModelUsageByProvider", () => {
		it("should return usage statistics grouped by provider", async () => {
			const mockResult = [
				{
					_id: "openAI",
					totalTokenCount: 1000000,
					models: [
						{ name: "gpt-4", tokenCount: 600000 },
						{ name: "gpt-3.5-turbo", tokenCount: 400000 },
					],
				},
			];
			mockToArray.mockResolvedValueOnce(mockResult);

			const params = {
				startDate: new Date("2024-01-01"),
				endDate: new Date("2024-01-31"),
			};

			const result = await getModelUsageByProvider(params);

			expect(result).toHaveLength(1);
			expect(result[0].totalTokenCount).toBe(1000000);
		});

		it("should apply date filter correctly", async () => {
			mockToArray.mockResolvedValueOnce([]);

			const startDate = new Date("2024-02-01");
			const endDate = new Date("2024-02-29");

			await getModelUsageByProvider({ startDate, endDate });

			const pipeline = mockAggregate.mock.calls[0][0];
			const matchStage = pipeline[0].$match;

			expect(matchStage.createdAt.$gte).toEqual(startDate);
			expect(matchStage.createdAt.$lte).toEqual(endDate);
		});
	});

	describe("getModelStatsTable", () => {
		it("should return model statistics for table display", async () => {
			const mockResult = [
				{
					model: "gpt-4",
					endpoint: "openAI",
					totalInputToken: 50000,
					totalOutputToken: 150000,
					requests: 500,
					avg: 400,
					tokenMedian: 350,
				},
			];
			mockToArray.mockResolvedValueOnce(mockResult);

			const params = {
				startDate: new Date("2024-01-01"),
				endDate: new Date("2024-01-31"),
			};

			const result = await getModelStatsTable(params);

			expect(result).toHaveLength(1);
			expect(result[0].model).toBe("gpt-4");
			expect(result[0].totalInputToken).toBe(50000);
			expect(result[0].totalOutputToken).toBe(150000);
		});

		it("should include date range filters in pipeline", async () => {
			mockToArray.mockResolvedValueOnce([]);

			const params = {
				startDate: new Date("2024-01-01"),
				endDate: new Date("2024-01-31"),
			};

			await getModelStatsTable(params);

			const pipeline = mockAggregate.mock.calls[0][0];
			const matchStage = pipeline[0].$match;

			expect(matchStage.createdAt.$gte).toEqual(params.startDate);
			expect(matchStage.createdAt.$lte).toEqual(params.endDate);
			expect(matchStage.model).toEqual({ $ne: null });
		});

		it("should use lookup to resolve agent models", async () => {
			mockToArray.mockResolvedValueOnce([]);

			const params = {
				startDate: new Date("2024-01-01"),
				endDate: new Date("2024-01-31"),
			};

			await getModelStatsTable(params);

			const pipeline = mockAggregate.mock.calls[0][0];

			// Check for conversation lookup
			const conversationLookup = pipeline.find(
				(stage: Record<string, unknown>) =>
					"$lookup" in stage &&
					(stage.$lookup as Record<string, unknown>).from === "conversations",
			);
			expect(conversationLookup).toBeDefined();

			// Check for agent lookup
			const agentLookup = pipeline.find(
				(stage: Record<string, unknown>) =>
					"$lookup" in stage &&
					(stage.$lookup as Record<string, unknown>).from === "agents",
			);
			expect(agentLookup).toBeDefined();
		});
	});

	describe("getModelTimeSeries", () => {
		it("should return time series data with daily granularity", async () => {
			const mockResult = [
				{
					model: "gpt-4",
					endpoint: "openAI",
					day: "2024-01-15",
					totalInputToken: 5000,
					totalOutputToken: 15000,
					requests: 50,
				},
			];
			mockToArray.mockResolvedValueOnce(mockResult);

			const params = {
				startDate: new Date("2024-01-01"),
				endDate: new Date("2024-01-31"),
				model: "gpt-4",
				granularity: "day" as const,
			};

			const result = await getModelTimeSeries(params);

			expect(result).toHaveLength(1);
			expect(result[0].day).toBe("2024-01-15");
		});

		it("should filter by specific model", async () => {
			mockToArray.mockResolvedValueOnce([]);

			const params = {
				startDate: new Date("2024-01-01"),
				endDate: new Date("2024-01-31"),
				model: "gpt-4-turbo",
				granularity: "hour" as const,
			};

			await getModelTimeSeries(params);

			const pipeline = mockAggregate.mock.calls[0][0];
			const matchStage = pipeline[0].$match;

			expect(matchStage.model).toBe("gpt-4-turbo");
		});

		it("should use correct date format for hourly granularity", async () => {
			mockToArray.mockResolvedValueOnce([]);

			const params = {
				startDate: new Date("2024-01-15"),
				endDate: new Date("2024-01-16"),
				model: "gpt-4",
				granularity: "hour" as const,
			};

			await getModelTimeSeries(params);

			const pipeline = mockAggregate.mock.calls[0][0];

			// Find addFields stage
			const addFieldsStage = pipeline.find(
				(stage: Record<string, unknown>) => "$addFields" in stage,
			);

			expect(addFieldsStage).toBeDefined();
			expect(addFieldsStage.$addFields.hour.$dateToString.format).toBe(
				"%d, %H:00",
			);
		});

		it("should use correct date format for monthly granularity", async () => {
			mockToArray.mockResolvedValueOnce([]);

			const params = {
				startDate: new Date("2024-01-01"),
				endDate: new Date("2024-12-31"),
				model: "gpt-4",
				granularity: "month" as const,
			};

			await getModelTimeSeries(params);

			const pipeline = mockAggregate.mock.calls[0][0];

			const addFieldsStage = pipeline.find(
				(stage: Record<string, unknown>) => "$addFields" in stage,
			);

			expect(addFieldsStage).toBeDefined();
			expect(addFieldsStage.$addFields.month.$dateToString.format).toBe(
				"%Y-%m",
			);
		});
	});
});
