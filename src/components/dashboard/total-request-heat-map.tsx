"use client";

import { CircularProgress, useColorScheme } from "@mui/material";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Paper from "@mui/material/Paper";
import { styled, useTheme } from "@mui/material/styles";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import {
	eachDayOfInterval,
	eachWeekOfInterval,
	format,
	getDay,
	getISOWeek,
} from "date-fns";
import { useAtom } from "jotai";
import { loadable } from "jotai/utils";
import { useEffect, useMemo, useState } from "react";
import { dateRangeAtom } from "@/atoms/date-range-atom";
import { totalRequestHeatMapAtom } from "@/atoms/total-request-heat-map-atom";
import type { RequestHeatMap } from "@/components/models/request-heat-map";
import {
	getHeatmapGranularity,
	type HeatmapGranularity,
} from "@/components/utils/date-range-helpers";

const timeSlotsLabels = [
	"00",
	"01",
	"02",
	"03",
	"04",
	"05",
	"06",
	"07",
	"08",
	"09",
	"10",
	"11",
	"12",
	"13",
	"14",
	"15",
	"16",
	"17",
	"18",
	"19",
	"20",
	"21",
	"22",
	"23",
];

const weekdayLabelsShort = ["M", "T", "W", "T", "F", "S", "S"];

const getColorByUsage = (
	value: number,
	maxValue: number,
	mode: string | undefined,
	systemMode: string | undefined,
) => {
	if (value === 0) {
		return mode === "dark"
			? "rgba(255, 255, 255, 0.08)"
			: "rgba(0, 0, 0, 0.05)";
	}
	const intensity = maxValue > 0 ? value / maxValue : 0;
	const alpha = 0.2 + intensity * 0.8;
	const base =
		mode === "dark" || systemMode === "dark" ? "0, 191, 255" : "0, 86, 179";
	return `rgba(${base}, ${alpha})`;
};

const Item = styled(Paper)(({ theme }) => ({
	...theme.typography.body2,
	padding: theme.spacing(2),
	textAlign: "center",
	color: theme.vars?.palette.text.secondary,
	width: "100%",
	height: "100%",
	display: "flex",
	alignItems: "center",
	justifyContent: "center",
}));

// Map raw heatmap data to different formats based on granularity
type HeatmapMatrix = {
	type: HeatmapGranularity;
	data: number[][];
	rowLabels: string[];
	colLabels: string[];
};

// Convert ISO day of week (1=Monday, 7=Sunday) to our index (0=Monday, 6=Sunday)
const isoToIndex = (isoDow: number) => isoDow - 1;

// Create hourly view for single day
const createHourlyView = (
	rawData: RequestHeatMap[],
	dateRange: { startDate: Date | null; endDate: Date | null },
): HeatmapMatrix => {
	const hourlyData: number[] = Array(24).fill(0);

	// For single day, aggregate by hour
	rawData.forEach((entry) => {
		if (entry.timeSlot >= 0 && entry.timeSlot < 24) {
			hourlyData[entry.timeSlot] += entry.totalRequests;
		}
	});

	// Single row for hourly view
	return {
		type: "hourly",
		data: [hourlyData],
		rowLabels: [dateRange.startDate ? format(dateRange.startDate, "EEEE") : ""],
		colLabels: timeSlotsLabels,
	};
};

// Create daily view for week (7 rows with date labels, 24 columns for hours)
const createWeeklyDailyView = (
	rawData: RequestHeatMap[],
	dateRange: { startDate: Date | null; endDate: Date | null },
): HeatmapMatrix => {
	if (!dateRange.startDate || !dateRange.endDate) {
		return {
			type: "daily",
			data: [],
			rowLabels: [],
			colLabels: timeSlotsLabels,
		};
	}

	// Get all days in the range
	const days = eachDayOfInterval({
		start: dateRange.startDate,
		end: dateRange.endDate,
	});

	// Create matrix: rows = days, columns = hours
	const matrix: number[][] = days.map(() => Array(24).fill(0));

	// Map raw data (dayOfWeek + hour) to actual dates
	rawData.forEach((entry) => {
		// Since data is aggregated by weekday, we might have multiple matching days
		days.forEach((day, idx) => {
			const dow = getDay(day);
			const isoDow = dow === 0 ? 7 : dow;
			if (
				isoDow === entry.dayOfWeek &&
				entry.timeSlot >= 0 &&
				entry.timeSlot < 24
			) {
				matrix[idx][entry.timeSlot] += entry.totalRequests;
			}
		});
	});

	// Create day labels (e.g., "Mon 27.")
	const rowLabels = days.map((day) => format(day, "EEE d."));

	return {
		type: "daily",
		data: matrix,
		rowLabels,
		colLabels: timeSlotsLabels,
	};
};

// Create month view - days on Y-axis, hours grouped in 6 blocks
const createMonthView = (
	rawData: RequestHeatMap[],
	dateRange: { startDate: Date | null; endDate: Date | null },
): HeatmapMatrix => {
	if (!dateRange.startDate || !dateRange.endDate) {
		return { type: "daily", data: [], rowLabels: [], colLabels: [] };
	}

	// Get all days in the range
	const days = eachDayOfInterval({
		start: dateRange.startDate,
		end: dateRange.endDate,
	});

	// For month view, group hours into 6 blocks (4 hours each)
	const hourGroups = ["00-03", "04-07", "08-11", "12-15", "16-19", "20-23"];
	const matrix: number[][] = days.map(() => Array(6).fill(0));

	rawData.forEach((entry) => {
		days.forEach((day, idx) => {
			const dow = getDay(day);
			const isoDow = dow === 0 ? 7 : dow;
			if (
				isoDow === entry.dayOfWeek &&
				entry.timeSlot >= 0 &&
				entry.timeSlot < 24
			) {
				const groupIdx = Math.floor(entry.timeSlot / 4);
				matrix[idx][groupIdx] += entry.totalRequests;
			}
		});
	});

	const rowLabels = days.map((day) => format(day, "d."));

	return {
		type: "daily",
		data: matrix,
		rowLabels,
		colLabels: hourGroups,
	};
};

// Create GitHub-style yearly view - weeks on X-axis, weekdays on Y-axis
const createYearlyView = (
	rawData: RequestHeatMap[],
	dateRange: { startDate: Date | null; endDate: Date | null },
): HeatmapMatrix => {
	if (!dateRange.startDate || !dateRange.endDate) {
		return {
			type: "weekly",
			data: [],
			rowLabels: weekdayLabelsShort,
			colLabels: [],
		};
	}

	// Get all weeks in the range
	const weeks = eachWeekOfInterval(
		{ start: dateRange.startDate, end: dateRange.endDate },
		{ weekStartsOn: 1 },
	);

	// Matrix: 7 rows (Mon-Sun), n columns (weeks)
	const matrix: number[][] = Array(7)
		.fill(null)
		.map(() => Array(weeks.length).fill(0));

	// Map raw data to specific week and day
	rawData.forEach((entry) => {
		if (!entry.date) return; // Skip if no date (should not happen with new query)

		const entryDate = new Date(entry.date);
		const dayIndex = isoToIndex(entry.dayOfWeek);

		// Find which week this date belongs to
		// We compare ISO week numbers and years
		const _entryWeek = getISOWeek(entryDate);
		// Simple approximation: find the index in our weeks array
		// A more robust way is to find the week start date that matches
		const weekIndex = weeks.findIndex((week) => {
			const _w = getISOWeek(week);
			// Check if same week number. Note: this is simplified and might have edge cases around year boundaries
			// but for a "yearly view" usually within one year or continuous range it's okay.
			// Better: check if date is within the week interval
			const weekStart = week;
			const weekEnd = new Date(week);
			weekEnd.setDate(weekEnd.getDate() + 6);
			return entryDate >= weekStart && entryDate <= weekEnd;
		});

		if (
			dayIndex >= 0 &&
			dayIndex < 7 &&
			weekIndex >= 0 &&
			weekIndex < weeks.length
		) {
			matrix[dayIndex][weekIndex] += entry.totalRequests;
		}
	});

	// Create week labels (e.g., "W1", "W2", ...)
	const colLabels = weeks.map((week) => `W${getISOWeek(week)}`);

	return {
		type: "weekly",
		data: matrix,
		rowLabels: weekdayLabelsShort,
		colLabels,
	};
};

const TotalRequestHeatMap = () => {
	const loadableHeatMapAtom = loadable(totalRequestHeatMapAtom);
	const [heatMapData] = useAtom(loadableHeatMapAtom);
	const [dateRange] = useAtom(dateRangeAtom);

	const { vars } = useTheme();
	const [isClient, setIsClient] = useState(false);
	const { mode, systemMode } = useColorScheme();

	useEffect(() => {
		setIsClient(true);
	}, []);

	// Determine granularity based on date range
	const granularity = useMemo(() => {
		return getHeatmapGranularity(dateRange.startDate, dateRange.endDate);
	}, [dateRange.startDate, dateRange.endDate]);

	// Transform data based on granularity
	const heatmapMatrix = useMemo<HeatmapMatrix>(() => {
		if (heatMapData.state !== "hasData") {
			return { type: granularity, data: [], rowLabels: [], colLabels: [] };
		}

		const rawData = heatMapData.data;

		switch (granularity) {
			case "hourly":
				return createHourlyView(rawData, dateRange);
			case "daily": {
				// Check if it's more like a week or a month
				const diffMs =
					dateRange.endDate && dateRange.startDate
						? dateRange.endDate.getTime() - dateRange.startDate.getTime()
						: 0;
				const diffDays = diffMs / (1000 * 60 * 60 * 24);
				if (diffDays <= 7) {
					return createWeeklyDailyView(rawData, dateRange);
				}
				return createMonthView(rawData, dateRange);
			}
			case "weekly":
			case "monthly":
				return createYearlyView(rawData, dateRange);
			default:
				return createWeeklyDailyView(rawData, dateRange);
		}
	}, [heatMapData, dateRange, granularity]);

	const maxValue = useMemo(() => {
		return Math.max(1, ...heatmapMatrix.data.flat());
	}, [heatmapMatrix.data]);

	// Title based on granularity
	const getTitle = () => {
		switch (granularity) {
			case "hourly":
				return "Requests per Hour";
			case "daily":
				return "Requests per Hour";
			case "weekly":
				return "Requests per Week";
			case "monthly":
				return "Requests per Month";
			default:
				return "Request Heatmap";
		}
	};

	return (
		<Box
			sx={{
				width: "100%",
				height: "100%",
				display: "flex",
				flexDirection: "column",
			}}
		>
			<Typography
				variant="h6"
				display="flex"
				justifyContent="center"
				marginBottom={1}
				sx={{
					fontWeight: 600,
					letterSpacing: "-0.02em",
					background:
						mode === "dark"
							? "linear-gradient(135deg, #f5f5f7 0%, rgba(255,255,255,0.7) 100%)"
							: "linear-gradient(135deg, #1d1d1f 0%, rgba(0,0,0,0.7) 100%)",
					backgroundClip: "text",
					WebkitBackgroundClip: "text",
					WebkitTextFillColor: "transparent",
				}}
			>
				{getTitle()}
			</Typography>

			<Box
				sx={{
					flex: 1,
					position: "relative",
					width: "100%",
					display: "flex",
					justifyContent: "center",
				}}
			>
				{heatMapData.state === "hasError" && isClient && (
					<Box
						sx={{
							position: "absolute",
							zIndex: 11,
							top: 0,
							left: 0,
							width: "100%",
							height: "100%",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							background: vars?.palette.background.paper,
						}}
					>
						<Typography sx={{ color: "red" }}>Error loading data</Typography>
					</Box>
				)}
				{heatMapData.state === "loading" && isClient && (
					<Box
						sx={{
							position: "absolute",
							zIndex: 11,
							top: 0,
							left: 0,
							width: "100%",
							height: "100%",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
						}}
					>
						<CircularProgress size={48} />
					</Box>
				)}

				{isClient && (
					<Box
						sx={{
							opacity: heatMapData.state === "loading" ? 0.15 : 1,
							transition: "opacity 0.15s",
							width: "100%",
							height: "100%",
						}}
					>
						{/* Yearly/GitHub-style view */}
						{(granularity === "weekly" || granularity === "monthly") &&
							heatmapMatrix.data.length > 0 && (
								<Box
									sx={{
										width: "100%",
										height: "100%",
										display: "flex",
										flexDirection: "column",
									}}
								>
									{/* Week number labels at top */}
									<Grid
										container
										columns={heatmapMatrix.colLabels.length + 1}
										spacing={0.5}
										marginBottom={0.5}
									>
										<Grid size={1} />
										{heatmapMatrix.colLabels.map((label, idx) => (
											<Grid key={`col-${label}-${idx}`} size={1}>
												<Typography
													variant="caption"
													align="center"
													sx={{
														fontSize: "8px",
														opacity: idx % 4 === 0 ? 1 : 0,
													}}
												>
													{idx % 4 === 0 ? label : ""}
												</Typography>
											</Grid>
										))}
									</Grid>
									{/* Weekday rows */}
									{heatmapMatrix.rowLabels.map((label, rowIdx) => (
										<Grid
											container
											columns={heatmapMatrix.colLabels.length + 1}
											spacing={0.3}
											key={`row-${label}-${rowIdx}`}
											marginTop={0.3}
											sx={{ flex: 1 }}
										>
											<Grid
												size={1}
												sx={{
													display: "flex",
													alignItems: "center",
													justifyContent: "center",
												}}
											>
												<Typography
													variant="caption"
													align="center"
													sx={{ fontSize: "9px" }}
												>
													{label}
												</Typography>
											</Grid>
											{heatmapMatrix.data[rowIdx]?.map((value, colIdx) => {
												const color = getColorByUsage(
													value,
													maxValue,
													mode,
													systemMode,
												);
												return (
													<Grid
														key={`cell-${rowIdx}-${colIdx}`}
														size={1}
														sx={{ height: "100%" }}
													>
														<Tooltip
															title={
																<Typography
																	variant="body2"
																	sx={{ padding: "5px" }}
																>
																	{`${value} request${value === 1 ? "" : "s"}`}
																</Typography>
															}
															arrow
															enterDelay={100}
															leaveDelay={50}
														>
															<Item
																sx={{
																	backgroundColor: color,
																	padding: 0,
																	borderRadius: "2px",
																	"&:hover": {
																		transform: "scale(1.3)",
																	},
																}}
															/>
														</Tooltip>
													</Grid>
												);
											})}
										</Grid>
									))}
								</Box>
							)}

						{/* Daily/Hourly view */}
						{(granularity === "hourly" || granularity === "daily") &&
							heatmapMatrix.data.length > 0 && (
								<Box
									sx={{
										width: "100%",
										height: "100%",
										display: "flex",
										flexDirection: "column",
									}}
								>
									{/* Hour labels at top */}
									<Grid
										container
										columns={heatmapMatrix.colLabels.length + 1}
										spacing={0.5}
										marginBottom={1}
									>
										<Grid size={1} />
										{heatmapMatrix.colLabels.map((slot, idx) => (
											<Grid key={`hour-${slot}-${idx}`} size={1}>
												<Typography
													variant="caption"
													align="center"
													sx={{ fontSize: "10px" }}
												>
													{slot}
												</Typography>
											</Grid>
										))}
									</Grid>
									{/* Day rows */}
									{heatmapMatrix.rowLabels.map((label, rowIdx) => (
										<Grid
											container
											columns={heatmapMatrix.colLabels.length + 1}
											spacing={0.5}
											key={`day-${label}-${rowIdx}`}
											marginTop={0.5}
											sx={{ flex: 1 }}
										>
											<Grid
												size={1}
												sx={{
													display: "flex",
													alignItems: "center",
													justifyContent: "center",
												}}
											>
												<Typography
													variant="subtitle2"
													align="center"
													sx={{ fontSize: "11px", whiteSpace: "nowrap" }}
												>
													{label}
												</Typography>
											</Grid>
											{heatmapMatrix.data[rowIdx]?.map((value, colIdx) => {
												const color = getColorByUsage(
													value,
													maxValue,
													mode,
													systemMode,
												);
												return (
													<Grid
														key={`cell-${rowIdx}-${colIdx}`}
														size={1}
														sx={{ height: "100%" }}
													>
														<Tooltip
															title={
																<Typography
																	variant="body2"
																	sx={{ padding: "5px" }}
																>
																	{`${value} request${value === 1 ? "" : "s"}`}
																</Typography>
															}
															arrow
															enterDelay={100}
															leaveDelay={50}
															disableInteractive={true}
														>
															<Item
																sx={{
																	zIndex: 2,
																	overflow: "visible",
																	transition:
																		"transform 0.25s ease, box-shadow 0.25s ease",
																	backgroundColor: color,
																	padding: 0,
																	"&:hover": {
																		transform: "scale(1.15)",
																	},
																}}
															/>
														</Tooltip>
													</Grid>
												);
											})}
										</Grid>
									))}
								</Box>
							)}

						{/* Empty state */}
						{heatmapMatrix.data.length === 0 &&
							heatMapData.state === "hasData" && (
								<Box sx={{ textAlign: "center", padding: 4 }}>
									<Typography color="text.secondary">
										No data for this period
									</Typography>
								</Box>
							)}
					</Box>
				)}
			</Box>
		</Box>
	);
};

export default TotalRequestHeatMap;
