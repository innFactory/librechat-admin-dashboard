"use client";

import { Lock, Visibility, VisibilityOff } from "@mui/icons-material";
import {
	Alert,
	Box,
	Button,
	CircularProgress,
	IconButton,
	InputAdornment,
	Paper,
	TextField,
	Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { type FormEvent, useCallback, useState } from "react";

export default function LoginPage() {
	const [password, setPassword] = useState("");
	const [error, setError] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [showPassword, setShowPassword] = useState(false);
	const { vars } = useTheme();

	// Auth check is handled by AuthGuard in layout.tsx
	// No need to check here - AuthGuard will redirect if already authenticated

	const handleSubmit = useCallback(
		async (e: FormEvent) => {
			e.preventDefault();
			setError("");
			setIsLoading(true);

			try {
				const response = await fetch("/api/auth/login", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					credentials: "include",
					body: JSON.stringify({ password }),
				});

				if (response.ok) {
					setPassword(""); // Clear password from memory
					// Force a full page reload to reset AuthGuard state
					window.location.href = "/dashboard";
				} else {
					const data = await response.json();
					setError(data.error || "Authentication failed. Please try again.");
				}
			} catch {
				setError("Connection error. Please try again.");
			} finally {
				setIsLoading(false);
			}
		},
		[password],
	);

	return (
		<Box
			sx={{
				display: "flex",
				justifyContent: "center",
				alignItems: "center",
				minHeight: "100vh",
				backgroundColor: vars?.palette.background.default,
				padding: 2,
			}}
		>
			<Paper
				elevation={8}
				sx={{
					padding: 4,
					maxWidth: 400,
					width: "100%",
					borderRadius: 2,
				}}
			>
				<Box
					sx={{
						display: "flex",
						flexDirection: "column",
						alignItems: "center",
						mb: 3,
					}}
				>
					<Box
						sx={{
							backgroundColor: vars?.palette.primary.main,
							borderRadius: "50%",
							padding: 2,
							mb: 2,
						}}
					>
						<Lock sx={{ fontSize: 40, color: "white" }} />
					</Box>
					<Typography variant="h5" component="h1" fontWeight="bold">
						AI Metrics Dashboard
					</Typography>
					<Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
						Please enter the password to continue
					</Typography>
				</Box>

				{error && (
					<Alert severity="error" sx={{ mb: 2 }}>
						{error}
					</Alert>
				)}

				<Box component="form" onSubmit={handleSubmit}>
					<TextField
						fullWidth
						type={showPassword ? "text" : "password"}
						label="Password"
						value={password}
						onChange={(e) => setPassword(e.target.value)}
						disabled={isLoading}
						autoFocus
						autoComplete="current-password"
						InputProps={{
							endAdornment: (
								<InputAdornment position="end">
									<IconButton
										aria-label="Show password"
										onClick={() => setShowPassword(!showPassword)}
										edge="end"
									>
										{showPassword ? <VisibilityOff /> : <Visibility />}
									</IconButton>
								</InputAdornment>
							),
						}}
						sx={{ mb: 3 }}
					/>

					<Button
						type="submit"
						fullWidth
						variant="contained"
						size="large"
						disabled={isLoading || !password}
						sx={{ py: 1.5 }}
					>
						{isLoading ? (
							<CircularProgress size={24} color="inherit" />
						) : (
							"Login"
						)}
					</Button>
				</Box>

				<Typography
					variant="caption"
					color="text.secondary"
					sx={{
						mt: 3,
						display: "flex",
						flexWrap: "wrap",
						alignItems: "center",
						justifyContent: "center",
						gap: "6px",
						"& a": {
							color: "inherit",
							textDecoration: "none",
							transition: "color 0.2s ease",
							"&:hover": {
								color: "#0071e3",
								textDecoration: "underline",
							},
						},
					}}
				>
					© {new Date().getFullYear()}
					<a
						href="https://innfactory.ai"
						target="_blank"
						rel="noopener noreferrer"
					>
						innFactory AI
					</a>
					<span>|</span>
					<a
						href="https://innfactory.de"
						target="_blank"
						rel="noopener noreferrer"
					>
						innFactory
					</a>
					<span>|</span>
					<a
						href="https://company-gpt.com"
						target="_blank"
						rel="noopener noreferrer"
					>
						CompanyGPT
					</a>
				</Typography>
			</Paper>
		</Box>
	);
}
