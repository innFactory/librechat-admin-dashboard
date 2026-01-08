"use client";

import { Box, CircularProgress } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

interface AuthGuardProps {
	children: React.ReactNode;
}

// Public routes that don't require authentication
const PUBLIC_ROUTES = ["/login"];

export default function AuthGuard({ children }: AuthGuardProps) {
	const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
	const { vars } = useTheme();
	const router = useRouter();
	const pathname = usePathname();
	const isRedirecting = useRef(false);

	const isPublicRoute = PUBLIC_ROUTES.includes(pathname);

	// Reset redirecting flag when pathname changes
	// biome-ignore lint/correctness/useExhaustiveDependencies: pathname is intentionally used as trigger
	useEffect(() => {
		isRedirecting.current = false;
	}, [pathname]);

	// Check authentication status on mount
	useEffect(() => {
		const checkAuth = async () => {
			try {
				const response = await fetch("/api/auth/verify", {
					method: "POST",
					credentials: "include",
				});
				setIsAuthenticated(response.ok);
			} catch {
				setIsAuthenticated(false);
			}
		};
		checkAuth();
	}, []);

	// Handle redirects based on auth state
	useEffect(() => {
		if (isAuthenticated === null) return; // Still checking
		if (isRedirecting.current) return; // Already redirecting

		if (!isAuthenticated && !isPublicRoute) {
			// Not authenticated and trying to access protected route
			isRedirecting.current = true;
			router.replace("/login");
		} else if (isAuthenticated && isPublicRoute) {
			// Authenticated but on login page, redirect to dashboard
			isRedirecting.current = true;
			router.replace("/dashboard");
		}
	}, [isAuthenticated, isPublicRoute, router]);

	// Loading state
	if (isAuthenticated === null) {
		return (
			<Box
				sx={{
					display: "flex",
					justifyContent: "center",
					alignItems: "center",
					minHeight: "100vh",
					backgroundColor: vars?.palette.background.default,
				}}
			>
				<CircularProgress />
			</Box>
		);
	}

	// Show loading while redirecting
	if (
		(!isAuthenticated && !isPublicRoute) ||
		(isAuthenticated && isPublicRoute)
	) {
		return (
			<Box
				sx={{
					display: "flex",
					justifyContent: "center",
					alignItems: "center",
					minHeight: "100vh",
					backgroundColor: vars?.palette.background.default,
				}}
			>
				<CircularProgress />
			</Box>
		);
	}

	// Render children (either authenticated on protected route, or public route)
	return <>{children}</>;
}
