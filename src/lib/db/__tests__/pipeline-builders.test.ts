/**
 * Tests for MongoDB Aggregation Pipeline Builders
 *
 * These utilities create reusable pipeline stages for consistent queries.
 */

import {
	addTimeField,
	createCountByField,
	createPeriodComparisonFacet,
	groupByTimeAndModel,
	lookupParentMessage,
	matchDateRange,
	sortBy,
	sumTokens,
} from "../pipeline-builders";

describe("Pipeline Builders", () => {
	describe("matchDateRange", () => {
		it("should create a match stage with date range", () => {
			const startDate = new Date("2024-01-01T00:00:00Z");
			const endDate = new Date("2024-01-31T23:59:59Z");

			const result = matchDateRange(startDate, endDate);

			expect(result.$match).toBeDefined();
			expect(result.$match.createdAt.$gte).toEqual(startDate);
			expect(result.$match.createdAt.$lte).toEqual(endDate);
		});

		it("should merge additional filters", () => {
			const startDate = new Date("2024-01-01");
			const endDate = new Date("2024-01-31");

			const result = matchDateRange(startDate, endDate, {
				model: "gpt-4",
				endpoint: "openAI",
			});

			expect(result.$match.model).toBe("gpt-4");
			expect(result.$match.endpoint).toBe("openAI");
			expect(result.$match.createdAt).toBeDefined();
		});

		it("should handle same start and end date", () => {
			const sameDate = new Date("2024-01-15");

			const result = matchDateRange(sameDate, sameDate);

			expect(result.$match.createdAt.$gte).toEqual(sameDate);
			expect(result.$match.createdAt.$lte).toEqual(sameDate);
		});
	});

	describe("addTimeField", () => {
		it("should add hour field with correct format", () => {
			const result = addTimeField("hour");

			expect(result.$addFields.hour).toBeDefined();
			expect(result.$addFields.hour.$dateToString.format).toBe("%d, %H:00");
		});

		it("should add day field with correct format", () => {
			const result = addTimeField("day");

			expect(result.$addFields.day).toBeDefined();
			expect(result.$addFields.day.$dateToString.format).toBe("%Y-%m-%d");
		});

		it("should add month field with correct format", () => {
			const result = addTimeField("month");

			expect(result.$addFields.month).toBeDefined();
			expect(result.$addFields.month.$dateToString.format).toBe("%Y-%m");
		});

		it("should use custom date field", () => {
			const result = addTimeField("day", "$updatedAt");

			expect(result.$addFields.day.$dateToString.date).toBe("$updatedAt");
		});

		it("should default to $createdAt date field", () => {
			const result = addTimeField("day");

			expect(result.$addFields.day.$dateToString.date).toBe("$createdAt");
		});
	});

	describe("createPeriodComparisonFacet", () => {
		it("should create facet with current and previous period", () => {
			const startDate = new Date("2024-01-15");
			const endDate = new Date("2024-01-31");
			const prevStart = new Date("2024-01-01");
			const prevEnd = new Date("2024-01-15");

			const aggregationStages = [{ $group: { _id: null, count: { $sum: 1 } } }];

			const result = createPeriodComparisonFacet(
				startDate,
				endDate,
				prevStart,
				prevEnd,
				aggregationStages,
			);

			expect(result.$facet).toBeDefined();
			expect(result.$facet.current).toBeInstanceOf(Array);
			expect(result.$facet.prev).toBeInstanceOf(Array);
		});

		it("should apply correct date filters to each facet", () => {
			const startDate = new Date("2024-01-15");
			const endDate = new Date("2024-01-31");
			const prevStart = new Date("2024-01-01");
			const prevEnd = new Date("2024-01-15");

			const result = createPeriodComparisonFacet(
				startDate,
				endDate,
				prevStart,
				prevEnd,
				[],
			);

			// Current period filter
			const currentMatch = result.$facet.current[0].$match;
			expect(currentMatch.createdAt.$gte).toEqual(startDate);
			expect(currentMatch.createdAt.$lte).toEqual(endDate);

			// Previous period filter
			const prevMatch = result.$facet.prev[0].$match;
			expect(prevMatch.createdAt.$gte).toEqual(prevStart);
			expect(prevMatch.createdAt.$lte).toEqual(prevEnd);
		});

		it("should include aggregation stages after match", () => {
			const startDate = new Date("2024-01-15");
			const endDate = new Date("2024-01-31");
			const prevStart = new Date("2024-01-01");
			const prevEnd = new Date("2024-01-15");

			const aggregationStages = [
				{ $group: { _id: null, count: { $sum: 1 } } },
				{ $project: { total: "$count" } },
			];

			const result = createPeriodComparisonFacet(
				startDate,
				endDate,
				prevStart,
				prevEnd,
				aggregationStages,
			);

			// Match + 2 aggregation stages
			expect(result.$facet.current.length).toBe(3);
			expect(result.$facet.prev.length).toBe(3);
		});
	});

	describe("lookupParentMessage", () => {
		it("should create lookup and unwind stages", () => {
			const result = lookupParentMessage();

			expect(result).toBeInstanceOf(Array);
			expect(result.length).toBe(2);
		});

		it("should lookup from messages collection", () => {
			const [lookupStage] = lookupParentMessage();

			expect(lookupStage.$lookup.from).toBe("messages");
			expect(lookupStage.$lookup.localField).toBe("parentMessageId");
			expect(lookupStage.$lookup.foreignField).toBe("messageId");
			expect(lookupStage.$lookup.as).toBe("parentData");
		});

		it("should unwind parentData array", () => {
			const [, unwindStage] = lookupParentMessage();

			expect(unwindStage.$unwind).toBe("$parentData");
		});
	});

	describe("createCountByField", () => {
		it("should create count aggregation stages", () => {
			const result = createCountByField("userId");

			expect(result).toBeInstanceOf(Array);
			expect(result.length).toBe(3);
		});

		it("should group by specified field", () => {
			const result = createCountByField("model");

			expect(result[0].$group._id).toBe("$model");
		});

		it("should use custom count field name", () => {
			const result = createCountByField("user", "activeUsers");

			expect(result[1].$group.activeUsers).toBeDefined();
			expect(result[2].$project.activeUsers).toBe(1);
		});

		it("should default to 'count' field name", () => {
			const result = createCountByField("endpoint");

			expect(result[1].$group.count).toBeDefined();
		});
	});

	describe("sumTokens", () => {
		it("should create token sum aggregation", () => {
			const result = sumTokens();

			expect(result.$group).toBeDefined();
			expect(result.$group.totalTokens.$sum).toBe("$tokenCount");
			expect(result.$group.totalSummaryTokens.$sum).toBe("$summaryTokenCount");
			expect(result.$group.messageCount.$sum).toBe(1);
		});

		it("should merge custom group by fields", () => {
			const result = sumTokens({ _id: "$model" });

			expect(result.$group._id).toBe("$model");
			expect(result.$group.totalTokens).toBeDefined();
		});

		it("should use null grouping by default", () => {
			const result = sumTokens();

			expect(result.$group._id).toBeNull();
		});
	});

	describe("sortBy", () => {
		it("should create ascending sort by default", () => {
			const result = sortBy("createdAt");

			expect(result.$sort.createdAt).toBe(1);
		});

		it("should create descending sort", () => {
			const result = sortBy("tokenCount", -1);

			expect(result.$sort.tokenCount).toBe(-1);
		});

		it("should create ascending sort explicitly", () => {
			const result = sortBy("model", 1);

			expect(result.$sort.model).toBe(1);
		});
	});

	describe("groupByTimeAndModel", () => {
		it("should group by hour granularity", () => {
			const result = groupByTimeAndModel("hour");

			expect(result.$group._id.hour).toBe("$hour");
			expect(result.$group._id.model).toBe("$model");
			expect(result.$group._id.endpoint).toBe("$endpoint");
		});

		it("should group by day granularity", () => {
			const result = groupByTimeAndModel("day");

			expect(result.$group._id.day).toBe("$day");
		});

		it("should group by month granularity", () => {
			const result = groupByTimeAndModel("month");

			expect(result.$group._id.month).toBe("$month");
		});

		it("should include token and request counts", () => {
			const result = groupByTimeAndModel("day");

			expect(result.$group.totalTokens.$sum).toBe("$tokenCount");
			expect(result.$group.requests.$sum).toBe(1);
		});

		it("should merge additional group fields", () => {
			const result = groupByTimeAndModel("day", { agentId: "$agentId" });

			expect(result.$group._id.agentId).toBe("$agentId");
		});
	});

	describe("Pipeline Integration", () => {
		it("should create a complete token stats pipeline", () => {
			const startDate = new Date("2024-01-01");
			const endDate = new Date("2024-01-31");

			const pipeline = [
				matchDateRange(startDate, endDate),
				sumTokens(),
				{ $project: { total: "$totalTokens", _id: 0 } },
			];

			expect(pipeline.length).toBe(3);
			expect(pipeline[0].$match).toBeDefined();
			expect(pipeline[1].$group).toBeDefined();
			expect(pipeline[2].$project).toBeDefined();
		});

		it("should create a complete time series pipeline", () => {
			const startDate = new Date("2024-01-01");
			const endDate = new Date("2024-01-31");

			const pipeline = [
				matchDateRange(startDate, endDate),
				addTimeField("day"),
				groupByTimeAndModel("day"),
				sortBy("_id.day"),
			];

			expect(pipeline.length).toBe(4);
		});
	});
});
