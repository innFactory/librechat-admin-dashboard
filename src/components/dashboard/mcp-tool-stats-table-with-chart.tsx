"use client";

import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import Collapse from "@mui/material/Collapse";
import IconButton from "@mui/material/IconButton";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TablePagination from "@mui/material/TablePagination";
import TableRow from "@mui/material/TableRow";
import { useAtom } from "jotai";
import { loadable } from "jotai/utils";
import React, { useEffect, useMemo, useState } from "react";
import { mcpToolStatsTableAtom } from "@/atoms/mcp-tool-stats-table-atom";
import useTableManager from "@/hooks/useTableManager";
import type { McpToolStatsTable } from "../models/mcp-tool-stats";
import EnhancedTableHead from "./enhanced-table-head";
import EnhancedTableToolbar from "./enhanced-table-toolbar";
import McpToolStatsTableChart from "./mcp-tool-stats-table-chart";

// Types
interface McpToolStatsTableRow {
	toolName: string;
	serverName: string;
	callCount: number;
	uniqueUsers: number;
	uniqueConversations: number;
}

interface HeadCell {
	id: keyof McpToolStatsTableRow;
	label: string;
	numeric: boolean;
}

const headCells: readonly HeadCell[] = [
	{ id: "toolName", label: "Tool Name", numeric: false },
	{ id: "serverName", label: "MCP Server", numeric: false },
	{ id: "callCount", label: "Call Count", numeric: true },
	{ id: "uniqueUsers", label: "Unique Users", numeric: true },
	{ id: "uniqueConversations", label: "Conversations", numeric: true },
];

// Expandable row renderer
function Row({ row }: { row: McpToolStatsTableRow }) {
	const [open, setOpen] = useState(false);
	const _toolId = `${row.toolName}_mcp_${row.serverName}`;

	return (
		<React.Fragment>
			<TableRow sx={{ "& > *": { borderBottom: "unset" } }}>
				<TableCell>
					<IconButton
						aria-label="expand row"
						size="small"
						onClick={() => setOpen(!open)}
					>
						{open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
					</IconButton>
				</TableCell>
				<TableCell>{row.toolName}</TableCell>
				<TableCell>{row.serverName}</TableCell>
				<TableCell align="right">
					{row.callCount?.toLocaleString("de-DE")}
				</TableCell>
				<TableCell align="right">
					{row.uniqueUsers?.toLocaleString("de-DE")}
				</TableCell>
				<TableCell align="right">
					{row.uniqueConversations?.toLocaleString("de-DE")}
				</TableCell>
			</TableRow>
			<TableRow>
				<TableCell style={{ padding: 0 }} colSpan={6}>
					<Collapse in={open} timeout="auto" unmountOnExit>
						<Box sx={{ margin: "10px" }}>
							<McpToolStatsTableChart
								toolName={row.toolName}
								serverName={row.serverName}
							/>
						</Box>
					</Collapse>
				</TableCell>
			</TableRow>
		</React.Fragment>
	);
}

const McpToolStatsTableWithChart: React.FC = () => {
	const [searchTerm, setSearchTerm] = useState("");

	// Data from state/atom
	const loadableMcpToolStatsAtom = loadable(mcpToolStatsTableAtom);
	const [tableData] = useAtom(loadableMcpToolStatsAtom);

	// Hydration fix https://nextjs.org/docs/messages/react-hydration-error
	const [isClient, setIsClient] = useState(false);
	useEffect(() => setIsClient(true), []);

	// Raw data mapping
	const mappedRows: McpToolStatsTableRow[] = useMemo(() => {
		if (tableData.state === "hasData") {
			return tableData.data.map((tool: McpToolStatsTable) => ({
				toolName: tool.toolName,
				serverName: tool.serverName,
				callCount: tool.callCount ?? 0,
				uniqueUsers: tool.uniqueUsers ?? 0,
				uniqueConversations: tool.uniqueConversations ?? 0,
			}));
		}
		return [];
	}, [tableData]);

	// Search filter
	const filteredRows = useMemo(() => {
		if (!searchTerm) return mappedRows;
		const lowerTerm = searchTerm.toLowerCase();
		return mappedRows.filter(
			(row) =>
				row.toolName.toLowerCase().includes(lowerTerm) ||
				row.serverName.toLowerCase().includes(lowerTerm),
		);
	}, [mappedRows, searchTerm]);

	const {
		order,
		orderBy,
		page,
		rowsPerPage,
		visibleRows,
		handleRequestSort,
		handleChangePage,
		handleChangeRowsPerPage,
	} = useTableManager({
		rows: filteredRows,
		initialOrderBy: "callCount",
	});

	return (
		<Box sx={{ width: "100%" }}>
			<EnhancedTableToolbar
				searchFieldPlaceholder="Search tool or server"
				tableTitle="MCP Tool Call Statistics"
				onSearchChange={setSearchTerm}
			/>
			<TableContainer
				sx={{
					minHeight: 200,
					maxHeight: 550,
				}}
			>
				<Table
					stickyHeader
					sx={{ minWidth: 700 }}
					aria-label="MCP Tool Stats Table"
				>
					<EnhancedTableHead
						order={order}
						orderBy={orderBy}
						headCells={headCells}
						onRequestSort={handleRequestSort}
					/>
					<TableBody>
						{!isClient || tableData.state === "loading" ? (
							<TableRow>
								<TableCell colSpan={headCells.length + 1} align="center">
									<CircularProgress size={25} />
								</TableCell>
							</TableRow>
						) : tableData.state === "hasError" ? (
							<TableRow>
								<TableCell
									colSpan={headCells.length + 1}
									align="center"
									sx={{ color: "error.main" }}
								>
									Error loading data
								</TableCell>
							</TableRow>
						) : filteredRows.length === 0 && searchTerm.length > 0 ? (
							<TableRow>
								<TableCell
									colSpan={headCells.length + 1}
									align="center"
									sx={{ fontStyle: "italic" }}
								>
									No results found for "{searchTerm}"
								</TableCell>
							</TableRow>
						) : filteredRows.length === 0 ? (
							<TableRow>
								<TableCell
									colSpan={headCells.length + 1}
									align="center"
									sx={{ fontStyle: "italic" }}
								>
									No MCP tool calls in this period
								</TableCell>
							</TableRow>
						) : (
							visibleRows.map((row, index) => (
								<Row
									key={`${row.toolName}-${row.serverName}-${index}`}
									row={row}
								/>
							))
						)}
					</TableBody>
				</Table>
			</TableContainer>
			<TablePagination
				rowsPerPageOptions={[5, 10, 25, 50]}
				component="div"
				count={filteredRows.length}
				rowsPerPage={rowsPerPage}
				page={page}
				onPageChange={handleChangePage}
				onRowsPerPageChange={handleChangeRowsPerPage}
			/>
		</Box>
	);
};

export default McpToolStatsTableWithChart;
