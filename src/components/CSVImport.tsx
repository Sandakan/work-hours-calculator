import { useEffect, useRef, useState } from 'react';
import { parseCSV } from '../utils/csvUtils';
import { loadFormState, saveFormState } from '../utils/storage';
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
	const savedState = loadFormState();
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
	const [requiredHours, setRequiredHours] = useState(savedState.csvRequired);
	const fileInputRef = useRef<HTMLInputElement>(null);

	// Save requiredHours to localStorage when it changes
	useEffect(() => {
		saveFormState({ csvRequired: requiredHours });
	}, [requiredHours]);

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
		<aside className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 border border-gray-100 card-hover">
			<div className="mb-4">
				<h3 className="text-xl font-semibold text-gray-800 flex items-center gap-2 mb-2">
					<span className="text-2xl">📁</span>
					<span>Import CSV</span>
				</h3>
				<p className="text-xs text-gray-500">
					Upload CSV with columns: Date, Task, Category, HRS, MINS. Dates may repeat and will be grouped.
				</p>
			</div>
			<div className="grid grid-cols-1 gap-3 mt-4">
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
				<div className="flex gap-2 items-center flex-wrap">
					<input
						id="csv-required"
						placeholder="e.g., 160 hrs 0 mins or 160"
						className="mt-1 block flex-1 min-w-[200px] rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-violet-500 focus:ring-2 focus:ring-violet-200 transition-all"
						value={requiredHours}
						onChange={(e) => setRequiredHours(e.target.value)}
					/>
					<button
						type="button"
						id="csv-parse-display"
						onClick={handleParseAndDisplay}
						className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium shadow-md hover:shadow-lg transition-all duration-200 flex items-center gap-1">
						<span>⚡</span>
						<span>Parse & Display</span>
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
		</aside>
	);
}
