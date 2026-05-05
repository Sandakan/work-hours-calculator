import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import { parseCSV } from '../utils/csvUtils';
import type { WorkHoursResult } from '../utils/timeUtils';
import { calcWorkHours } from '../utils/timeUtils';

interface CSVImportProps {
	onImport: (
		result: WorkHoursResult,
		actualsByDate: Record<string, number>,
		parsedRows: Record<string, unknown>[],
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
			setFeedback(
				`CSV loaded (${Math.round(text.length / 1024)} KB). Enter required hours and click Parse & Display.`,
			);
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
			const r = calcWorkHours(
				totalHours,
				completedStr,
				startStr,
				endStr,
				false,
				false,
				false,
				rateValue,
			);

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
				`Parsed and displayed CSV with required hours. Days:${labels.length} Planned(first):[${samplePlanned}] Actual(first):[${sampleActuals}]`,
			);
		} catch (e) {
			setFeedback('Parse & Display failed: ' + (e instanceof Error ? e.message : String(e)));
		}
	};

	return (
		<div className="flex flex-col gap-6">
			<p className="text-sm text-muted-foreground">
				Upload CSV with columns: Date, Task, Category, HRS, MINS. Dates may repeat and will be
				grouped. Enter total required hours and click "Parse & Display" to see results.
			</p>

			<div className="flex flex-col gap-4">
				{/* Shared Business Context Fields */}
				<Card className="bg-muted/30 border-dashed">
					<CardHeader className="pb-3">
						<CardTitle className="text-sm font-semibold flex items-center gap-2">
							<span>📋</span>
							<span>Business Context (Shared)</span>
						</CardTitle>
					</CardHeader>
					<CardContent>
						<FieldGroup>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
								<Field>
									<FieldLabel htmlFor="csv-total">📝 Total required hours</FieldLabel>
									<Input
										id="csv-total"
										type="text"
										placeholder="e.g., 160 hrs 0 mins"
										value={totalHours}
										onChange={(e) => setTotalHours(e.target.value)}
									/>
								</Field>
								<Field>
									<FieldLabel htmlFor="csv-completed">✅ Completed (auto-filled)</FieldLabel>
									<Input
										id="csv-completed"
										type="text"
										value={completedHours}
										readOnly
										className="bg-muted"
									/>
								</Field>
								<Field>
									<FieldLabel htmlFor="csv-rate">💰 Hourly rate (Rs/hr)</FieldLabel>
									<Input
										id="csv-rate"
										type="number"
										min="0"
										step="0.01"
										placeholder="e.g., 500"
										value={hourlyRate}
										onChange={(e) => setHourlyRate(e.target.value)}
									/>
								</Field>
								<div className="grid grid-cols-2 gap-4">
									<Field>
										<FieldLabel htmlFor="csv-billing-start">📅 Start</FieldLabel>
										<Input
											id="csv-billing-start"
											type="date"
											value={billingStart}
											readOnly
											className="bg-muted"
										/>
									</Field>
									<Field>
										<FieldLabel htmlFor="csv-billing-end">🏁 End</FieldLabel>
										<Input
											id="csv-billing-end"
											type="date"
											value={billingEnd}
											readOnly
											className="bg-muted"
										/>
									</Field>
								</div>
							</div>

							{/* Weekend and Today Options */}
							<div className="flex gap-4 items-center flex-wrap pt-2">
								<Field orientation="horizontal" className="w-auto">
									<Checkbox
										id="csv-skip-sun"
										checked={skipSunday}
										onCheckedChange={(v) => setSkipSunday(!!v)}
									/>
									<FieldLabel htmlFor="csv-skip-sun" className="text-sm font-normal">
										Skip Sundays
									</FieldLabel>
								</Field>
								<Field orientation="horizontal" className="w-auto">
									<Checkbox
										id="csv-skip-sat"
										checked={skipSaturday}
										onCheckedChange={(v) => setSkipSaturday(!!v)}
									/>
									<FieldLabel htmlFor="csv-skip-sat" className="text-sm font-normal">
										Skip Saturdays
									</FieldLabel>
								</Field>
								<Field orientation="horizontal" className="w-auto">
									<Checkbox
										id="csv-ex-today"
										checked={excludeToday}
										onCheckedChange={(v) => setExcludeToday(!!v)}
									/>
									<FieldLabel htmlFor="csv-ex-today" className="text-sm font-normal">
										Exclude today
									</FieldLabel>
								</Field>
							</div>
						</FieldGroup>
					</CardContent>
				</Card>

				{/* CSV Import Section */}
				<div className="flex gap-4 items-center flex-wrap">
					<Input
						id="csv-file"
						type="file"
						accept="text/csv,.csv"
						className="flex-1 min-w-50"
						ref={fileInputRef}
					/>
					<Button
						variant="outline"
						onClick={handleFileImport}
						className="bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-700 border-emerald-600/20"
					>
						📤 Import CSV
					</Button>
				</div>

				<div className="flex justify-end">
					<Button onClick={handleParseAndDisplay} size="lg" className="w-full sm:w-auto">
						Parse & Display
						<span className="ml-2">→</span>
					</Button>
				</div>
			</div>

			<div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3 border border-dashed min-h-10 flex items-center">
				{feedback || 'No file imported yet'}
			</div>

			{tableData.length > 0 && (
				<Card>
					<div className="overflow-auto max-h-96">
						<Table>
							<TableHeader className="sticky top-0 bg-background shadow-sm">
								<TableRow>
									<TableHead className="w-32">Date</TableHead>
									<TableHead className="w-32">Total HRS</TableHead>
									<TableHead>Details</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{tableData.map((row) => (
									<TableRow key={row.date}>
										<TableCell className="font-medium">{row.date}</TableCell>
										<TableCell>
											{row.hrs} hrs {row.mins} mins
										</TableCell>
										<TableCell>
											<div className="flex flex-col gap-2">
												{row.details.map((detail, didx) => (
													<div
														key={`${row.date}-${didx}`}
														className="text-sm border-l-2 border-primary/20 pl-3 py-1"
													>
														<div className="flex items-center gap-2">
															<span className="font-semibold">{detail.task}</span>
															<span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
																{detail.category}
															</span>
														</div>
														<div className="text-xs text-primary font-medium mt-1">
															{detail.hrs}h {detail.mins}m
														</div>
													</div>
												))}
											</div>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</div>
				</Card>
			)}
		</div>
	);
}
