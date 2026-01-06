import { endOfDay, startOfDay, startOfWeek } from "date-fns";
import { atom } from "jotai";
import type { DateRange } from "@/components/models/date-range";

const DATE_RANGE_STORAGE_KEY = "dashboard-date-range";

// Load from localStorage if available
const getInitialDateRange = (): DateRange => {
	if (typeof window !== "undefined") {
		const stored = localStorage.getItem(DATE_RANGE_STORAGE_KEY);
		if (stored) {
			try {
				const parsed = JSON.parse(stored);
				return {
					startDate: parsed.startDate ? new Date(parsed.startDate) : null,
					endDate: parsed.endDate ? new Date(parsed.endDate) : null,
				};
			} catch {
				// Ignore parse errors
			}
		}
	}

	// Default: current week
	const initialEnd = new Date();
	const initialStart = startOfWeek(initialEnd, { weekStartsOn: 1 });
	return {
		startDate: startOfDay(initialStart),
		endDate: endOfDay(initialEnd),
	};
};

const baseDateRangeAtom = atom<DateRange>(getInitialDateRange());

export const dateRangeAtom = atom(
	(get) => get(baseDateRangeAtom),
	(get, set, update: DateRange | ((prev: DateRange) => DateRange)) => {
		const prevValue = get(baseDateRangeAtom);
		const newValue =
			typeof update === "function"
				? (update as (prev: DateRange) => DateRange)(prevValue)
				: update;

		set(baseDateRangeAtom, newValue);
		// Save to localStorage
		if (typeof window !== "undefined") {
			localStorage.setItem(
				DATE_RANGE_STORAGE_KEY,
				JSON.stringify({
					startDate: newValue.startDate?.toISOString(),
					endDate: newValue.endDate?.toISOString(),
				}),
			);
		}
	},
);
