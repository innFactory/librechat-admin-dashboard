"use client";

import SearchIcon from "@mui/icons-material/Search";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import { Box, useColorScheme } from "@mui/material";
import Skeleton from "@mui/material/Skeleton";
import Typography from "@mui/material/Typography";
import { useAtomValue } from "jotai";
import { loadable } from "jotai/utils";
import { useEffect, useMemo, useState } from "react";
import { autoRefreshAtom } from "@/atoms/auto-refresh-atom";
import { dateRangeAtom } from "@/atoms/date-range-atom";
import { webSearchStatsAtom } from "@/atoms/web-search-stats-atom";
import {
	getDateRangeLabel,
	isToday,
} from "@/components/utils/date-range-helpers";
import { useLoadableWithCache } from "@/hooks/useLoadableWithCache";

const loadableWebSearchAtom = loadable(webSearchStatsAtom);

const WebSearchStatsText = () => {
	const { data, previousData, showSkeleton, isRefetching, isFirstLoad } =
		useLoadableWithCache(loadableWebSearchAtom);
	const autoRefreshEnabled = useAtomValue(autoRefreshAtom);
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

	// Date range label for subtitle
	const _dateRangeLabel = useMemo(
		() => getDateRangeLabel(dateRange.startDate, dateRange.endDate),
		[dateRange.startDate, dateRange.endDate],
	);

	// Trend logic - only for live refresh mode
	const { trendValue, showTrend } = useMemo(() => {
		if (!data) {
			return { trendValue: null, showTrend: false };
		}

		const current = data.current?.searchCount ?? 0;

		// First load - no trend
		if (isFirstLoad) {
			return { trendValue: null, showTrend: false };
		}

		// Today + Auto-Refresh: Show delta since last refresh
		if (isTodayRange && autoRefreshEnabled && previousData) {
			const previousCurrent = previousData.current?.searchCount ?? 0;
			const delta = current - previousCurrent;
			return { trendValue: delta, showTrend: delta !== 0 };
		}

		// No trend for other ranges
		return { trendValue: null, showTrend: false };
	}, [data, previousData, isFirstLoad, isTodayRange, autoRefreshEnabled]);

	const searchCount = data?.current?.searchCount ?? 0;

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
				<SearchIcon
					sx={{
						fontSize: "1rem",
						color:
							mode === "dark" ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.5)",
					}}
				/>
				<Typography
					align={"center"}
					sx={{
						color:
							mode === "dark" ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.55)",
						fontSize: "13px",
						fontWeight: 500,
						letterSpacing: "0.02em",
						textTransform: "uppercase",
						lineHeight: 1.3,
					}}
				>
					Web Searches
				</Typography>
			</Box>

			{!isClient || showSkeleton ? (
				<div style={{ marginTop: "12px" }}>
					<Skeleton
						variant={"text"}
						width={100}
						height={40}
						sx={{
							margin: "0 auto",
							backgroundColor:
								mode === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
							borderRadius: "8px",
						}}
						animation={"wave"}
					/>
					<Box sx={{ minHeight: "21px" }} />
				</div>
			) : (
				<Box
					sx={{
						opacity: isRefetching ? 0.7 : 1,
						transition: "opacity 0.2s ease",
					}}
				>
					<Typography
						variant="h5"
						marginTop="12px"
						align="center"
						sx={{
							fontWeight: 700,
							fontSize: "32px",
							letterSpacing: "-0.03em",
							background:
								mode === "dark"
									? "linear-gradient(135deg, #f5f5f7 0%, rgba(255,255,255,0.85) 100%)"
									: "linear-gradient(135deg, #1d1d1f 0%, rgba(0,0,0,0.85) 100%)",
							backgroundClip: "text",
							WebkitBackgroundClip: "text",
							WebkitTextFillColor: "transparent",
						}}
					>
						{searchCount.toLocaleString("de-DE")}
					</Typography>
					{showTrend && trendValue !== null && trendValue !== 0 ? (
						<Typography
							align="center"
							fontSize={"13px"}
							sx={{
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								gap: "4px",
								marginTop: "4px",
								fontWeight: 500,
								color: trendValue > 0 ? "#30d158" : "#ff453a",
							}}
						>
							{trendValue > 0 ? (
								<TrendingUpIcon sx={{ fontSize: "16px" }} />
							) : (
								<TrendingDownIcon sx={{ fontSize: "16px" }} />
							)}
							{trendValue > 0 ? "+" : ""}
							{trendValue.toLocaleString("de-DE")}
						</Typography>
					) : (
						<Box sx={{ minHeight: "21px" }} />
					)}
				</Box>
			)}
		</div>
	);
};

export default WebSearchStatsText;
