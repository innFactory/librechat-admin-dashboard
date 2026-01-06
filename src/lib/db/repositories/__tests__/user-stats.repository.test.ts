/**
 * Tests for User Statistics Repository
 */

import type { Collection, Db } from "mongodb";

// Create mock implementations
const mockToArray = jest.fn();
const mockAggregate = jest.fn().mockReturnValue({ toArray: mockToArray });
const mockCountDocuments = jest.fn();

const mockCollection: Partial<Collection> = {
	aggregate: mockAggregate,
	countDocuments: mockCountDocuments,
};

const _mockDb: Partial<Db> = {
	collection: jest.fn().mockReturnValue(mockCollection),
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
	getActiveUsers,
	getConversations,
	getTotalUserCount,
} from "../user-stats.repository";

describe("User Stats Repository", () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe("getActiveUsers", () => {
		it("should return active user counts for current and previous period", async () => {
			const mockResult = [
				{
					currentActiveUsers: 150,
					prevActiveUsers: 120,
				},
			];
			mockToArray.mockResolvedValueOnce(mockResult);

			const params = {
				startDate: new Date("2024-01-15"),
				endDate: new Date("2024-01-31"),
				prevStart: new Date("2024-01-01"),
				prevEnd: new Date("2024-01-15"),
			};

			const result = await getActiveUsers(params);

			expect(result).toEqual(mockResult);
			expect(mockAggregate).toHaveBeenCalledTimes(1);

			// Verify pipeline structure
			const pipeline = mockAggregate.mock.calls[0][0];
			expect(pipeline).toHaveLength(2);
			expect(pipeline[0]).toHaveProperty("$facet");
			expect(pipeline[0].$facet).toHaveProperty("current");
			expect(pipeline[0].$facet).toHaveProperty("prev");
		});

		it("should handle zero active users", async () => {
			mockToArray.mockResolvedValueOnce([
				{
					currentActiveUsers: 0,
					prevActiveUsers: 0,
				},
			]);

			const params = {
				startDate: new Date("2024-01-15"),
				endDate: new Date("2024-01-31"),
				prevStart: new Date("2024-01-01"),
				prevEnd: new Date("2024-01-15"),
			};

			const result = await getActiveUsers(params);

			expect(result[0].currentActiveUsers).toBe(0);
			expect(result[0].prevActiveUsers).toBe(0);
		});

		it("should use correct date filters", async () => {
			mockToArray.mockResolvedValueOnce([]);

			const startDate = new Date("2024-02-01");
			const endDate = new Date("2024-02-29");
			const prevStart = new Date("2024-01-03");
			const prevEnd = new Date("2024-02-01");

			await getActiveUsers({ startDate, endDate, prevStart, prevEnd });

			const pipeline = mockAggregate.mock.calls[0][0];
			const facet = pipeline[0].$facet;

			// Check current period match
			const currentMatch = facet.current[0].$match;
			expect(currentMatch.createdAt.$gte).toEqual(startDate);
			expect(currentMatch.createdAt.$lte).toEqual(endDate);

			// Check previous period match
			const prevMatch = facet.prev[0].$match;
			expect(prevMatch.createdAt.$gte).toEqual(prevStart);
			expect(prevMatch.createdAt.$lte).toEqual(prevEnd);
		});
	});

	describe("getTotalUserCount", () => {
		it("should return total user count", async () => {
			mockCountDocuments.mockResolvedValueOnce(500);

			const result = await getTotalUserCount();

			expect(result).toBe(500);
			expect(mockCountDocuments).toHaveBeenCalledTimes(1);
		});

		it("should return zero for empty collection", async () => {
			mockCountDocuments.mockResolvedValueOnce(0);

			const result = await getTotalUserCount();

			expect(result).toBe(0);
		});
	});

	describe("getConversations", () => {
		it("should return conversation counts for current and previous period", async () => {
			const mockResult = [
				{
					currentConversations: 250,
					prevConversations: 200,
				},
			];
			mockToArray.mockResolvedValueOnce(mockResult);

			const params = {
				startDate: new Date("2024-01-15"),
				endDate: new Date("2024-01-31"),
				prevStart: new Date("2024-01-01"),
				prevEnd: new Date("2024-01-15"),
			};

			const result = await getConversations(params);

			expect(result).toEqual(mockResult);
			expect(mockAggregate).toHaveBeenCalledTimes(1);

			// Verify pipeline structure
			const pipeline = mockAggregate.mock.calls[0][0];
			expect(pipeline).toHaveLength(2);
			expect(pipeline[0]).toHaveProperty("$facet");
			expect(pipeline[0].$facet).toHaveProperty("current");
			expect(pipeline[0].$facet).toHaveProperty("prev");
		});

		it("should count unique conversationIds using group and count", async () => {
			mockToArray.mockResolvedValueOnce([
				{
					currentConversations: 50,
					prevConversations: 40,
				},
			]);

			const params = {
				startDate: new Date("2024-01-15"),
				endDate: new Date("2024-01-31"),
				prevStart: new Date("2024-01-01"),
				prevEnd: new Date("2024-01-15"),
			};

			await getConversations(params);

			const pipeline = mockAggregate.mock.calls[0][0];
			const facet = pipeline[0].$facet;

			// Verify current period groups by conversationId and then counts
			const currentPipeline = facet.current;
			expect(currentPipeline[1].$group._id).toBe("$conversationId");
			expect(currentPipeline[2].$count).toBe("conversationCount");

			// Verify previous period groups by conversationId and then counts
			const prevPipeline = facet.prev;
			expect(prevPipeline[1].$group._id).toBe("$conversationId");
			expect(prevPipeline[2].$count).toBe("conversationCount");
		});

		it("should handle zero conversations", async () => {
			mockToArray.mockResolvedValueOnce([
				{
					currentConversations: 0,
					prevConversations: 0,
				},
			]);

			const params = {
				startDate: new Date("2024-01-15"),
				endDate: new Date("2024-01-31"),
				prevStart: new Date("2024-01-01"),
				prevEnd: new Date("2024-01-15"),
			};

			const result = await getConversations(params);

			expect(result[0].currentConversations).toBe(0);
			expect(result[0].prevConversations).toBe(0);
		});
	});
});
