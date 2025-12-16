"use client";

import AttachFileIcon from "@mui/icons-material/AttachFile";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import TrendingFlatIcon from "@mui/icons-material/TrendingFlat";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import { Box, Skeleton, Typography, useColorScheme } from "@mui/material";
import { useAtomValue } from "jotai";
import { useEffect, useMemo, useState } from "react";
import { autoRefreshAtom } from "@/atoms/auto-refresh-atom";
import { dateRangeAtom } from "@/atoms/date-range-atom";
import { filesProcessedAtom } from "@/atoms/files-processed-atom";
import { isToday } from "@/components/utils/date-range-helpers";
import { useLoadableWithCache } from "@/hooks/useLoadableWithCache";

// filesProcessedAtom is already loadable in the atom definition
const FilesProcessedText = () => {
	const { mode } = useColorScheme();
	// @ts-expect-error - The atom is already loadable, but useLoadableWithCache expects a regular atom to wrap.
	// However, since we can't easily change the atom definition without breaking other things,
	// we'll cast or ignore for now, but the data structure is what matters.
	// Actually, looking at other components, they wrap a raw async atom with loadable.
	// filesProcessedAtom is ALREADY loadable(asyncAtom).
	// useLoadableWithCache expects the atom passed to be the one that returns the promise/value.
	// If filesProcessedAtom is already loadable, useLoadableWithCache might double-wrap or get confused.

	// Let's check how other components do it.
	// input-token-text.tsx: const loadableInputOutputTokenAtom = loadable(inputOuputTokenAtom);
	// inputOuputTokenAtom is defined as atom(async (get) => ...).

	// filesProcessedAtom in src/atoms/files-processed-atom.tsx is defined as:
	// export const filesProcessedAtom = loadable(filesProcessedAsyncAtom);

	// So it is ALREADY a loadable. We should NOT wrap it again with loadable().
	// And useLoadableWithCache expects a loadable atom? No, it expects an atom that it can use with useAtom.

	// If we pass the already loadable atom to useLoadableWithCache, it might work if the hook handles it.
	// But wait, useLoadableWithCache implementation:
	// export function useLoadableWithCache<T>(atom: Atom<Loadable<T>>) { ... }

	// So we should pass filesProcessedAtom directly.
	const { data, previousData, showSkeleton, isRefetching, isFirstLoad } =
		useLoadableWithCache(filesProcessedAtom);
	const _autoRefreshEnabled = useAtomValue(autoRefreshAtom);
	const dateRange = useAtomValue(dateRangeAtom);
	const [isClient, setIsClient] = useState(false);

	const _isTodayRange = useMemo(
		() => isToday(dateRange.startDate, dateRange.endDate),
		[dateRange],
	);

	useEffect(() => {
		setIsClient(true);
	}, []);

	const { trendValue, trendLabel, showTrend } = useMemo(() => {
		if (!data || data.length === 0) {
			return { trendValue: null, trendLabel: "", showTrend: false };
		}

		const current = data[0]?.currentInputToken ?? 0;
		const prevFromApi = data[0]?.prevInputToken ?? 0;

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

	const currentCount = data?.[0]?.currentInputToken ?? 0;

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
				<AttachFileIcon
					sx={{
						fontSize: "1rem",
						color:
							mode === "dark" ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.5)",
					}}
				/>
				<Typography
					align="center"
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
					Files Processed
				</Typography>
			</Box>
			{!isClient || showSkeleton ? (
				<div style={{ marginTop: "12px" }}>
					<Skeleton
						variant="text"
						width={100}
						height={40}
						sx={{
							margin: "0 auto",
							backgroundColor:
								mode === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
							borderRadius: "8px",
						}}
						animation="wave"
					/>
					<Skeleton
						variant="text"
						width={80}
						height={30}
						sx={{
							margin: "0 auto",
							backgroundColor:
								mode === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
							borderRadius: "8px",
						}}
						animation="wave"
					/>
				</div>
			) : (
				<Box
					sx={{
						textAlign: "center",
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
						{currentCount.toLocaleString("de-DE")}
					</Typography>
					{showTrend && trendValue !== null && trendValue !== 0 ? (
						<Typography
							align="center"
							fontSize="13px"
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
							{trendValue.toLocaleString("de-DE")} {trendLabel}
						</Typography>
					) : showTrend && trendValue === 0 ? (
						<Typography
							align="center"
							fontSize="13px"
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

export default FilesProcessedText;
