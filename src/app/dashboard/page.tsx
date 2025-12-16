"use client";

import { Box, Typography, useColorScheme } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { useAtom } from "jotai";
import { useEffect, useState } from "react";
import { dateRangeAtom } from "@/atoms/date-range-atom";
import ActiveUsersText from "@/components/dashboard/active-user-text";
import AgentCountText from "@/components/dashboard/agent-count-text";
import AllAgentsStatsTableWithChart from "@/components/dashboard/all-agents-stats-table-with-chart";
import AllModelStatsTableChartWithChart from "@/components/dashboard/all-model-stats-table-with-chart";
import AllModelUsagePieChart from "@/components/dashboard/all-model-usage-pie-chart";
import ConversationsText from "@/components/dashboard/conversations-text";
import DarkLightSwitch from "@/components/dashboard/dark-light-switch";
import CustomDateRangePicker from "@/components/dashboard/date-range-picker";
import ExportButton from "@/components/dashboard/export-button";
import FilesProcessedText from "@/components/dashboard/files-processed-text";
import InputTokenText from "@/components/dashboard/input-token-text";
import McpToolCallsText from "@/components/dashboard/mcp-tool-calls-text";
import McpToolStatsTableWithChart from "@/components/dashboard/mcp-tool-stats-table-with-chart";
import OutputTokenText from "@/components/dashboard/output-token-text";
import ReloadButton from "@/components/dashboard/refresh-button";
import TotalRequestHeatMap from "@/components/dashboard/total-request-heat-map";
import TotalRequestsText from "@/components/dashboard/total-requests-text";
import TotalUsersText from "@/components/dashboard/total-users-text";
import WebSearchStatsText from "@/components/dashboard/web-search-stats-text";

const DashboardPage = () => {
	const { mode } = useColorScheme();
	const { vars } = useTheme();
	const [_dateRange] = useAtom(dateRangeAtom);
	const [_isInitialLoad, setIsInitialLoad] = useState(true);

	// Mark initial load as complete after first render
	useEffect(() => {
		const timer = setTimeout(() => setIsInitialLoad(false), 1500);
		return () => clearTimeout(timer);
	}, []);

	const boardsBackgroundColor = vars?.palette.background.glass;

	// Modern Glass UI Card Style
	const glassCardStyle = {
		background:
			mode === "dark" ? "rgba(32, 32, 35, 0.72)" : "rgba(255, 255, 255, 0.72)",
		backdropFilter: "blur(20px)",
		WebkitBackdropFilter: "blur(20px)",
		border: `1px solid ${mode === "dark" ? "rgba(255, 255, 255, 0.08)" : "rgba(255, 255, 255, 0.5)"}`,
		boxShadow:
			mode === "dark"
				? "0 8px 32px rgba(0, 0, 0, 0.4)"
				: "0 8px 32px rgba(0, 0, 0, 0.08)",
		transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
	};

	const textBoxSx = {
		flex: 1,
		borderRadius: "20px",
		background:
			mode === "dark"
				? "linear-gradient(135deg, rgba(50,50,55,0.9) 0%, rgba(35,35,40,0.8) 100%)"
				: "linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(245,245,247,0.9) 100%)",
		backdropFilter: "blur(20px)",
		WebkitBackdropFilter: "blur(20px)",
		border: `1px solid ${mode === "dark" ? "rgba(255, 255, 255, 0.08)" : "rgba(255, 255, 255, 0.6)"}`,
		minHeight: "110px",
		boxShadow:
			mode === "dark"
				? "0 8px 32px rgba(0, 0, 0, 0.3)"
				: "0 8px 32px rgba(0, 0, 0, 0.06)",
		transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
		"&:hover": {
			transform: "translateY(-2px)",
			boxShadow:
				mode === "dark"
					? "0 12px 40px rgba(0, 0, 0, 0.4)"
					: "0 12px 40px rgba(0, 0, 0, 0.1)",
		},
	};

	const darkModeBorder = {
		...glassCardStyle,
	};

	return (
		<div
			id="dashboard-content"
			style={{
				backgroundColor: vars?.palette.background.default,
				paddingTop: "10px",
				paddingBottom: "30px",
				minHeight: "100vh",
				background:
					mode === "dark"
						? "linear-gradient(180deg, #0d0d0d 0%, #1a1a1a 100%)"
						: "linear-gradient(180deg, #f5f5f7 0%, #e8e8ed 100%)",
			}}
		>
			<Box
				style={{
					marginTop: "20px",
					width: "auto",
					minHeight: "10vh",
				}}
				sx={{
					marginLeft: "40px",
					marginRight: "40px",
					"@media (max-width: 600px)": {
						marginLeft: "12px",
						marginRight: "12px",
					},
				}}
			>
				<div
					style={{
						marginTop: "5px",
						padding: "15px",
						justifyContent: "space-around",
					}}
				>
					<Box
						sx={{
							display: "flex",
							flexDirection: "row",
							"@media (max-width: 750px)": {
								flexDirection: "column",
								alignItems: "flex-end",
							},
							alignItems: "center",
							justifyContent: "flex-end",
							gap: "12px",
							position: "sticky",
							top: "10px",
							zIndex: 10,
							padding: "12px 16px",
							borderRadius: "16px",
							background:
								mode === "dark"
									? "rgba(32, 32, 35, 0.8)"
									: "rgba(255, 255, 255, 0.8)",
							backdropFilter: "blur(20px)",
							WebkitBackdropFilter: "blur(20px)",
							border: `1px solid ${mode === "dark" ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.06)"}`,
						}}
					>
						<ReloadButton />
						<DarkLightSwitch />
						<CustomDateRangePicker />
						<ExportButton />
					</Box>
					{/* Row 1: All Agents, All Users, Active Users, Requests Total, Conversations */}
					<Box
						sx={{
							marginTop: "20px",
							display: "grid",
							gridTemplateColumns: "repeat(5, 1fr)",
							gap: 2,
							marginBottom: "16px",
							"@media (max-width: 1400px)": {
								gridTemplateColumns: "repeat(3, 1fr)",
							},
							"@media (max-width: 900px)": {
								gridTemplateColumns: "repeat(2, 1fr)",
							},
							"@media (max-width: 600px)": {
								gridTemplateColumns: "1fr",
							},
						}}
					>
						<Box sx={{ ...textBoxSx }}>
							<AgentCountText />
						</Box>
						<Box sx={{ ...textBoxSx }}>
							<TotalUsersText />
						</Box>
						<Box sx={{ ...textBoxSx }}>
							<ActiveUsersText />
						</Box>
						<Box sx={{ ...textBoxSx }}>
							<TotalRequestsText />
						</Box>
						<Box sx={{ ...textBoxSx }}>
							<ConversationsText />
						</Box>
					</Box>
					{/* Row 2: Input Token, Output Token, MCP Calls, Web Search, Files */}
					<Box
						sx={{
							display: "grid",
							gridTemplateColumns: "repeat(5, 1fr)",
							gap: 2,
							marginBottom: "30px",
							"@media (max-width: 1400px)": {
								gridTemplateColumns: "repeat(3, 1fr)",
							},
							"@media (max-width: 900px)": {
								gridTemplateColumns: "repeat(2, 1fr)",
							},
							"@media (max-width: 600px)": {
								gridTemplateColumns: "1fr",
							},
						}}
					>
						<Box sx={{ ...textBoxSx }}>
							<InputTokenText />
						</Box>
						<Box sx={{ ...textBoxSx }}>
							<OutputTokenText />
						</Box>
						<Box sx={{ ...textBoxSx }}>
							<McpToolCallsText />
						</Box>
						<Box sx={{ ...textBoxSx }}>
							<WebSearchStatsText />
						</Box>
						<Box sx={{ ...textBoxSx }}>
							<FilesProcessedText />
						</Box>
					</Box>

					<Box
						bgcolor={boardsBackgroundColor}
						borderRadius={"20px"}
						sx={{
							...darkModeBorder,
							marginTop: "40px",
						}}
					>
						<AllAgentsStatsTableWithChart />
					</Box>
					<Box
						bgcolor={boardsBackgroundColor}
						borderRadius={"20px"}
						sx={{
							...darkModeBorder,
							marginTop: "40px",
						}}
					>
						<AllModelStatsTableChartWithChart />
					</Box>
					<Box
						bgcolor={boardsBackgroundColor}
						borderRadius={"20px"}
						sx={{
							...darkModeBorder,
							marginTop: "40px",
						}}
					>
						<McpToolStatsTableWithChart />
					</Box>
					<Box
						sx={{
							marginTop: "35px",
							display: "flex",
							flexDirection: { lg: "row", xs: "column" },
							width: "100%",
							maxWidth: "100%",
							height: "auto",
							gap: 3,
							overflow: "hidden",
						}}
					>
						<Box
							bgcolor={boardsBackgroundColor}
							borderRadius={"20px"}
							padding={"20px"}
							sx={{
								...darkModeBorder,
								flex: { xs: "1 1 auto", lg: "1 1 0" },
								minWidth: 0,
								height: { xs: "auto", lg: 390 },
								overflow: "hidden",
							}}
						>
							<AllModelUsagePieChart />
						</Box>
						<Box
							bgcolor={boardsBackgroundColor}
							borderRadius={"20px"}
							padding={"20px"}
							sx={{
								...darkModeBorder,
								flex: { xs: "1 1 auto", lg: "1 1 0" },
								minWidth: 0,
								overflow: "hidden",
							}}
						>
							<TotalRequestHeatMap />
						</Box>
					</Box>

					{/* Footer */}
					<Box
						component="footer"
						sx={{
							marginTop: "60px",
							paddingTop: "24px",
							paddingBottom: "24px",
							borderTop: "1px solid",
							borderColor:
								mode === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
							textAlign: "center",
						}}
					>
						<Typography
							sx={{
								fontSize: "13px",
								color:
									mode === "dark" ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)",
								display: "flex",
								flexWrap: "wrap",
								alignItems: "center",
								justifyContent: "center",
								gap: "8px",
								"& a": {
									color:
										mode === "dark"
											? "rgba(255,255,255,0.7)"
											: "rgba(0,0,0,0.7)",
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
								innFactory AI Consulting GmbH
							</a>
							<span>|</span>
							<a
								href="https://innfactory.de"
								target="_blank"
								rel="noopener noreferrer"
							>
								innFactory GmbH
							</a>
							<span>|</span>
							<a
								href="https://company-gpt.com"
								target="_blank"
								rel="noopener noreferrer"
							>
								Managed LibreChat on Azure
							</a>
						</Typography>
					</Box>
				</div>
			</Box>
		</div>
	);
};
export default DashboardPage;
