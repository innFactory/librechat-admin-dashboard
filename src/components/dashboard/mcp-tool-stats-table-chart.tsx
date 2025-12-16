"use client";

import Box from "@mui/material/Box";
import { blue } from "@mui/material/colors";
import { LineChart, lineElementClasses } from "@mui/x-charts/LineChart";
import { useAtom, useAtomValue } from "jotai";
import { loadable } from "jotai/utils";
import { useMemo } from "react";
import { dateRangeAtom } from "@/atoms/date-range-atom";
import { mcpToolStatsChartAtom } from "@/atoms/mcp-tool-stats-chart-atom";

type Props = {
	toolName: string;
	serverName: string;
};

const margin = { right: 24 };

const McpToolStatsTableChart = ({ toolName, serverName }: Props) => {
	const loadableChartAtom = loadable(mcpToolStatsChartAtom);
	const [chartResponse] = useAtom(loadableChartAtom);
	const _timeArea = useAtomValue(dateRangeAtom);

	// Filter and prepare chart data for this specific tool
	const { chartData, xLabels } = useMemo(() => {
		if (chartResponse.state !== "hasData") {
			return { chartData: [], xLabels: [] };
		}

		const filteredData = chartResponse.data.data.filter(
			(item) => item.toolName === toolName && item.serverName === serverName,
		);

		// Get unique dates and sort them
		const dates = [...new Set(filteredData.map((item) => item.date))].sort();

		// Create a map of date -> callCount
		const dataMap = new Map(
			filteredData.map((item) => [item.date, item.callCount]),
		);

		// Generate chart data with 0 for missing dates
		const data = dates.map((date) => ({
			date,
			callCount: dataMap.get(date) ?? 0,
		}));

		return {
			chartData: data,
			xLabels: dates,
		};
	}, [chartResponse, toolName, serverName]);

	return (
		<Box
			sx={{
				width: "100%",
				height: 250,
			}}
		>
			<LineChart
				series={[
					{
						data: chartData.map((item) => item.callCount),
						label: "Calls",
						area: true,
						showMark: false,
						color: blue["500"],
					},
				]}
				xAxis={[{ scaleType: "point", data: xLabels }]}
				yAxis={[{ width: 50 }]}
				sx={{
					[`& .${lineElementClasses.root}`]: {
						display: "none",
					},
				}}
				key={JSON.stringify(xLabels)}
				margin={margin}
				loading={chartResponse.state === "loading"}
			/>
		</Box>
	);
};

export default McpToolStatsTableChart;
