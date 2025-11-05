import { useRef, useState } from 'react';
import { parseCSV } from '../utils/csvUtils';
import type { WorkHoursResult } from '../utils/timeUtils';
import { calcWorkHours } from '../utils/timeUtils';

interface CSVImportProps {
	onImport: (
		result: WorkHoursResult,
		actualsByDate: Record<string, number>,
		parsedRows: Record<string, unknown>[]
	) => void;
	totalHours: string;
	setTotalHours: (value: string) => void;
	completedHours: string;
	setCompletedHours: (value: string) => void;
	hourlyRate: string;
	setHourlyRate: (value: string) => void;
	billingStart: string;
	setBillingStart: (value: string) => void;
	billingEnd: string;
	setBillingEnd: (value: string) => void;
	skipSunday: boolean;
	setSkipSunday: (value: boolean) => void;
	skipSaturday: boolean;
	setSkipSaturday: (value: boolean) => void;
	excludeToday: boolean;
	setExcludeToday: (value: boolean) => void;
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

export function CSVImport({
	onImport,
	totalHours,
	setTotalHours,
	completedHours,
	setCompletedHours,
	hourlyRate,
	setHourlyRate,
	billingStart,
	setBillingStart,
	billingEnd,
	setBillingEnd,
	skipSunday,
	setSkipSunday,
	skipSaturday,
	setSkipSaturday,
	excludeToday,
	setExcludeToday,
}: CSVImportProps) {
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

			// Calculate completed hours from CSV
			const sumActual = keys.reduce((s, k) => s + (newActuals[k] || 0), 0);
			const completedStr = `${Math.floor(sumActual / 60)} hrs ${sumActual % 60} mins`;
			setCompletedHours(completedStr);

			// Update billing dates from CSV data
			const csvStartDate = new Date(keys[0]);
			const csvEndDate = new Date(keys[keys.length - 1]);
			csvStartDate.setHours(0, 0, 0, 0);
			csvEndDate.setHours(0, 0, 0, 0);

			const startStr = csvStartDate.toISOString().slice(0, 10);
			const endStr = csvEndDate.toISOString().slice(0, 10);
			setBillingStart(startStr);
			setBillingEnd(endStr);

			const rateValue = parseFloat(hourlyRate) || 0;
			const r = calcWorkHours(totalHours, completedStr, startStr, endStr, false, false, false, rateValue);

			const built = buildDaysBetween(csvStartDate, csvEndDate, false, false);
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
		<div>
			<p className="text-sm text-gray-600 mb-6">
				Upload CSV with columns: Date, Task, Category, HRS, MINS. Dates may repeat and will be grouped. Enter total
				required hours and click "Parse & Display" to see results.
			</p>
			<div className="grid grid-cols-1 gap-4 mt-4">
				{/* Shared Business Context Fields */}
				<div className="bg-violet-50 rounded-lg p-4 border border-violet-200">
					<h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
						<span>📋</span>
						<span>Business Context (Shared across all modules)</span>
					</h4>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
						<div>
							<label htmlFor="csv-total" className="text-sm font-medium text-gray-700 block mb-1">
								📝 Total required hours
							</label>
							<input
								id="csv-total"
								type="text"
								placeholder="e.g., 160 hrs 0 mins"
								className="block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-violet-500 focus:ring-2 focus:ring-violet-200 transition-all bg-white"
								value={totalHours}
								onChange={(e) => setTotalHours(e.target.value)}
							/>
						</div>
						<div>
							<label htmlFor="csv-completed" className="text-sm font-medium text-gray-700 block mb-1">
								✅ Completed hours (auto-filled from CSV)
							</label>
							<input
								id="csv-completed"
								type="text"
								placeholder="Will be calculated from CSV"
								className="block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-violet-500 focus:ring-2 focus:ring-violet-200 transition-all bg-gray-100"
								value={completedHours}
								readOnly
							/>
						</div>
						<div>
							<label htmlFor="csv-rate" className="text-sm font-medium text-gray-700 block mb-1">
								� Hourly rate (Rs/hr)
							</label>
							<input
								id="csv-rate"
								type="number"
								min="0"
								step="0.01"
								placeholder="e.g., 500"
								className="block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-violet-500 focus:ring-2 focus:ring-violet-200 transition-all bg-white"
								value={hourlyRate}
								onChange={(e) => setHourlyRate(e.target.value)}
							/>
						</div>
						<div>
							<label htmlFor="csv-billing-start" className="text-sm font-medium text-gray-700 block mb-1">
								� Billing start (auto-filled from CSV)
							</label>
							<input
								id="csv-billing-start"
								type="date"
								className="block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-violet-500 focus:ring-2 focus:ring-violet-200 transition-all bg-gray-100"
								value={billingStart}
								readOnly
							/>
						</div>
						<div>
							<label htmlFor="csv-billing-end" className="text-sm font-medium text-gray-700 block mb-1">
								🏁 Billing end (auto-filled from CSV)
							</label>
							<input
								id="csv-billing-end"
								type="date"
								className="block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-violet-500 focus:ring-2 focus:ring-violet-200 transition-all bg-gray-100"
								value={billingEnd}
								readOnly
							/>
						</div>
					</div>

					{/* Weekend and Today Options */}
					<div className="mt-4 flex gap-3 sm:gap-4 items-center flex-wrap">
						<label className="inline-flex items-center gap-2 cursor-pointer group">
							<input
								type="checkbox"
								className="rounded w-4 h-4 text-violet-600 border-gray-300 focus:ring-violet-500 cursor-pointer"
								checked={skipSunday}
								onChange={(e) => setSkipSunday(e.target.checked)}
							/>
							<span className="text-sm text-gray-600 group-hover:text-gray-900 transition-colors">Skip Sundays</span>
						</label>
						<label className="inline-flex items-center gap-2 cursor-pointer group">
							<input
								type="checkbox"
								className="rounded w-4 h-4 text-violet-600 border-gray-300 focus:ring-violet-500 cursor-pointer"
								checked={skipSaturday}
								onChange={(e) => setSkipSaturday(e.target.checked)}
							/>
							<span className="text-sm text-gray-600 group-hover:text-gray-900 transition-colors">Skip Saturdays</span>
						</label>
						<label className="inline-flex items-center gap-2 cursor-pointer group">
							<input
								type="checkbox"
								className="rounded w-4 h-4 text-violet-600 border-gray-300 focus:ring-violet-500 cursor-pointer"
								checked={excludeToday}
								onChange={(e) => setExcludeToday(e.target.checked)}
							/>
							<span className="text-sm text-gray-600 group-hover:text-gray-900 transition-colors">Exclude today</span>
						</label>
					</div>
				</div>

				{/* CSV Import Section */}
				<div className="flex gap-2 items-center flex-wrap">
					<input
						id="csv-file"
						type="file"
						accept="text/csv,.csv"
						className="text-sm flex-1 min-w-[200px] file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100 file:cursor-pointer cursor-pointer"
						ref={fileInputRef}
					/>
					<button
						type="button"
						id="csv-import"
						onClick={handleFileImport}
						className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium shadow-md hover:shadow-lg transition-all duration-200 flex items-center gap-1">
						<span>📤</span>
						<span>Import CSV</span>
					</button>
				</div>

				<div className="flex justify-end">
					<button
						type="button"
						id="csv-parse-display"
						onClick={handleParseAndDisplay}
						className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 flex items-center gap-2">
						<span>Parse & Display</span>
						<span>→</span>
					</button>
				</div>
			</div>
			<div
				id="csv-feedback"
				className="mt-3 text-xs text-gray-600 bg-gray-50 rounded-lg p-2 border border-gray-200 min-h-8 flex items-center">
				{feedback || 'No file imported yet'}
			</div>
			{tableData.length > 0 && (
				<div id="csv-table" className="mt-4 overflow-auto max-h-64 rounded-lg border border-gray-200 bg-white">
					<table className="min-w-full text-sm">
						<thead className="bg-gray-100 sticky top-0">
							<tr className="text-left">
								<th className="px-4 py-3 font-semibold text-gray-700">Date</th>
								<th className="px-4 py-3 font-semibold text-gray-700">Total HRS</th>
								<th className="px-4 py-3 font-semibold text-gray-700">Details</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-gray-200">
							{tableData.map((row, idx) => (
								<tr key={row.date} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
									<td className="px-4 py-3 font-medium text-gray-900">{row.date}</td>
									<td className="px-4 py-3 text-gray-700">
										{row.hrs} hrs {row.mins} mins
									</td>
									<td className="px-4 py-3 text-gray-700">
										{row.details.map((detail, didx) => (
											<div key={`${row.date}-${didx}`} className="mb-1 last:mb-0">
												<strong className="text-gray-900">{detail.task}</strong>
												<span className="text-gray-500"> ({detail.category})</span> -
												<span className="text-violet-600">
													{' '}
													{detail.hrs}h {detail.mins}m
												</span>
											</div>
										))}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
		</div>
	);
}
