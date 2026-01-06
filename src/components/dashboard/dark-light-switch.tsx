"use client";

import ContrastIcon from "@mui/icons-material/Contrast";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import LightModeIcon from "@mui/icons-material/LightMode";
import { Box, IconButton, useColorScheme } from "@mui/material";
import { useEffect, useState } from "react";

const DarkLightSwitch = () => {
	const { mode, setMode } = useColorScheme();

	const [isClient, setIsClient] = useState(false);
	useEffect(() => {
		setIsClient(true);
	}, []);

	const handleToggle = () => {
		setMode(mode === "dark" ? "light" : "dark");
	};

	return (
		<Box
			sx={{
				display: "inline-flex",
				borderRadius: "12px",
				background:
					mode === "dark" ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.04)",
				backdropFilter: "blur(10px)",
				WebkitBackdropFilter: "blur(10px)",
				border: "1px solid",
				borderColor:
					mode === "dark" ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.06)",
				transition: "all 0.2s ease",
				"&:hover": {
					background:
						mode === "dark"
							? "rgba(255, 255, 255, 0.12)"
							: "rgba(0, 0, 0, 0.06)",
				},
				"@media (max-width: 750px)": {
					alignSelf: "right",
				},
			}}
		>
			<IconButton
				onClick={handleToggle}
				sx={{
					color: mode === "dark" ? "#f5f5f7" : "#1d1d1f",
				}}
			>
				{isClient ? (
					mode === "dark" ? (
						<DarkModeIcon sx={{ fontSize: "20px" }} />
					) : (
						<LightModeIcon sx={{ fontSize: "20px" }} />
					)
				) : (
					<ContrastIcon sx={{ fontSize: "20px" }} />
				)}
			</IconButton>
		</Box>
	);
};
export default DarkLightSwitch;
