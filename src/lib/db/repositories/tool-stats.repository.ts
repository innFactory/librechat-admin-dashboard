/**
 * Tool Call Statistics Repository
 *
 * Handles queries related to tool calls, particularly MCP (Model Context Protocol) tool usage.
 *
 * MCP Tools are identified by their toolId format: `toolName_mcp_serverName`
 * The delimiter '_mcp_' (mcp_delimiter from librechat-data-provider Constants) distinguishes
 * MCP tool calls from regular tool calls.
 */

import { Collections, getCollection } from "../connection";
import type {
	DateRange,
	McpToolCallsResult,
	PeriodComparison,
	TimeGranularity,
} from "../types";

/**
 * MCP tool delimiter used by LibreChat to identify MCP tools
 * Format: toolName_mcp_serverName (e.g., "search_mcp_brave", "read_file_mcp_filesystem")
 */
/**
 * MCP tool delimiter used by LibreChat to identify MCP tools
 * Format: toolName_mcp_serverName OR toolName::serverName
 */
const MCP_DELIMITER = "(_mcp_|::)";

/**
 * Date format strings for different granularities
 */
const DATE_FORMATS: Record<TimeGranularity, string> = {
	hour: "%d, %H:00",
	day: "%Y-%m-%d",
	month: "%Y-%m",
};

/**
 * MCP Tool statistics table entry
 */
export interface McpToolStatsTableEntry {
	toolName: string;
	serverName: string;
	callCount: number;
	uniqueUsers: number;
	uniqueConversations: number;
}

/**
 * MCP Tool time series entry for charts
 */
export interface McpToolTimeSeriesEntry {
	toolName: string;
	serverName: string;
	date: string;
	callCount: number;
}

/**
 * Get count of MCP tool calls in a date range with period comparison
 *
 * Tool calls are stored in messages.content[] as objects with type: "tool_call"
 * MCP tools are identified by the '_mcp_' or '::' delimiter in the tool_call.name field.
 */
export async function getMcpToolCalls(
	params: PeriodComparison,
): Promise<McpToolCallsResult[]> {
	const { startDate, endDate, prevStart, prevEnd } = params;
	const collection = await getCollection(Collections.MESSAGES);

	const pipeline = [
		{
			$facet: {
				current: [
					{
						$match: {
							createdAt: { $gte: startDate, $lte: endDate },
							"content.type": "tool_call",
						},
					},
					{ $unwind: "$content" },
					{ $match: { "content.type": "tool_call" } },
					{
						$match: {
							"content.tool_call.name": { $regex: MCP_DELIMITER },
						},
					},
					{ $count: "mcpToolCallCount" },
				],
				prev: [
					{
						$match: {
							createdAt: { $gte: prevStart, $lte: prevEnd },
							"content.type": "tool_call",
						},
					},
					{ $unwind: "$content" },
					{ $match: { "content.type": "tool_call" } },
					{
						$match: {
							"content.tool_call.name": { $regex: MCP_DELIMITER },
						},
					},
					{ $count: "mcpToolCallCount" },
				],
			},
		},
		{
			$project: {
				currentMcpToolCalls: {
					$ifNull: [{ $arrayElemAt: ["$current.mcpToolCallCount", 0] }, 0],
				},
				prevMcpToolCalls: {
					$ifNull: [{ $arrayElemAt: ["$prev.mcpToolCallCount", 0] }, 0],
				},
			},
		},
	];

	return collection.aggregate<McpToolCallsResult>(pipeline).toArray();
}

/**
 * Get count of all tool calls (including non-MCP) in a date range
 * This can be used for comparison or to show total tool usage
 */
export async function getAllToolCalls(
	params: PeriodComparison,
): Promise<{ currentToolCalls: number; prevToolCalls: number }[]> {
	const { startDate, endDate, prevStart, prevEnd } = params;
	const collection = await getCollection(Collections.MESSAGES);

	const pipeline = [
		{
			$facet: {
				current: [
					{
						$match: {
							createdAt: { $gte: startDate, $lte: endDate },
							"content.type": "tool_call",
						},
					},
					{ $unwind: "$content" },
					{ $match: { "content.type": "tool_call" } },
					{ $count: "toolCallCount" },
				],
				prev: [
					{
						$match: {
							createdAt: { $gte: prevStart, $lte: prevEnd },
							"content.type": "tool_call",
						},
					},
					{ $unwind: "$content" },
					{ $match: { "content.type": "tool_call" } },
					{ $count: "toolCallCount" },
				],
			},
		},
		{
			$project: {
				currentToolCalls: {
					$ifNull: [{ $arrayElemAt: ["$current.toolCallCount", 0] }, 0],
				},
				prevToolCalls: {
					$ifNull: [{ $arrayElemAt: ["$prev.toolCallCount", 0] }, 0],
				},
			},
		},
	];

	return collection
		.aggregate<{ currentToolCalls: number; prevToolCalls: number }>(pipeline)
		.toArray();
}

/**
 * Get MCP tool statistics for table display
 * Groups tool calls by toolName and serverName
 */
export async function getMcpToolStatsTable(
	params: DateRange,
): Promise<McpToolStatsTableEntry[]> {
	const { startDate, endDate } = params;
	const collection = await getCollection(Collections.MESSAGES);

	const pipeline = [
		{
			$match: {
				createdAt: { $gte: startDate, $lte: endDate },
				"content.type": "tool_call",
			},
		},
		{ $unwind: "$content" },
		{ $match: { "content.type": "tool_call" } },
		{
			$match: {
				"content.tool_call.name": { $regex: MCP_DELIMITER },
			},
		},
		{
			$addFields: {
				toolId: "$content.tool_call.name",
				delimiter: {
					$cond: {
						if: {
							$regexMatch: { input: "$content.tool_call.name", regex: "::" },
						},
						then: "::",
						else: "_mcp_",
					},
				},
			},
		},
		{
			$addFields: {
				parts: { $split: ["$toolId", "$delimiter"] },
			},
		},
		{
			$addFields: {
				toolName: { $arrayElemAt: ["$parts", 0] },
				serverName: { $arrayElemAt: ["$parts", 1] },
			},
		},
		{
			$group: {
				_id: {
					toolName: "$toolName",
					serverName: "$serverName",
				},
				callCount: { $sum: 1 },
				uniqueUsers: { $addToSet: "$user" },
				uniqueConversations: { $addToSet: "$conversationId" },
			},
		},
		{
			$project: {
				_id: 0,
				toolName: "$_id.toolName",
				serverName: "$_id.serverName",
				callCount: 1,
				uniqueUsers: { $size: "$uniqueUsers" },
				uniqueConversations: { $size: "$uniqueConversations" },
			},
		},
		{
			$sort: { callCount: -1 },
		},
	];

	return collection.aggregate<McpToolStatsTableEntry>(pipeline).toArray();
}

/**
 * Get MCP tool calls time series for charts
 * Returns call counts grouped by tool, server, and time period
 */
export async function getMcpToolStatsChart(
	params: DateRange & { granularity: TimeGranularity; timezone?: string },
): Promise<McpToolTimeSeriesEntry[]> {
	const { startDate, endDate, granularity, timezone = "UTC" } = params;
	const collection = await getCollection(Collections.MESSAGES);
	const dateFormat = DATE_FORMATS[granularity];

	const pipeline = [
		{
			$match: {
				createdAt: { $gte: startDate, $lte: endDate },
				"content.type": "tool_call",
			},
		},
		{ $unwind: "$content" },
		{ $match: { "content.type": "tool_call" } },
		{
			$match: {
				"content.tool_call.name": { $regex: MCP_DELIMITER },
			},
		},
		{
			$addFields: {
				toolId: "$content.tool_call.name",
				delimiter: {
					$cond: {
						if: {
							$regexMatch: { input: "$content.tool_call.name", regex: "::" },
						},
						then: "::",
						else: "_mcp_",
					},
				},
			},
		},
		{
			$addFields: {
				parts: { $split: ["$toolId", "$delimiter"] },
			},
		},
		{
			$addFields: {
				toolName: { $arrayElemAt: ["$parts", 0] },
				serverName: { $arrayElemAt: ["$parts", 1] },
			},
		},
		{
			$group: {
				_id: {
					toolName: "$toolName",
					serverName: "$serverName",
					date: {
						$dateToString: {
							format: dateFormat,
							date: "$createdAt",
							timezone: timezone,
						},
					},
				},
				callCount: { $sum: 1 },
			},
		},
		{
			$project: {
				_id: 0,
				toolName: "$_id.toolName",
				serverName: "$_id.serverName",
				date: "$_id.date",
				callCount: 1,
			},
		},
		{
			$sort: { date: 1, toolName: 1 },
		},
	];

	return collection.aggregate<McpToolTimeSeriesEntry>(pipeline).toArray();
}

/**
 * Web search result entry
 */
export interface WebSearchStatsEntry {
	searchCount: number;
	uniqueUsers: number;
	uniqueConversations: number;
}

/**
 * Get count of web search tool calls in a date range with period comparison
 *
 * Web searches are identified by tool_call.name containing "web_search" or "search"
 */
export async function getWebSearchStats(
	params: PeriodComparison,
): Promise<{ current: WebSearchStatsEntry; prev: WebSearchStatsEntry }> {
	const { startDate, endDate, prevStart, prevEnd } = params;
	const collection = await getCollection(Collections.MESSAGES);

	const pipeline = [
		{
			$facet: {
				current: [
					{
						$match: {
							createdAt: { $gte: startDate, $lte: endDate },
							"content.type": "tool_call",
						},
					},
					{ $unwind: "$content" },
					{ $match: { "content.type": "tool_call" } },
					{
						$match: {
							"content.tool_call.name": { $regex: "web_search", $options: "i" },
						},
					},
					{
						$group: {
							_id: null,
							searchCount: { $sum: 1 },
							uniqueUsers: { $addToSet: "$user" },
							uniqueConversations: { $addToSet: "$conversationId" },
						},
					},
					{
						$project: {
							_id: 0,
							searchCount: 1,
							uniqueUsers: { $size: "$uniqueUsers" },
							uniqueConversations: { $size: "$uniqueConversations" },
						},
					},
				],
				prev: [
					{
						$match: {
							createdAt: { $gte: prevStart, $lte: prevEnd },
							"content.type": "tool_call",
						},
					},
					{ $unwind: "$content" },
					{ $match: { "content.type": "tool_call" } },
					{
						$match: {
							"content.tool_call.name": { $regex: "web_search", $options: "i" },
						},
					},
					{
						$group: {
							_id: null,
							searchCount: { $sum: 1 },
							uniqueUsers: { $addToSet: "$user" },
							uniqueConversations: { $addToSet: "$conversationId" },
						},
					},
					{
						$project: {
							_id: 0,
							searchCount: 1,
							uniqueUsers: { $size: "$uniqueUsers" },
							uniqueConversations: { $size: "$uniqueConversations" },
						},
					},
				],
			},
		},
		{
			$project: {
				current: {
					$ifNull: [
						{ $arrayElemAt: ["$current", 0] },
						{ searchCount: 0, uniqueUsers: 0, uniqueConversations: 0 },
					],
				},
				prev: {
					$ifNull: [
						{ $arrayElemAt: ["$prev", 0] },
						{ searchCount: 0, uniqueUsers: 0, uniqueConversations: 0 },
					],
				},
			},
		},
	];

	const result = await collection
		.aggregate<{ current: WebSearchStatsEntry; prev: WebSearchStatsEntry }>(
			pipeline,
		)
		.toArray();

	return (
		result[0] ?? {
			current: { searchCount: 0, uniqueUsers: 0, uniqueConversations: 0 },
			prev: { searchCount: 0, uniqueUsers: 0, uniqueConversations: 0 },
		}
	);
}
