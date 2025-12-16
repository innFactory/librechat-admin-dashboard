/**
 * Model Statistics Repository
 *
 * Handles queries for model usage statistics, tables, and charts.
 */

import { Collections, getCollection } from "../connection";
import type {
	DateRange,
	ModelUsageEntry,
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
 * Get all available models and agents with their first usage date
 */
export async function getModelsAndAgents() {
	const collection = await getCollection(Collections.MESSAGES);

	const pipeline = [
		{ $match: { model: { $ne: null } } },
		{
			$group: {
				_id: { endpoint: "$endpoint", model: "$model" },
				sender: { $addToSet: "$sender" },
				firstCreatedAt: { $min: "$createdAt" },
			},
		},
		{ $sort: { firstCreatedAt: 1 } },
		{
			$group: {
				_id: "$_id.endpoint",
				models: {
					$push: {
						$mergeObjects: [
							{ model: "$_id.model", firstCreatedAt: "$firstCreatedAt" },
							{
								$cond: [
									{ $eq: ["$_id.endpoint", "agents"] },
									{ agentName: "$sender" },
									{},
								],
							},
						],
					},
				},
			},
		},
	];

	return collection.aggregate(pipeline).toArray();
}

/**
 * Get model usage statistics grouped by provider/endpoint
 * Uses transactions collection for accurate billing data and resolves agent models
 */
export async function getModelUsageByProvider(
	params: DateRange,
): Promise<ModelUsageEntry[]> {
	const { startDate, endDate } = params;
	const collection = await getCollection(Collections.TRANSACTIONS);

	const pipeline = [
		{
			$match: {
				createdAt: { $gte: startDate, $lte: endDate },
				model: { $ne: null },
			},
		},
		// Lookup conversation to check if it's an agent conversation
		{
			$lookup: {
				from: "conversations",
				localField: "conversationId",
				foreignField: "conversationId",
				as: "conversation",
			},
		},
		{ $unwind: { path: "$conversation", preserveNullAndEmptyArrays: true } },
		// For agent conversations, lookup the agent to get the underlying model
		{
			$lookup: {
				from: "agents",
				localField: "conversation.agent_id",
				foreignField: "id",
				as: "agent",
			},
		},
		{ $unwind: { path: "$agent", preserveNullAndEmptyArrays: true } },
		{
			$addFields: {
				// Resolve the model: for agents, use agent.model; otherwise use transaction.model
				resolvedModel: {
					$cond: [
						{
							$and: [
								{ $eq: ["$conversation.endpoint", "agents"] },
								{ $ne: ["$agent.model", null] },
							],
						},
						"$agent.model",
						"$model",
					],
				},
				endpoint: { $ifNull: ["$conversation.endpoint", "direct"] },
			},
		},
		// Sum tokens per model and endpoint
		{
			$group: {
				_id: { endpoint: "$endpoint", model: "$resolvedModel" },
				tokenCount: { $sum: { $abs: "$rawAmount" } },
			},
		},
		// Group by endpoint for the final structure
		{
			$group: {
				_id: "$_id.endpoint",
				totalTokenCount: { $sum: "$tokenCount" },
				models: {
					$push: {
						name: "$_id.model",
						tokenCount: "$tokenCount",
					},
				},
			},
		},
		{ $sort: { _id: 1 } },
	];

	return collection.aggregate<ModelUsageEntry>(pipeline).toArray();
}

/**
 * Get model statistics for table display (non-agent endpoints)
 */
export async function getModelStatsTable(
	params: DateRange,
): Promise<StatsTableEntry[]> {
	const { startDate, endDate } = params;
	const collection = await getCollection(Collections.TRANSACTIONS);

	const pipeline = [
		{
			$match: {
				createdAt: { $gte: startDate, $lte: endDate },
				model: { $ne: null },
			},
		},
		// Lookup conversation to check if it's an agent conversation
		{
			$lookup: {
				from: "conversations",
				localField: "conversationId",
				foreignField: "conversationId",
				as: "conversation",
			},
		},
		{ $unwind: { path: "$conversation", preserveNullAndEmptyArrays: true } },
		// For agent conversations, lookup the agent to get the underlying model
		{
			$lookup: {
				from: "agents",
				localField: "conversation.agent_id",
				foreignField: "id",
				as: "agent",
			},
		},
		{ $unwind: { path: "$agent", preserveNullAndEmptyArrays: true } },
		{
			$addFields: {
				// Resolve the model: for agents, use agent.model; otherwise use transaction.model
				resolvedModel: {
					$cond: [
						{
							$and: [
								{ $eq: ["$conversation.endpoint", "agents"] },
								{ $ne: ["$agent.model", null] },
							],
						},
						"$agent.model",
						"$model",
					],
				},
				endpoint: { $ifNull: ["$conversation.endpoint", "direct"] },
			},
		},
		{
			$group: {
				_id: { model: "$resolvedModel", endpoint: "$endpoint" },
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
 * Get model time series data for charts
 */
export async function getModelTimeSeries(
	params: DateRange & {
		model: string;
		granularity: TimeGranularity;
		timezone?: string;
	},
): Promise<TimeSeriesEntry[]> {
	const { startDate, endDate, model, granularity, timezone = "UTC" } = params;
	const collection = await getCollection(Collections.TRANSACTIONS);
	const dateFormat = DATE_FORMATS[granularity];
	const timeField = granularity;

	const pipeline = [
		{
			$match: {
				createdAt: { $gte: startDate, $lte: endDate },
				model: model,
			},
		},
		{
			$lookup: {
				from: "conversations",
				localField: "conversationId",
				foreignField: "conversationId",
				as: "conversation",
			},
		},
		{ $unwind: "$conversation" },
		{
			$addFields: {
				endpoint: "$conversation.endpoint",
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
					model: "$model",
					endpoint: "$endpoint",
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
				requests: { $sum: 1 },
			},
		},
		{ $sort: { [`_id.${timeField}`]: 1 } },
		{
			$project: {
				_id: 0,
				model: "$_id.model",
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
