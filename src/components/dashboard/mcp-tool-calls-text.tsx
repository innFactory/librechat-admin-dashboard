"use client";

import BuildIcon from "@mui/icons-material/Build";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import TrendingFlatIcon from "@mui/icons-material/TrendingFlat";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import { Box, useColorScheme } from "@mui/material";
import Skeleton from "@mui/material/Skeleton";
import Typography from "@mui/material/Typography";
import { useAtomValue } from "jotai";
import { loadable } from "jotai/utils";
import { useEffect, useMemo, useState } from "react";
import { dateRangeAtom } from "@/atoms/date-range-atom";
import { mcpToolCallsAtom } from "@/atoms/mcp-tool-calls-atom";
import { useLoadableWithCache } from "@/hooks/useLoadableWithCache";

const loadableMcpToolCallsAtom = loadable(mcpToolCallsAtom);

// Helper to determine if date range is "today"
function isToday(startDate: Date | null, endDate: Date | null): boolean {
	if (!startDate || !endDate) return false;
	const today = new Date();
	const start = new Date(startDate);
	const end = new Date(endDate);
	return (
		start.getDate() === today.getDate() &&
		start.getMonth() === today.getMonth() &&
		start.getFullYear() === today.getFullYear() &&
		end.getDate() === today.getDate()
	);
}

// Helper to determine if date range is "yesterday"
function isYesterday(startDate: Date | null, endDate: Date | null): boolean {
	if (!startDate || !endDate) return false;
	const yesterday = new Date();
	yesterday.setDate(yesterday.getDate() - 1);
	const start = new Date(startDate);
	const end = new Date(endDate);
	return (
		start.getDate() === yesterday.getDate() &&
		start.getMonth() === yesterday.getMonth() &&
		start.getFullYear() === yesterday.getFullYear() &&
		end.getDate() === yesterday.getDate()
	);
}

// Helper to determine if date range is "this month"
function isThisMonth(startDate: Date | null, endDate: Date | null): boolean {
	if (!startDate || !endDate) return false;
	const today = new Date();
	const start = new Date(startDate);
	const end = new Date(endDate);
	return (
		start.getDate() === 1 &&
		start.getMonth() === today.getMonth() &&
		start.getFullYear() === today.getFullYear() &&
		end.getMonth() === today.getMonth() &&
		end.getFullYear() === today.getFullYear()
	);
}

// Helper to determine if date range is "this year"
function isThisYear(startDate: Date | null, endDate: Date | null): boolean {
	if (!startDate || !endDate) return false;
	const today = new Date();
	const start = new Date(startDate);
	return (
		start.getDate() === 1 &&
		start.getMonth() === 0 &&
		start.getFullYear() === today.getFullYear()
	);
}

const McpToolCallsText = () => {
	const { data, showSkeleton, isRefetching, isFirstLoad } =
		useLoadableWithCache(loadableMcpToolCallsAtom);
	const dateRange = useAtomValue(dateRangeAtom);
	const [isClient, setIsClient] = useState(false);
	const { mode } = useColorScheme();

	const isTodayRange = useMemo(
		() => isToday(dateRange.startDate, dateRange.endDate),
		[dateRange],
	);

	useEffect(() => {
		setIsClient(true);
	}, []);

	// Determine label based on date range
	const label = useMemo(() => {
		if (isTodayRange) {
			return "Today's MCP Calls";
		}
		if (isYesterday(dateRange.startDate, dateRange.endDate)) {
			return "Yesterday's MCP Calls";
		}
		if (isThisMonth(dateRange.startDate, dateRange.endDate)) {
			return "This Month's MCP Calls";
		}
		if (isThisYear(dateRange.startDate, dateRange.endDate)) {
			return "This Year's MCP Calls";
		}
		return "MCP Calls";
	}, [dateRange.startDate, dateRange.endDate, isTodayRange]);

	// Trend logic
	const { trendValue, trendLabel, showTrend } = useMemo(() => {
		if (!data) {
			return { trendValue: null, trendLabel: "", showTrend: false };
		}

		const current = data.currentMcpToolCalls ?? 0;
		const prevFromApi = data.prevMcpToolCalls ?? 0;

		// First load - no trend
		if (isFirstLoad) {
			return { trendValue: null, trendLabel: "", showTrend: false };
		}

		// Compare vs previous period (from API)
		const delta = current - prevFromApi;
		if (delta === 0) {
			return { trendValue: 0, trendLabel: "vs. prev. period", showTrend: true };
		}
		return {
			trendValue: delta,
			trendLabel: "vs. prev. period",
			showTrend: true,
		};
	}, [data, isFirstLoad]);

	return (
		<div
			style={{
				padding: "20px",
				alignItems: "center",
				display: "flex",
				flexDirection: "column",
				height: "100%",
			}}
		>
			<Box
				sx={{
					minHeight: "48px",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					gap: 1,
				}}
			>
				<BuildIcon
					sx={{
						fontSize: "1rem",
						color:
							mode === "dark" ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.5)",
					}}
				/>
				<Typography
					variant="caption"
					sx={{
						fontWeight: 500,
						textTransform: "uppercase",
						letterSpacing: "0.02em",
						color:
							mode === "dark" ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.5)",
						fontSize: "13px",
						lineHeight: 1.3,
					}}
				>
					{label}
				</Typography>
			</Box>
			<div
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					marginTop: "12px",
				}}
			>
				{showSkeleton && isClient && (
					<Box sx={{ textAlign: "center" }}>
						<Skeleton
							variant="text"
							width={80}
							height={45}
							animation="wave"
							sx={{
								backgroundColor:
									mode === "dark"
										? "rgba(255, 255, 255, 0.1)"
										: "rgba(0, 0, 0, 0.05)",
								margin: "0 auto",
							}}
						/>
						<Box sx={{ minHeight: "21px" }} />
					</Box>
				)}
				{!showSkeleton && isClient && (
					<Box sx={{ textAlign: "center" }}>
						<Typography
							variant="h4"
							sx={{
								fontWeight: 700,
								fontSize: "32px",
								letterSpacing: "-0.03em",
								background:
									mode === "dark"
										? "linear-gradient(135deg, #f5f5f7 0%, rgba(255,255,255,0.8) 100%)"
										: "linear-gradient(135deg, #1d1d1f 0%, rgba(0,0,0,0.8) 100%)",
								backgroundClip: "text",
								WebkitBackgroundClip: "text",
								WebkitTextFillColor: "transparent",
								opacity: isRefetching ? 0.6 : 1,
								transition: "opacity 0.2s ease",
							}}
						>
							{data?.currentMcpToolCalls?.toLocaleString() ?? 0}
						</Typography>
						{showTrend && trendValue !== null && trendValue !== 0 ? (
							<Box
								sx={{
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
									gap: 0.5,
									mt: 0.5,
									minHeight: "21px",
								}}
							>
								{trendValue > 0 && (
									<TrendingUpIcon
										sx={{
											fontSize: "16px",
											color: mode === "dark" ? "#86efac" : "#22c55e",
										}}
									/>
								)}
								{trendValue < 0 && (
									<TrendingDownIcon
										sx={{
											fontSize: "16px",
											color: mode === "dark" ? "#fca5a5" : "#ef4444",
										}}
									/>
								)}
								<Typography
									variant="caption"
									sx={{
										fontSize: "13px",
										fontWeight: 500,
										color:
											trendValue > 0
												? mode === "dark"
													? "#86efac"
													: "#22c55e"
												: mode === "dark"
													? "#fca5a5"
													: "#ef4444",
									}}
								>
									{trendValue > 0 ? `+${trendValue}` : trendValue} {trendLabel}
								</Typography>
							</Box>
						) : showTrend && trendValue === 0 ? (
							<Box
								sx={{
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
									gap: 0.5,
									mt: 0.5,
									minHeight: "21px",
								}}
							>
								<TrendingFlatIcon
									sx={{
										fontSize: "16px",
										color:
											mode === "dark"
												? "rgba(255,255,255,0.4)"
												: "rgba(0,0,0,0.3)",
									}}
								/>
								<Typography
									variant="caption"
									sx={{
										fontSize: "13px",
										fontWeight: 500,
										color:
											mode === "dark"
												? "rgba(255,255,255,0.4)"
												: "rgba(0,0,0,0.3)",
									}}
								>
									{trendLabel}
								</Typography>
							</Box>
						) : (
							<Box sx={{ minHeight: "21px" }} />
						)}
					</Box>
				)}
			</div>
		</div>
	);
};

export default McpToolCallsText;
