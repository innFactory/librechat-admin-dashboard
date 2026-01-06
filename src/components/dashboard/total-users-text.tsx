"use client";

import GroupIcon from "@mui/icons-material/Group";
import { Box, useColorScheme } from "@mui/material";
import Skeleton from "@mui/material/Skeleton";
import Typography from "@mui/material/Typography";
import { loadable } from "jotai/utils";
import { useEffect, useState } from "react";
import { totalUsersAtom } from "@/atoms/total-users-atom";
import { useLoadableWithCache } from "@/hooks/useLoadableWithCache";

const loadableTotalUsersAtom = loadable(totalUsersAtom);

const TotalUsersText = () => {
	const { data, showSkeleton, isRefetching } = useLoadableWithCache(
		loadableTotalUsersAtom,
	);
	const [isClient, setIsClient] = useState(false);
	const { mode } = useColorScheme();

	//https://nextjs.org/docs/messages/react-hydration-error
	useEffect(() => {
		setIsClient(true);
	}, []);

	return (
		<Box
			sx={{
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
				<GroupIcon
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
					Total users
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
				<Box sx={{ textAlign: "center" }}>
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
							opacity: isRefetching ? 0.7 : 1,
							transition: "opacity 0.2s ease",
						}}
					>
						{Array.isArray(data) &&
						data[0] &&
						data[0].totalUserCount !== undefined
							? data[0].totalUserCount.toLocaleString("de-DE")
							: "-"}
					</Typography>
					<Box sx={{ minHeight: "21px" }} />
				</Box>
			)}
		</Box>
	);
};
export default TotalUsersText;
