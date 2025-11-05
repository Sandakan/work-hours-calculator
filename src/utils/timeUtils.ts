// Parse time string like "160 hrs 0 mins" to minutes
export function parseTime(timeString: string): number {
	if (!timeString) return 0;
	const regex = /(?:(\d+)\s*hrs?)?\s*(?:(\d+)\s*mins?)?/i;
	const m = (timeString || '').match(regex);
	if (!m) throw new Error('Invalid time format: ' + timeString);
	const hrs = m[1] ? parseInt(m[1], 10) : 0;
	const mins = m[2] ? parseInt(m[2], 10) : 0;
	if (Number.isNaN(hrs) || Number.isNaN(mins)) throw new Error('Invalid time numbers');
	return hrs * 60 + mins;
}

// Format minutes to "X hrs Y mins"
export function formatMinutes(totalMinutes: number): string {
	const sign = totalMinutes < 0 ? '-' : '';
	totalMinutes = Math.abs(Math.round(totalMinutes));
	const hrs = Math.floor(totalMinutes / 60);
	const mins = totalMinutes % 60;
	return `${sign}${hrs} hrs ${mins} mins`;
}

// Format currency (Rs)
export function formatCurrency(amount: number): string {
	return `Rs ${amount.toFixed(2)}`;
}

// Determine start date depending on today and excludeToday
export function determineStart(billingStart: Date, billingEnd: Date, excludeToday: boolean): Date {
	const today = new Date();
	today.setHours(0, 0, 0, 0);

	// If today is before billing start, start from billing start
	if (today < billingStart) {
		return new Date(billingStart);
	}

	// If today is after billing end, still use billing start (for past periods)
	// This allows calculating work hours for completed periods
	if (today > billingEnd) {
		return new Date(billingStart);
	}

	// Today is within the billing period
	const s = new Date(today);
	if (excludeToday) s.setDate(s.getDate() + 1);
	return s;
}

export interface WorkHoursResult {
	total: number;
	completed: number;
	remaining: number;
	billingStart: Date;
	billingEnd: Date;
	remainingDays: number;
	workdays: number;
	perDay: number;
	skipped: string[];
	days: Array<{ date: Date; work: boolean }>;
	hourlyRate: number;
	totalEarnings: number;
	completedEarnings: number;
	remainingEarnings: number;
	earningsPerDay: number;
}

export function calcWorkHours(
	totalStr: string,
	completedStr: string,
	startStr: string,
	endStr: string,
	skipSun: boolean,
	skipSat: boolean,
	excludeToday: boolean,
	hourlyRate = 0
): WorkHoursResult {
	const total = parseTime(totalStr);
	const completed = parseTime(completedStr);
	const remaining = total - completed;
	const billingStart = new Date(startStr);
	billingStart.setHours(0, 0, 0, 0);
	const billingEnd = new Date(endStr);
	billingEnd.setHours(0, 0, 0, 0);
	const start = determineStart(billingStart, billingEnd, excludeToday);

	let workdays = 0,
		remainingDays = 0;
	const skipped: string[] = [];
	const days: Array<{ date: Date; work: boolean }> = [];

	for (let d = new Date(start); d <= billingEnd; d.setDate(d.getDate() + 1)) {
		const copy = new Date(d);
		remainingDays++;
		const day = d.getDay();
		if ((skipSun && day === 0) || (skipSat && day === 6)) {
			skipped.push(copy.toDateString());
			days.push({ date: copy, work: false });
			continue;
		}
		workdays++;
		days.push({ date: copy, work: true });
	}

	const perDay = workdays > 0 ? remaining / workdays : 0;

	// Calculate earnings
	const totalEarnings = (total / 60) * hourlyRate;
	const completedEarnings = (completed / 60) * hourlyRate;
	const remainingEarnings = (remaining / 60) * hourlyRate;
	const earningsPerDay = (perDay / 60) * hourlyRate;

	return {
		total,
		completed,
		remaining,
		billingStart,
		billingEnd,
		remainingDays,
		workdays,
		perDay,
		skipped,
		days,
		hourlyRate,
		totalEarnings,
		completedEarnings,
		remainingEarnings,
		earningsPerDay,
	};
}

export function sumTimeStrings(text: string): number {
	if (!text.trim()) return 0;
	const lines = text.split('\n').filter((l) => l.trim());
	let totalMin = 0;
	for (const line of lines) {
		try {
			totalMin += parseTime(line);
		} catch {
			// skip lines that don't parse
		}
	}
	return totalMin;
}

/**
 * Merges WakaTime data with manual time entries
 * @param wakaTimeData - Map of date to hours from WakaTime (in hours as decimal)
 * @param manualData - Map of date to minutes from manual entries
 * @returns Merged data with both sources and difference
 */
export function mergeWakaTimeWithManual(
	wakaTimeData: Record<string, number>,
	manualData: Record<string, number>
): Record<string, { manual: number; wakatime: number; difference: number }> {
	const merged: Record<string, { manual: number; wakatime: number; difference: number }> = {};

	// Get all unique dates
	const allDates = new Set([...Object.keys(wakaTimeData), ...Object.keys(manualData)]);

	for (const date of allDates) {
		const wakatimeHours = wakaTimeData[date] || 0;
		const manualMinutes = manualData[date] || 0;
		const manualHours = manualMinutes / 60;

		merged[date] = {
			manual: manualHours,
			wakatime: wakatimeHours,
			difference: wakatimeHours - manualHours,
		};
	}

	return merged;
}

/**
 * Calculates discrepancy between manual and WakaTime tracked hours
 * @param manual - Manual hours
 * @param wakatime - WakaTime tracked hours
 * @returns Percentage difference and status
 */
export function calculateDiscrepancy(
	manual: number,
	wakatime: number
): { percentage: number; status: 'over' | 'under' | 'match' } {
	if (manual === 0 && wakatime === 0) {
		return { percentage: 0, status: 'match' };
	}

	if (manual === 0) {
		return { percentage: 100, status: 'over' };
	}

	const difference = wakatime - manual;
	const percentage = (Math.abs(difference) / manual) * 100;

	let status: 'over' | 'under' | 'match' = 'match';
	if (percentage < 5) {
		status = 'match';
	} else if (difference > 0) {
		status = 'over';
	} else {
		status = 'under';
	}

	return { percentage, status };
}
