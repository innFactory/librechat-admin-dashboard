/**
 * Tests for Tool Statistics Repository
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
		TOOL_CALLS: "toolcalls",
	},
}));

import { getAllToolCalls, getMcpToolCalls } from "../tool-stats.repository";

describe("Tool Stats Repository", () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe("getMcpToolCalls", () => {
		it("should return MCP tool call counts for current and previous period", async () => {
			const mockResult = [
				{
					currentMcpToolCalls: 150,
					prevMcpToolCalls: 120,
				},
			];
			mockToArray.mockResolvedValueOnce(mockResult);

			const params = {
				startDate: new Date("2024-01-15"),
				endDate: new Date("2024-01-31"),
				prevStart: new Date("2024-01-01"),
				prevEnd: new Date("2024-01-15"),
			};

			const result = await getMcpToolCalls(params);

			expect(result).toEqual(mockResult);
			expect(mockAggregate).toHaveBeenCalledTimes(1);

			// Verify pipeline structure
			const pipeline = mockAggregate.mock.calls[0][0];
			expect(pipeline).toHaveLength(2);
			expect(pipeline[0]).toHaveProperty("$facet");
			expect(pipeline[0].$facet).toHaveProperty("current");
			expect(pipeline[0].$facet).toHaveProperty("prev");
		});

		it("should filter by MCP delimiter '::' in content.tool_call.name", async () => {
			mockToArray.mockResolvedValueOnce([
				{
					currentMcpToolCalls: 50,
					prevMcpToolCalls: 40,
				},
			]);

			const params = {
				startDate: new Date("2024-01-15"),
				endDate: new Date("2024-01-31"),
				prevStart: new Date("2024-01-01"),
				prevEnd: new Date("2024-01-15"),
			};

			await getMcpToolCalls(params);

			const pipeline = mockAggregate.mock.calls[0][0];
			const facet = pipeline[0].$facet;

			// Verify current period filters for MCP delimiter
			const currentMatches = facet.current.filter(
				(stage: Record<string, unknown>) => "$match" in stage,
			);
			const toolCallMatch = currentMatches.find(
				(stage: Record<string, unknown>) =>
					stage.$match?.["content.tool_call.name"],
			);
			expect(toolCallMatch).toBeDefined();
			expect(toolCallMatch.$match["content.tool_call.name"]).toEqual({
				$regex: "(_mcp_|::)",
			});

			// Verify previous period filters for MCP delimiter
			const prevMatches = facet.prev.filter(
				(stage: Record<string, unknown>) => "$match" in stage,
			);
			const prevToolCallMatch = prevMatches.find(
				(stage: Record<string, unknown>) =>
					stage.$match?.["content.tool_call.name"],
			);
			expect(prevToolCallMatch).toBeDefined();
			expect(prevToolCallMatch.$match["content.tool_call.name"]).toEqual({
				$regex: "(_mcp_|::)",
			});
		});

		it("should handle zero MCP tool calls", async () => {
			mockToArray.mockResolvedValueOnce([
				{
					currentMcpToolCalls: 0,
					prevMcpToolCalls: 0,
				},
			]);

			const params = {
				startDate: new Date("2024-01-15"),
				endDate: new Date("2024-01-31"),
				prevStart: new Date("2024-01-01"),
				prevEnd: new Date("2024-01-15"),
			};

			const result = await getMcpToolCalls(params);

			expect(result[0].currentMcpToolCalls).toBe(0);
			expect(result[0].prevMcpToolCalls).toBe(0);
		});
	});

	describe("getAllToolCalls", () => {
		it("should return all tool call counts without MCP filter", async () => {
			const mockResult = [
				{
					currentToolCalls: 500,
					prevToolCalls: 400,
				},
			];
			mockToArray.mockResolvedValueOnce(mockResult);

			const params = {
				startDate: new Date("2024-01-15"),
				endDate: new Date("2024-01-31"),
				prevStart: new Date("2024-01-01"),
				prevEnd: new Date("2024-01-15"),
			};

			const result = await getAllToolCalls(params);

			expect(result).toEqual(mockResult);
			expect(mockAggregate).toHaveBeenCalledTimes(1);

			// Verify pipeline does NOT filter by MCP delimiter
			const pipeline = mockAggregate.mock.calls[0][0];
			const facet = pipeline[0].$facet;
			const currentMatch = facet.current[0].$match;
			expect(currentMatch.toolId).toBeUndefined();
		});
	});
});
