import Papa from 'papaparse';

export interface CSVRow {
	date: string;
	task: string;
	category: string;
	hrs: number;
	mins: number;
}

export interface GroupedDate {
	date: string;
	minutes: number;
	rows: Array<{
		date: string;
		task: string;
		category: string;
		hrs: number;
		mins: number;
	}>;
}

export function parseCSV(csvText: string): {
	actualsByDate: Record<string, number>;
	parsedRows: Record<string, unknown>[];
	grouped: GroupedDate[];
} {
	const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });
	const data = parsed.data as Record<string, unknown>[];
	const grouped: Record<string, GroupedDate> = {};
	const parsedRows = data.slice();

	for (const row of data) {
		const dateVal = row['Date'] ?? row['date'] ?? row['DATE'];
		const hrs = Number(row['HRS'] ?? row['Hrs'] ?? row['hrs'] ?? 0) || 0;
		const mins = Number(row['MINS'] ?? row['Mins'] ?? row['mins'] ?? 0) || 0;
		const task = (row['Task'] ?? row['task'] ?? '') as string;
		const category = (row['Category'] ?? row['category'] ?? '') as string;

		if (!dateVal) continue;

		let dObj: Date | null = null;
		if (dateVal instanceof Date) {
			dObj = dateVal;
		} else {
			dObj = new Date(String(dateVal));
		}

		if (!dObj || Number.isNaN(dObj.getTime())) continue;

		const key = dObj.toISOString().slice(0, 10);
		const minutes = (Math.floor(hrs) || 0) * 60 + (Math.floor(mins) || 0);

		if (!grouped[key]) {
			grouped[key] = { date: key, minutes: 0, rows: [] };
		}
		grouped[key].minutes += minutes;
		grouped[key].rows.push({
			date: dObj.toISOString(),
			task,
			category,
			hrs,
			mins,
		});
	}

	const actualsByDate: Record<string, number> = {};
	const sortedRows = Object.values(grouped).sort((a, b) => a.date.localeCompare(b.date));

	for (const r of sortedRows) {
		actualsByDate[r.date] = r.minutes;
	}

	return { actualsByDate, parsedRows, grouped: sortedRows };
}

/**
 * Exports WakaTime daily data to CSV format
 * @param dailyData - Map of date to hours worked
 * @param projectName - Name of the project
 * @returns CSV string
 */
export function exportWakaTimeToCSV(dailyData: Record<string, number>, projectName: string): string {
	const headers = ['Date', 'Task', 'Category', 'HRS', 'MINS'];
	const rows: string[][] = [headers];

	// Sort dates
	const sortedDates = Object.keys(dailyData).sort();

	for (const date of sortedDates) {
		const totalHours = dailyData[date];
		const hrs = Math.floor(totalHours);
		const mins = Math.round((totalHours - hrs) * 60);

		rows.push([date, `WakaTime - ${projectName}`, 'Development', String(hrs), String(mins)]);
	}

	// Convert to CSV
	return rows.map((row) => row.join(',')).join('\n');
}

/**
 * Downloads CSV file to user's computer
 * @param csvContent - CSV content as string
 * @param filename - Name of the file to download
 */
export function downloadCSV(csvContent: string, filename: string): void {
	const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
	const link = document.createElement('a');
	const url = URL.createObjectURL(blob);

	link.setAttribute('href', url);
	link.setAttribute('download', filename);
	link.style.visibility = 'hidden';
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
	URL.revokeObjectURL(url);
}
