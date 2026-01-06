"use client";

import InputIcon from "@mui/icons-material/Input";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import TrendingFlatIcon from "@mui/icons-material/TrendingFlat";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import { Box, Tooltip, useColorScheme } from "@mui/material";
import Skeleton from "@mui/material/Skeleton";
import Typography from "@mui/material/Typography";
import { useAtomValue } from "jotai";
import { loadable } from "jotai/utils";
import { useEffect, useMemo, useState } from "react";
import { dateRangeAtom } from "@/atoms/date-range-atom";
import { inputOuputTokenAtom } from "@/atoms/input-output-token-atom";
import {
	isThisMonth,
	isThisYear,
	isToday,
	isYesterday,
} from "@/components/utils/date-range-helpers";
import {
	formatLargeNumber,
	formatTrendValue,
} from "@/components/utils/format-number";
import { useLoadableWithCache } from "@/hooks/useLoadableWithCache";

const loadableInputTokenAtom = loadable(inputOuputTokenAtom);

const InputTokenText = () => {
	const { data, showSkeleton, isRefetching, isFirstLoad } =
		useLoadableWithCache(loadableInputTokenAtom);
	const dateRange = useAtomValue(dateRangeAtom);
	const [isClient, setIsClient] = useState(false);
	const { mode } = useColorScheme();

	const isTodayRange = useMemo(
		() => isToday(dateRange.startDate, dateRange.endDate),
		[dateRange],
	);

	//https://nextjs.org/docs/messages/react-hydration-error
	useEffect(() => {
		setIsClient(true);
	}, []);

	// Determine label based on date range
	const label = useMemo(() => {
		if (isTodayRange) {
			return "Today's Input Token";
		}
		if (isYesterday(dateRange.startDate, dateRange.endDate)) {
			return "Yesterday's Input Token";
		}
		if (isThisMonth(dateRange.startDate, dateRange.endDate)) {
			return "This Month's Input Token";
		}
		if (isThisYear(dateRange.startDate, dateRange.endDate)) {
			return "This Year's Input Token";
		}
		return "Input Token";
	}, [dateRange.startDate, dateRange.endDate, isTodayRange]);

	// Trend logic:
	// - First load: No trend (no previous data to compare)
	// - Today + Auto-Refresh ON: Show delta since last refresh
	// - Today + Auto-Refresh OFF: Show comparison vs yesterday (from API)
	// - Other ranges: Show comparison vs previous period (from API)
	const { trendValue, trendLabel, showTrend } = useMemo(() => {
		if (!data || data.length === 0) {
			return { trendValue: null, trendLabel: "", showTrend: false };
		}

		const current = data[0].currentInputToken ?? 0;
		const prevFromApi = data[0].prevInputToken ?? 0;

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

	// Format the main value and trend
	const formattedValue = useMemo(
		() => formatLargeNumber(data?.[0]?.currentInputToken),
		[data],
	);
	const formattedTrend = useMemo(
		() => formatTrendValue(trendValue),
		[trendValue],
	);

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
				<InputIcon
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
					{label}
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
					<Skeleton
						variant={"text"}
						width={80}
						height={30}
						sx={{
							margin: "0 auto",
							backgroundColor:
								mode === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
							borderRadius: "8px",
						}}
						animation={"wave"}
					/>
				</div>
			) : (
				<Box
					sx={{
						opacity: isRefetching ? 0.7 : 1,
						transition: "opacity 0.2s ease",
					}}
				>
					<Tooltip
						title={formattedValue.full}
						arrow
						placement="top"
						enterDelay={300}
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
								cursor: "help",
							}}
						>
							{formattedValue.short}
						</Typography>
					</Tooltip>
					{showTrend && trendValue !== null && trendValue !== 0 ? (
						<Tooltip
							title={formattedTrend.full}
							arrow
							placement="bottom"
							enterDelay={300}
						>
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
									cursor: "help",
								}}
							>
								{trendValue > 0 ? (
									<TrendingUpIcon sx={{ fontSize: "16px" }} />
								) : (
									<TrendingDownIcon sx={{ fontSize: "16px" }} />
								)}
								{formattedTrend.short} {trendLabel}
							</Typography>
						</Tooltip>
					) : showTrend && trendValue === 0 ? (
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
								color:
									mode === "dark" ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)",
							}}
						>
							<TrendingFlatIcon sx={{ fontSize: "16px" }} />
							{trendLabel}
						</Typography>
					) : (
						<Box sx={{ minHeight: "21px" }} />
					)}
				</Box>
			)}
		</div>
	);
};
export default InputTokenText;
