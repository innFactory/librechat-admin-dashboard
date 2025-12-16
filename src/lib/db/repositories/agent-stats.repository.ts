/**
 * Agent Statistics Repository
 *
 * Handles queries for AI agent usage statistics, tables, and charts.
 * Uses transactions -> conversations.agent_id -> agents for accurate billing data.
 */

import { Collections, getCollection } from "../connection";
import type {
	DateRange,
	StatsTableEntry,
	TimeGranularity,
	TimeSeriesEntry,
} from "../types";

/**
 * Date format strings for different granularities
 */
const DATE_FORMATS: Record<TimeGranularity, string> = {
	hour: "%d, %H:00",
	day: "%Y-%m-%d",
	month: "%Y-%m",
};

/**
 * Get total agent count
 */
export async function getTotalAgentCount(): Promise<number> {
	const collection = await getCollection(Collections.AGENTS);
	return collection.countDocuments();
}

/**
 * Get agent statistics for table display
 *
 * Uses transactions collection with accurate billing data.
 * Links via: transactions -> conversations (by conversationId) -> agents (by agent_id)
 */
export async function getAgentStatsTable(
	params: DateRange,
): Promise<StatsTableEntry[]> {
	const { startDate, endDate } = params;
	const collection = await getCollection(Collections.TRANSACTIONS);

	const pipeline = [
		{
			$match: {
				createdAt: { $gte: startDate, $lte: endDate },
			},
		},
		// Lookup conversation to get agent_id
		{
			$lookup: {
				from: "conversations",
				localField: "conversationId",
				foreignField: "conversationId",
				as: "conv",
			},
		},
		{ $unwind: "$conv" },
		// Filter to agent conversations only
		{
			$match: {
				"conv.endpoint": "agents",
			},
		},
		// Lookup agent details using conversations.agent_id
		{
			$lookup: {
				from: "agents",
				localField: "conv.agent_id",
				foreignField: "id",
				as: "agent",
			},
		},
		{ $unwind: { path: "$agent", preserveNullAndEmptyArrays: true } },
		{
			$group: {
				_id: {
					agentId: "$conv.agent_id",
					agentName: { $ifNull: ["$agent.name", "$conv.agent_id"] },
					model: { $ifNull: ["$agent.model", "$model"] },
					endpoint: { $ifNull: ["$agent.provider", "agents"] },
				},
				totalInputToken: {
					$sum: {
						$cond: [
							{ $eq: ["$tokenType", "prompt"] },
							{ $abs: "$rawAmount" },
							0,
						],
					},
				},
				totalOutputToken: {
					$sum: {
						$cond: [
							{ $eq: ["$tokenType", "completion"] },
							{ $abs: "$rawAmount" },
							0,
						],
					},
				},
				requests: {
					$sum: {
						$cond: [{ $eq: ["$tokenType", "completion"] }, 1, 0],
					},
				},
			},
		},
		{
			$project: {
				agentId: "$_id.agentId",
				agentName: "$_id.agentName",
				model: "$_id.model",
				endpoint: "$_id.endpoint",
				totalInputToken: 1,
				totalOutputToken: 1,
				requests: 1,
				_id: 0,
			},
		},
	];

	return collection.aggregate<StatsTableEntry>(pipeline).toArray();
}

/**
 * Get agent time series data for charts
 */
export async function getAgentTimeSeries(
	params: DateRange & {
		agentName: string;
		granularity: TimeGranularity;
		timezone?: string;
	},
): Promise<TimeSeriesEntry[]> {
	const {
		startDate,
		endDate,
		agentName,
		granularity,
		timezone = "UTC",
	} = params;
	const collection = await getCollection(Collections.TRANSACTIONS);
	const dateFormat = DATE_FORMATS[granularity];
	const timeField = granularity;

	const pipeline = [
		{
			$match: {
				createdAt: { $gte: startDate, $lte: endDate },
			},
		},
		// Lookup conversation to get agent_id
		{
			$lookup: {
				from: "conversations",
				localField: "conversationId",
				foreignField: "conversationId",
				as: "conv",
			},
		},
		{ $unwind: "$conv" },
		{
			$match: {
				"conv.endpoint": "agents",
			},
		},
		// Lookup agent details
		{
			$lookup: {
				from: "agents",
				localField: "conv.agent_id",
				foreignField: "id",
				as: "agent",
			},
		},
		{ $unwind: { path: "$agent", preserveNullAndEmptyArrays: true } },
		// Filter by the requested agent name
		{
			$match: {
				$or: [{ "agent.name": agentName }, { "conv.agent_id": agentName }],
			},
		},
		{
			$addFields: {
				[timeField]: {
					$dateToString: {
						format: dateFormat,
						date: "$createdAt",
						timezone: timezone,
					},
				},
			},
		},
		{
			$group: {
				_id: {
					agentId: "$conv.agent_id",
					agentName: { $ifNull: ["$agent.name", "$conv.agent_id"] },
					endpoint: { $ifNull: ["$agent.provider", "agents"] },
					[timeField]: `$${timeField}`,
				},
				totalInputToken: {
					$sum: {
						$cond: [
							{ $eq: ["$tokenType", "prompt"] },
							{ $abs: "$rawAmount" },
							0,
						],
					},
				},
				totalOutputToken: {
					$sum: {
						$cond: [
							{ $eq: ["$tokenType", "completion"] },
							{ $abs: "$rawAmount" },
							0,
						],
					},
				},
				requests: {
					$sum: {
						$cond: [{ $eq: ["$tokenType", "completion"] }, 1, 0],
					},
				},
			},
		},
		{ $sort: { [`_id.${timeField}`]: 1 } },
		{
			$project: {
				_id: 0,
				agentId: "$_id.agentId",
				agentName: "$_id.agentName",
				endpoint: "$_id.endpoint",
				[timeField]: `$_id.${timeField}`,
				totalInputToken: 1,
				totalOutputToken: 1,
				requests: 1,
			},
		},
	];

	return collection.aggregate<TimeSeriesEntry>(pipeline).toArray();
}
