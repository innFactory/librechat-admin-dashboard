"use client";

import RefreshIcon from "@mui/icons-material/Refresh";
import { Box, IconButton, Tooltip } from "@mui/material";
import { useColorScheme } from "@mui/material/styles";
import { useSetAtom } from "jotai";
import { useCallback, useState } from "react";
import { dateRangeAtom } from "@/atoms/date-range-atom";

const ReloadButton = () => {
	const { mode } = useColorScheme();
	const setDateRange = useSetAtom(dateRangeAtom);
	const [isReloading, setIsReloading] = useState(false);

	const handleReload = useCallback(() => {
		setIsReloading(true);
		// Trigger refresh by setting the date range to a new object with same values
		// This forces atoms to re-evaluate
		setDateRange((prev) => ({ ...prev }));

		// Reset animation after a short delay
		setTimeout(() => setIsReloading(false), 1000);
	}, [setDateRange]);

	return (
		<Tooltip title="Reload Data">
			<Box
				sx={{
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					borderRadius: "12px",
					width: "40px",
					height: "40px",
					background:
						mode === "dark"
							? "rgba(255, 255, 255, 0.08)"
							: "rgba(0, 0, 0, 0.04)",
					backdropFilter: "blur(10px)",
					WebkitBackdropFilter: "blur(10px)",
					border: "1px solid",
					borderColor:
						mode === "dark"
							? "rgba(255, 255, 255, 0.1)"
							: "rgba(0, 0, 0, 0.06)",
					transition: "all 0.2s ease",
					"&:hover": {
						background:
							mode === "dark"
								? "rgba(255, 255, 255, 0.12)"
								: "rgba(0, 0, 0, 0.08)",
					},
				}}
			>
				<IconButton
					onClick={handleReload}
					size="small"
					sx={{
						color: mode === "dark" ? "#f5f5f7" : "#1d1d1f",
						padding: "8px",
						"& .MuiSvgIcon-root": {
							animation: isReloading ? "spin 1s linear infinite" : "none",
							"@keyframes spin": {
								"0%": { transform: "rotate(0deg)" },
								"100%": { transform: "rotate(360deg)" },
							},
						},
					}}
				>
					<RefreshIcon fontSize="small" />
				</IconButton>
			</Box>
		</Tooltip>
	);
};

export default ReloadButton;
