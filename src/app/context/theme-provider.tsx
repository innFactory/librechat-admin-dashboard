"use client";

import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider, useColorScheme } from "@mui/material/styles";
import { type ReactNode, useEffect } from "react";
import { theme } from "@/app/theme";

function ThemeSynchronizer() {
	const { setMode } = useColorScheme();

	useEffect(() => {
		const storedMode = localStorage.getItem("mui-mode");
		if (!storedMode) {
			const systemPrefersDark = window.matchMedia(
				"(prefers-color-scheme: dark)",
			).matches;
			setMode(systemPrefersDark ? "dark" : "light");
		}
	}, [setMode]);

	return null;
}

const MuiProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
	return (
		<ThemeProvider theme={theme} defaultMode="system">
			<CssBaseline />
			<ThemeSynchronizer />
			{children}
		</ThemeProvider>
	);
};

export default MuiProvider;
