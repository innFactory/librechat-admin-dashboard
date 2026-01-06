import { NextResponse } from "next/server";
import {
	getDateParamsFromUrl,
	validateDateRange,
} from "@/lib/api/date-validation";
import { getAgentTimeSeries } from "@/lib/db/repositories";
import type { TimeGranularity } from "@/lib/db/types";

// Map frontend time area values to granularity
const TIME_AREA_TO_GRANULARITY: Record<string, TimeGranularity> = {
	day: "hour", // Day view shows hourly data
	week: "day", // Week view shows daily data
	month: "day", // Month view shows daily data
	year: "month", // Year view shows monthly data
};

const VALID_TIME_AREAS = ["day", "week", "month", "year"];

export async function GET(request: Request) {
	try {
		const { searchParams } = new URL(request.url);
		const { start, end } = getDateParamsFromUrl(request);
		const agentName = searchParams.get("agent");
		const timeArea = searchParams.get("groupRange");
		const timezone = searchParams.get("timezone") || "UTC";

		const validation = validateDateRange(start, end);
		if (!validation.success) {
			return validation.error;
		}

		if (!agentName) {
			return NextResponse.json(
				{ error: "Missing required query parameter: agent" },
				{ status: 400 },
			);
		}

		if (!timeArea || !VALID_TIME_AREAS.includes(timeArea)) {
			return NextResponse.json(
				{
					error:
						"Invalid or missing groupRange parameter. Valid values: day, week, month, year",
				},
				{ status: 400 },
			);
		}

		const granularity = TIME_AREA_TO_GRANULARITY[timeArea];
		const data = await getAgentTimeSeries({
			...validation.data,
			agentName,
			granularity,
			timezone,
		});

		return NextResponse.json(data);
	} catch (e) {
		console.error("Error in all-agents-stats-table-chart API:", e);
		return NextResponse.json({ error: (e as Error).message }, { status: 500 });
	}
}
