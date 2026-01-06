import { useColorScheme } from "@mui/material";
import Box from "@mui/material/Box";
import { DesktopDatePicker } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { endOfDay, startOfDay } from "date-fns";
import { de } from "date-fns/locale";
import { useAtom } from "jotai";
import { datePickerIsOpenAtom } from "@/atoms/date-picker-action-atom";
import { dateRangeAtom } from "@/atoms/date-range-atom";
import CustomDatePickerLayout from "./custom-date-picker-layout";

export default function CustomDateRangePicker() {
	const maxDate = endOfDay(new Date());
	const { mode } = useColorScheme();

	const [date, setDate] = useAtom(dateRangeAtom);
	const [isPickerOpen, setIsPickerOpen] = useAtom(datePickerIsOpenAtom);

	// Solid background colors for readability
	const datePickerBg = mode === "dark" ? "#2d2d30" : "#ffffff";
	const datePickerBorder =
		mode === "dark" ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.12)";

	const handlePresetSelect = (range: [Date | null, Date | null]) => {
		const [newStartDate, newEndDate] = range;
		setDate({ startDate: newStartDate, endDate: newEndDate });
	};

	const handleStartChange = (newValue: Date | null) => {
		const newStartDate = newValue ? startOfDay(newValue) : null;

		if (date.endDate && newStartDate && newStartDate > date.endDate) {
			const newEndDate = endOfDay(newStartDate);
			setDate({ startDate: newStartDate, endDate: newEndDate });
		} else {
			setDate({ startDate: newStartDate, endDate: date.endDate });
		}
	};

	const handleEndChange = (newValue: Date | null) => {
		const newEndDate = newValue ? endOfDay(newValue) : null;

		if (date.startDate && newEndDate && newEndDate < date.startDate) {
			const newStartDate = startOfDay(newEndDate);
			setDate({ startDate: newStartDate, endDate: newEndDate });
		} else {
			setDate({ startDate: date.startDate, endDate: newEndDate });
		}
	};

	return (
		<LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={de}>
			<Box
				sx={{
					display: "flex",
					alignItems: "center",
					gap: 2,
					"@media (max-width: 750px)": {
						flexDirection: "column",
					},
				}}
			>
				<DesktopDatePicker
					sx={{
						background: datePickerBg,
						borderRadius: 1,
						"& .MuiOutlinedInput-root": {
							background: datePickerBg,
							borderColor: datePickerBorder,
						},
					}}
					label="Start date"
					value={date.startDate}
					onChange={handleStartChange}
					open={isPickerOpen}
					onOpen={() => setIsPickerOpen(true)}
					onClose={() => setIsPickerOpen(false)}
					maxDate={
						date.endDate && date.endDate < maxDate ? date.endDate : maxDate
					}
					slots={{
						layout: CustomDatePickerLayout,
					}}
					slotProps={{
						actionBar: { onSelect: () => handlePresetSelect },
						textField: {
							size: "small",
						},
					}}
				/>
				<DesktopDatePicker
					sx={{
						background: datePickerBg,
						borderRadius: 1,
						"& .MuiOutlinedInput-root": {
							background: datePickerBg,
							borderColor: datePickerBorder,
						},
					}}
					label="End date"
					value={date.endDate}
					onChange={handleEndChange}
					minDate={date.startDate || undefined}
					maxDate={maxDate}
					slotProps={{
						textField: {
							size: "small",
						},
					}}
				/>
			</Box>
		</LocalizationProvider>
	);
}
