import { Collections, getCollection } from "../connection";
import type { PeriodComparison, TokenCountResult } from "../types";

/**
 * Get files processed count with period comparison
 */
export async function getFilesProcessedStats(
	params: PeriodComparison,
): Promise<TokenCountResult[]> {
	const { startDate, endDate, prevStart, prevEnd } = params;
	const collection = await getCollection(Collections.FILES);

	const pipeline = [
		{
			$facet: {
				current: [
					{
						$match: {
							createdAt: { $gte: startDate, $lte: endDate },
						},
					},
					{
						$count: "total",
					},
				],
				prev: [
					{
						$match: {
							createdAt: { $gte: prevStart, $lte: prevEnd },
						},
					},
					{
						$count: "total",
					},
				],
			},
		},
		{
			$project: {
				current: { $ifNull: [{ $arrayElemAt: ["$current.total", 0] }, 0] },
				prev: { $ifNull: [{ $arrayElemAt: ["$prev.total", 0] }, 0] },
			},
		},
	];

	const result = await collection.aggregate(pipeline).toArray();

	// Map to TokenCountResult structure to reuse existing types/components if possible,
	// or just return simple object. Here we return a structure similar to other stats.
	return result.map((r) => ({
		currentInputToken: r.current, // abusing this field for "current count"
		prevInputToken: r.prev, // abusing this field for "prev count"
		currentOutputToken: 0,
		prevOutputToken: 0,
	}));
}
