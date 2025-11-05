import { useRef, useState } from 'react';
import { parseCSV } from '../utils/csvUtils';
import type { WorkHoursResult } from '../utils/timeUtils';
import { calcWorkHours, parseTime } from '../utils/timeUtils';

interface CSVImportProps {
	onImport: (
		result: WorkHoursResult,
		actualsByDate: Record<string, number>,
		parsedRows: Record<string, unknown>[]
	) => void;
}

function buildDaysBetween(a: Date, b: Date, skipSun: boolean = false, skipSat: boolean = false) {
	const days = [];
	let workdays = 0;
	let remainingDays = 0;
	const skipped = [];
	for (let d = new Date(a); d <= b; d.setDate(d.getDate() + 1)) {
		const copy = new Date(d);
		remainingDays++;
		const day = d.getDay();
		if ((skipSun && day === 0) || (skipSat && day === 6)) {
			skipped.push(copy.toDateString());
			days.push({ date: new Date(copy), work: false });
			continue;
		}
		workdays++;
		days.push({ date: new Date(copy), work: true });
	}
	return { days, workdays, remainingDays, skipped };
}

export function CSVImport({ onImport }: CSVImportProps) {
	const [csvBuffer, setCsvBuffer] = useState<string | null>(null);
	const [feedback, setFeedback] = useState('');
	const [tableData, setTableData] = useState<
		Array<{
			date: string;
			hrs: number;
			mins: number;
			details: Array<{
				task: string;
				category: string;
				hrs: number;
				mins: number;
			}>;
		}>
	>([]);
	const [requiredHours, setRequiredHours] = useState('');
	const fileInputRef = useRef<HTMLInputElement>(null);

	const handleFileImport = async () => {
		const file = fileInputRef.current?.files?.[0];
		if (!file) {
			alert('Select a CSV file first');
			return;
		}
		try {
			const text = await file.text();
			setCsvBuffer(text);
			setFeedback(`CSV loaded (${Math.round(text.length / 1024)} KB). Enter required hours and click Parse & Display.`);
		} catch (e) {
			setFeedback('CSV load failed: ' + (e instanceof Error ? e.message : String(e)));
		}
	};

	const handleParseAndDisplay = async () => {
		if (!csvBuffer) {
			alert('No CSV loaded. Use Import CSV first to load a file.');
			return;
		}
		try {
			const { actualsByDate: newActuals, parsedRows: rows, grouped } = parseCSV(csvBuffer);

			// Update parent state
			const keys = Object.keys(newActuals).sort();
			if (keys.length === 0) {
				alert('No actuals found in CSV after parsing.');
				return;
			}

			// Render table data
			const tableRows = grouped.map((r) => ({
				date: r.date,
				hrs: Math.floor(r.minutes / 60),
				mins: r.minutes % 60,
				details: r.rows.map((rr) => ({
					task: rr.task,
					category: rr.category,
					hrs: rr.hrs,
					mins: rr.mins,
				})),
			}));
			setTableData(tableRows);

			// Parse required hours
			const reqInput = requiredHours.trim();
			if (!reqInput) {
				alert('Enter required hours in the required field');
				return;
			}

			let requiredMin = 0;
			if (/^\d+$/.test(reqInput)) {
				requiredMin = Number(reqInput) * 60;
			} else {
				try {
					requiredMin = parseTime(reqInput);
				} catch {
					alert('Required hours format invalid. Use "160" or "160 hrs 0 mins"');
					return;
				}
			} // Calculate work hours
			const sumActual = keys.reduce((s, k) => s + (newActuals[k] || 0), 0);
			const billingStart = new Date(keys[0]);
			const billingEnd = new Date(keys[keys.length - 1]);
			billingStart.setHours(0, 0, 0, 0);
			billingEnd.setHours(0, 0, 0, 0);

			const startStr = billingStart.toISOString().slice(0, 10);
			const endStr = billingEnd.toISOString().slice(0, 10);
			const r = calcWorkHours(
				`${Math.floor(requiredMin / 60)} hrs ${requiredMin % 60} mins`,
				`${Math.floor(sumActual / 60)} hrs ${sumActual % 60} mins`,
				startStr,
				endStr,
				false,
				false,
				false
			);

			const built = buildDaysBetween(billingStart, billingEnd, false, false);
			r.days = built.days;
			r.workdays = built.workdays;
			r.remainingDays = built.remainingDays;
			r.skipped = built.skipped;
			r.perDay = r.workdays > 0 ? r.remaining / r.workdays : 0;

			onImport(r, newActuals, rows);

			const labels = r.days.map((d) => d.date.toISOString().slice(0, 10));
			const planned = r.days.map((d) => (d.work ? Math.round((r.perDay / 60) * 100) / 100 : 0));
			const actuals = r.days.map((d) => {
				const k = d.date.toISOString().slice(0, 10);
				return Math.round(((newActuals[k] || 0) / 60) * 100) / 100;
			});
			const samplePlanned = planned.slice(0, 8).join(', ');
			const sampleActuals = actuals.slice(0, 8).join(', ');
			setFeedback(
				`Parsed and displayed CSV with required hours. Days:${labels.length} Planned(first):[${samplePlanned}] Actual(first):[${sampleActuals}]`
			);
		} catch (e) {
			setFeedback('Parse & Display failed: ' + (e instanceof Error ? e.message : String(e)));
		}
	};

	return (
		<aside className="bg-white rounded-lg shadow p-6">
			<h3 className="text-lg font-medium mb-2">Import CSV (Date, Task, Category, HRS, MINS)</h3>
			<p className="muted text-sm mb-2">
				Upload CSV with columns Date, Task, Category, HRS, MINS. Dates may repeat and will be grouped.
			</p>
			<div className="grid grid-cols-1 gap-2 mt-3">
				<div className="flex gap-2 items-center flex-wrap">
					<input
						id="csv-file"
						type="file"
						accept="text/csv,.csv"
						className="text-sm flex-1 min-w-[200px]"
						ref={fileInputRef}
					/>
					<button
						type="button"
						id="csv-import"
						onClick={handleFileImport}
						className="ml-auto bg-green-600 text-white px-3 py-1 rounded">
						Import CSV
					</button>
				</div>
				<div className="flex gap-2 items-center flex-wrap">
					<input
						id="csv-required"
						placeholder="Required hours (e.g. 160 hrs 0 mins or 160)"
						className="mt-1 block flex-1 min-w-[200px] rounded-md border px-3 py-2 text-sm"
						value={requiredHours}
						onChange={(e) => setRequiredHours(e.target.value)}
					/>
					<button
						type="button"
						id="csv-parse-display"
						onClick={handleParseAndDisplay}
						className="ml-auto bg-blue-600 text-white px-3 py-1 rounded">
						Parse & Display
					</button>
				</div>
			</div>
			<div id="csv-feedback" className="mt-3 text-sm muted">
				{feedback}
			</div>
			{tableData.length > 0 && (
				<div id="csv-table" className="mt-3 overflow-auto max-h-48">
					<table className="min-w-full text-sm">
						<thead>
							<tr className="text-left">
								<th>Date</th>
								<th>Total HRS</th>
								<th>Details</th>
							</tr>
						</thead>
						<tbody>
							{tableData.map((row) => (
								<tr key={row.date}>
									<td className="py-1">{row.date}</td>
									<td className="py-1">
										{row.hrs} hrs {row.mins} mins
									</td>
									<td className="py-1">
										{row.details.map((detail, didx) => (
											<div key={`${row.date}-${didx}`}>
												<strong>{detail.task}</strong> ({detail.category}) - {detail.hrs}h {detail.mins}m
											</div>
										))}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
		</aside>
	);
}
