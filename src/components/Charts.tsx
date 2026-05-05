import {
	ArcElement,
	BarElement,
	CategoryScale,
	Chart as ChartJS,
	Legend,
	LinearScale,
	LineElement,
	PointElement,
	Title,
	Tooltip,
} from 'chart.js';
import { Bar, Doughnut, Line, Pie } from 'react-chartjs-2';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { WakaTimeResult } from '../types/wakatime';
import type { WorkHoursResult } from '../utils/timeUtils';

ChartJS.register(
	CategoryScale,
	LinearScale,
	PointElement,
	LineElement,
	BarElement,
	ArcElement,
	Title,
	Tooltip,
	Legend,
);

type DataSource = 'calculator' | 'csv' | 'wakatime' | null;

interface ChartsProps {
	result: WorkHoursResult | null;
	actualsByDate: Record<string, number>;
	parsedRows: Record<string, unknown>[];
	wakaTimeResult?: WakaTimeResult | null;
	wakaTimeDailyData?: Record<string, number>;
	activeDataSource: DataSource;
}

function NotSupportedMessage({ message }: { message: string }) {
	return (
		<div className="flex flex-col items-center justify-center h-full min-h-50 text-center p-4">
			<div className="text-4xl mb-3">🚫</div>
			<p className="text-sm font-medium text-muted-foreground mb-1">Not Available</p>
			<p className="text-xs text-muted-foreground/70">{message}</p>
		</div>
	);
}

export function ProgressChart({ result }: { result: WorkHoursResult | null }) {
	if (!result) {
		return <div className="text-sm text-muted-foreground">No data</div>;
	}

	const completed = result.completed / 60;
	const remaining = Math.max(0, result.remaining) / 60;

	const data = {
		labels: ['Completed', 'Remaining'],
		datasets: [
			{
				data: [completed, remaining],
				backgroundColor: ['#7c3aed', '#e6e6fa'],
			},
		],
	};

	const options = {
		plugins: { legend: { position: 'bottom' as const } },
		responsive: true,
		maintainAspectRatio: true,
	} as const;

	return <Doughnut data={data} options={options} />;
}

export function DailyChart({
	result,
	actualsByDate,
}: {
	result: WorkHoursResult | null;
	actualsByDate: Record<string, number>;
}) {
	if (!result) {
		return <div className="text-sm text-muted-foreground">No data - calculate work hours first</div>;
	}

	const labels = result.days.map((d) => d.date.toLocaleDateString());
	const perDayHours = result.perDay / 60;
	const plannedData = result.days.map((d) => (d.work ? perDayHours : 0));
	const actualData = result.days.map((d) => {
		const k = d.date.toISOString().slice(0, 10);
		return Math.round(((actualsByDate[k] || 0) / 60) * 100) / 100;
	});

	const barData = {
		labels,
		datasets: [
			{
				label: 'Planned hours per day',
				data: plannedData,
				backgroundColor: '#7c3aed',
				borderColor: '#7c3aed',
				borderWidth: 1,
			},
		],
	};

	const barOptions = {
		indexAxis: 'x' as const,
		scales: { y: { beginAtZero: true, max: Math.max(...plannedData, ...actualData) * 1.2 || 10 } },
		responsive: true,
		maintainAspectRatio: false,
		plugins: { legend: { position: 'bottom' as const } },
	} as const;

	return (
		<div className="space-y-4 w-full">
			<div className="h-64 w-full">
				<Bar data={barData} options={barOptions} />
			</div>
			{actualData.some((v) => v > 0) && (
				<div className="h-64 w-full">
					<Line
						data={{
							labels,
							datasets: [
								{
									label: 'Actual hours (imported)',
									data: actualData,
									borderColor: '#10b981',
									backgroundColor: '#10b98144',
									tension: 0.2,
									fill: true,
									borderWidth: 2,
								},
							],
						}}
						options={
							{
								scales: { y: { beginAtZero: true } },
								responsive: true,
								maintainAspectRatio: false,
								plugins: { legend: { position: 'bottom' as const } },
							} as const
						}
					/>
				</div>
			)}
		</div>
	);
}

export function BurnDownChart({
	result,
	actualsByDate,
}: {
	result: WorkHoursResult | null;
	actualsByDate: Record<string, number>;
}) {
	if (!result) {
		return <div className="text-sm text-muted-foreground">No data - calculate work hours first</div>;
	}

	const totalMin = result.total;
	let plannedRemaining = totalMin;
	let actualRemaining = totalMin;
	const labels: string[] = [];
	const plannedSeries: number[] = [];
	const actualSeries: number[] = [];

	for (const d of result.days) {
		labels.push(d.date.toLocaleDateString());
		if (d.work) {
			plannedRemaining -= result.perDay;
			if (plannedRemaining < 0) plannedRemaining = 0;
		}
		const key = d.date.toISOString().slice(0, 10);
		const actualMinutes = actualsByDate[key] || 0;
		actualRemaining -= actualMinutes;
		if (actualRemaining < 0) actualRemaining = 0;
		plannedSeries.push(plannedRemaining / 60);
		actualSeries.push(actualRemaining / 60);
	}

	const data = {
		labels,
		datasets: [
			{
				label: 'Planned remaining (hrs)',
				data: plannedSeries,
				borderColor: '#7c3aed',
				backgroundColor: 'transparent',
				fill: false,
				tension: 0.3,
				borderWidth: 2,
				pointRadius: 3,
				pointBackgroundColor: '#7c3aed',
			},
			{
				label: 'Actual remaining (hrs)',
				data: actualSeries,
				borderColor: '#10b981',
				backgroundColor: 'transparent',
				fill: false,
				tension: 0.3,
				borderWidth: 2,
				pointRadius: 3,
				pointBackgroundColor: '#10b981',
			},
		],
	};

	const options = {
		scales: {
			y: {
				beginAtZero: true,
				max: Math.max(...plannedSeries, ...actualSeries) * 1.1 || 100,
			},
		},
		responsive: true,
		maintainAspectRatio: false,
		plugins: { legend: { position: 'bottom' as const } },
	} as const;

	return <Line data={data} options={options} />;
}

export function HistogramChart({ actualsByDate }: { actualsByDate: Record<string, number> }) {
	const keys = Object.keys(actualsByDate).sort();
	const actualHours = keys.map((k) => actualsByDate[k] / 60);

	if (actualHours.length === 0) {
		return <div className="text-sm text-muted-foreground">No data</div>;
	}

	const bins = 10;
	const min = Math.min(...actualHours);
	const max = Math.max(...actualHours);
	const width = (max - min) / bins || 1;
	const counts = Array.from({ length: bins }).fill(0) as number[];
	const labels = Array.from({ length: bins }).map(
		(_, i) => `${(min + i * width).toFixed(1)}-${(min + (i + 1) * width).toFixed(1)}`,
	);

	for (const v of actualHours) {
		const bi = Math.min(bins - 1, Math.floor((v - min) / width));
		counts[bi]++;
	}

	const data = {
		labels,
		datasets: [{ label: 'Days', data: counts, backgroundColor: '#60a5fa' }],
	};

	const options = {
		scales: { y: { beginAtZero: true } },
		responsive: true,
		maintainAspectRatio: false,
		plugins: { legend: { position: 'bottom' as const } },
	} as const;

	return <Bar data={data} options={options} />;
}

export function CategoryChart({ parsedRows }: { parsedRows: Record<string, unknown>[] }) {
	const catMap: Record<string, number> = {};

	for (const r of parsedRows) {
		const cat = ((r['Category'] ?? r['category'] ?? '') as string).trim() || 'Uncategorized';
		const hrs = Number(r['HRS'] ?? r['Hrs'] ?? r['hrs'] ?? 0) || 0;
		const mins = Number(r['MINS'] ?? r['Mins'] ?? r['mins'] ?? 0) || 0;
		const m = hrs * 60 + mins;
		catMap[cat] = (catMap[cat] || 0) + m;
	}

	const catLabels = Object.keys(catMap);
	const catData = catLabels.map((k) => Math.round((catMap[k] / 60) * 100) / 100);

	if (catLabels.length === 0) {
		return <div className="text-sm text-muted-foreground">No data</div>;
	}

	const data = {
		labels: catLabels,
		datasets: [
			{
				data: catData,
				backgroundColor: ['#7c3aed', '#60a5fa', '#10b981', '#f59e0b', '#ef4444'],
			},
		],
	};

	const options = {
		plugins: { legend: { position: 'bottom' as const } },
		responsive: true,
		maintainAspectRatio: true,
	} as const;

	return <Doughnut data={data} options={options} />;
}

export function EarningsProgressChart({ result }: { result: WorkHoursResult | null }) {
	if (!result || result.hourlyRate === 0) {
		return <div className="text-sm text-muted-foreground">No earnings data - set hourly rate first</div>;
	}

	const completedEarnings = result.completedEarnings;
	const remainingEarnings = Math.max(0, result.remainingEarnings);

	const data = {
		labels: ['Earned', 'Remaining'],
		datasets: [
			{
				data: [completedEarnings, remainingEarnings],
				backgroundColor: ['#10b981', '#fef3c7'],
			},
		],
	};

	const options = {
		plugins: {
			legend: { position: 'bottom' as const },
			tooltip: {
				callbacks: {
					label: (context: unknown) => {
						const ctx = context as { label: string; parsed: number };
						return `${ctx.label}: Rs ${ctx.parsed.toFixed(2)}`;
					},
				},
			},
		},
		responsive: true,
		maintainAspectRatio: true,
	} as const;

	return <Doughnut data={data} options={options} />;
}

export function EarningsOverTimeChart({ result }: { result: WorkHoursResult | null }) {
	if (!result || result.hourlyRate === 0) {
		return <div className="text-sm text-muted-foreground">No earnings data - set hourly rate first</div>;
	}

	const labels = result.days.map((d) => d.date.toLocaleDateString());
	let cumulativeEarnings = result.completedEarnings;
	const projectedEarnings = result.days.map((d) => {
		if (d.work) {
			cumulativeEarnings += result.earningsPerDay;
		}
		return Math.round(cumulativeEarnings * 100) / 100;
	});

	const data = {
		labels,
		datasets: [
			{
				label: 'Projected cumulative earnings (Rs)',
				data: projectedEarnings,
				borderColor: '#10b981',
				backgroundColor: '#10b98144',
				tension: 0.3,
				fill: true,
				borderWidth: 2,
				pointRadius: 3,
				pointBackgroundColor: '#10b981',
			},
		],
	};

	const options = {
		scales: {
			y: {
				beginAtZero: false,
				ticks: {
					callback: (value: string | number) => {
						return 'Rs ' + value;
					},
				},
			},
		},
		responsive: true,
		maintainAspectRatio: false,
		plugins: {
			legend: { position: 'bottom' as const },
			tooltip: {
				callbacks: {
					label: (context: unknown) => {
						const ctx = context as { dataset: { label: string }; parsed: { y: number } };
						return `${ctx.dataset.label}: Rs ${ctx.parsed.y.toFixed(2)}`;
					},
				},
			},
		},
	} as const;

	return <Line data={data} options={options} />;
}

export function DailyEarningsChart({ result }: { result: WorkHoursResult | null }) {
	if (!result || result.hourlyRate === 0) {
		return <div className="text-sm text-muted-foreground">No earnings data - set hourly rate first</div>;
	}

	const labels = result.days.map((d) => d.date.toLocaleDateString());
	const earningsData = result.days.map((d) => (d.work ? result.earningsPerDay : 0));

	const data = {
		labels,
		datasets: [
			{
				label: 'Daily earnings (Rs)',
				data: earningsData,
				backgroundColor: '#f59e0b',
				borderColor: '#f59e0b',
				borderWidth: 1,
			},
		],
	};

	const options = {
		indexAxis: 'x' as const,
		scales: {
			y: {
				beginAtZero: true,
				ticks: {
					callback: (value: string | number) => {
						return 'Rs ' + value;
					},
				},
			},
		},
		responsive: true,
		maintainAspectRatio: false,
		plugins: {
			legend: { position: 'bottom' as const },
			tooltip: {
				callbacks: {
					label: (context: unknown) => {
						const ctx = context as { dataset: { label: string }; parsed: { y: number } };
						return `${ctx.dataset.label}: Rs ${ctx.parsed.y.toFixed(2)}`;
					},
				},
			},
		},
	} as const;

	return <Bar data={data} options={options} />;
}

export function Charts({
	result,
	actualsByDate,
	parsedRows,
	wakaTimeResult,
	wakaTimeDailyData,
}: ChartsProps) {
	// Determine if we have data to show
	const hasCalculatorData = result !== null;
	const hasCSVData = Object.keys(actualsByDate).length > 0 || parsedRows.length > 0;
	const hasWakaTimeData = wakaTimeResult !== null;
	const hasWakaTimeDailyData = wakaTimeDailyData && Object.keys(wakaTimeDailyData).length > 0;
	const hasAnyData = hasCalculatorData || hasCSVData || hasWakaTimeData;

	// For WakaTime, we can show calculator-based charts if result exists
	const canShowCalculatorCharts = hasCalculatorData;
	// For daily hours distribution and burn-down, we can use WakaTime daily data
	const canShowDailyDistribution = hasCSVData || hasWakaTimeDailyData;
	const canShowBurnDown = hasCalculatorData;

	if (!hasAnyData) {
		return (
			<div className="max-w-6xl mx-auto p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
				<Card className="text-center p-12">
					<div className="text-6xl mb-4">📊</div>
					<h3 className="text-xl font-semibold text-foreground mb-2">No Data Yet</h3>
					<p className="text-sm text-muted-foreground">
						Select an input method from the tabs above and submit data to see visualizations here.
					</p>
				</Card>
			</div>
		);
	}

	return (
		<div className="max-w-6xl mx-auto p-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
			{/* Progress Overview */}
			<Card>
				<CardHeader>
					<CardTitle className="text-xl font-semibold flex items-center gap-2">
						<span className="text-2xl">📊</span>
						<span>Progress Overview</span>
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-8">
						<div className="bg-muted/30 rounded-lg p-6 h-64 border border-dashed flex flex-col justify-center">
							{canShowCalculatorCharts ? (
								<ProgressChart result={result} />
							) : (
								<NotSupportedMessage message="Fill Business Context fields and calculate to see progress" />
							)}
						</div>
						<div className="bg-muted/30 rounded-lg p-6 border border-dashed">
							<div className="text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2">
								<span>📅</span>
								<span>Daily Plan (hours per remaining workday)</span>
							</div>
							{canShowCalculatorCharts ? (
								<DailyChart result={result} actualsByDate={actualsByDate} />
							) : (
								<NotSupportedMessage message="Fill Business Context fields and calculate to see daily plan" />
							)}
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Earnings Overview */}
			{canShowCalculatorCharts && result && result.hourlyRate > 0 && (
				<Card>
					<CardHeader>
						<CardTitle className="text-xl font-semibold flex items-center gap-2">
							<span className="text-2xl">💰</span>
							<span>Earnings Overview</span>
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-8">
							<div className="bg-green-500/5 rounded-lg p-6 h-64 border border-green-500/10 border-dashed flex flex-col justify-center">
								<div className="text-sm font-medium text-green-700 dark:text-green-400 mb-4 flex items-center gap-2">
									<span>💵</span>
									<span>Earnings Progress</span>
								</div>
								<EarningsProgressChart result={result} />
							</div>
							<div className="bg-yellow-500/5 rounded-lg p-6 border border-yellow-500/10 border-dashed">
								<div className="text-sm font-medium text-yellow-700 dark:text-yellow-400 mb-4 flex items-center gap-2">
									<span>📈</span>
									<span>Projected Cumulative Earnings</span>
								</div>
								<div className="h-48">
									<EarningsOverTimeChart result={result} />
								</div>
							</div>
						</div>
						<div className="mt-8">
							<h4 className="text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2">
								<span>💸</span>
								<span>Daily Earnings Breakdown</span>
							</h4>
							<div className="bg-orange-500/5 rounded-lg p-6 h-64 border border-orange-500/10 border-dashed">
								<DailyEarningsChart result={result} />
							</div>
						</div>
					</CardContent>
				</Card>
			)}

			{/* Burn-down Forecast */}
			<Card>
				<CardHeader>
					<CardTitle className="text-xl font-semibold flex items-center gap-2">
						<span className="text-2xl">📉</span>
						<span>Burn-down Forecast</span>
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="h-96 w-full bg-muted/30 rounded-lg p-6 border border-dashed">
						{canShowBurnDown ? (
							<BurnDownChart result={result} actualsByDate={actualsByDate} />
						) : (
							<NotSupportedMessage message="Fill Business Context fields and calculate to see burn-down forecast" />
						)}
					</div>
				</CardContent>
			</Card>

			{/* Analytics Section */}
			<Card>
				<CardHeader>
					<CardTitle className="text-xl font-semibold flex items-center gap-2">
						<span className="text-2xl">📈</span>
						<span>Analytics</span>
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-8">
						<div>
							<h4 className="text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2">
								<span>📊</span>
								<span>Daily Hours Distribution</span>
							</h4>
							<div className="bg-blue-500/5 rounded-lg p-6 h-48 border border-blue-500/10 border-dashed">
								{canShowDailyDistribution ? (
									<HistogramChart
										actualsByDate={
											hasWakaTimeDailyData && !hasCSVData ? wakaTimeDailyData! : actualsByDate
										}
									/>
								) : (
									<NotSupportedMessage message="Available with CSV Import or WakaTime Tracker data" />
								)}
							</div>
						</div>
						<div>
							<h4 className="text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2">
								<span>🏷️</span>
								<span>Category Breakdown</span>
							</h4>
							<div className="bg-emerald-500/5 rounded-lg p-6 h-48 border border-emerald-500/10 border-dashed">
								{parsedRows.length > 0 ? (
									<CategoryChart parsedRows={parsedRows} />
								) : (
									<NotSupportedMessage message="Available with CSV Import data (requires Category column)" />
								)}
							</div>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Time Tracking Analytics (WakaTime) */}
			<Card>
				<CardHeader>
					<CardTitle className="text-xl font-semibold flex items-center gap-2">
						<span className="text-2xl">⏱️</span>
						<span>Time Tracking Analytics</span>
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-8">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-8">
						<div>
							<h4 className="text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2">
								<span>💻</span>
								<span>Language Distribution</span>
							</h4>
							<div className="bg-purple-500/5 rounded-lg p-6 h-64 border border-purple-500/10 border-dashed flex flex-col justify-center">
								{hasWakaTimeData && wakaTimeResult && wakaTimeResult.languages.length > 0 ? (
									<Pie
										data={{
											labels: wakaTimeResult.languages.slice(0, 5).map((l) => l.name),
											datasets: [
												{
													data: wakaTimeResult.languages.slice(0, 5).map((l) => l.hours),
													backgroundColor: ['#7c3aed', '#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe'],
												},
											],
										}}
										options={{
											plugins: { legend: { position: 'bottom' as const } },
											responsive: true,
											maintainAspectRatio: true,
										}}
									/>
								) : (
									<NotSupportedMessage message="Available with WakaTime Tracker data" />
								)}
							</div>
						</div>
						<div>
							<h4 className="text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2">
								<span>🖥️</span>
								<span>Editor Usage</span>
							</h4>
							<div className="bg-indigo-500/5 rounded-lg p-6 h-64 border border-indigo-500/10 border-dashed flex flex-col justify-center">
								{hasWakaTimeData && wakaTimeResult && wakaTimeResult.editors.length > 0 ? (
									<Doughnut
										data={{
											labels: wakaTimeResult.editors.map((e) => e.name),
											datasets: [
												{
													data: wakaTimeResult.editors.map((e) => e.hours),
													backgroundColor: ['#6366f1', '#818cf8', '#a5b4fc'],
												},
											],
										}}
										options={{
											plugins: { legend: { position: 'bottom' as const } },
											responsive: true,
											maintainAspectRatio: true,
										}}
									/>
								) : (
									<NotSupportedMessage message="Available with WakaTime Tracker data" />
								)}
							</div>
						</div>
					</div>
					<div>
						<h4 className="text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2">
							<span>📅</span>
							<span>Daily Time Tracked</span>
						</h4>
						<div className="bg-cyan-500/5 rounded-lg p-6 h-64 border border-cyan-500/10 border-dashed">
							{hasWakaTimeData && wakaTimeDailyData && Object.keys(wakaTimeDailyData).length > 0 ? (
								<Bar
									data={{
										labels: Object.keys(wakaTimeDailyData).sort(),
										datasets: [
											{
												label: 'Hours tracked',
												data: Object.keys(wakaTimeDailyData)
													.sort()
													.map((date) => wakaTimeDailyData[date]),
												backgroundColor: '#06b6d4',
												borderColor: '#0891b2',
												borderWidth: 1,
											},
										],
									}}
									options={{
										scales: { y: { beginAtZero: true } },
										responsive: true,
										maintainAspectRatio: false,
										plugins: { legend: { position: 'bottom' as const } },
									}}
								/>
							) : (
								<NotSupportedMessage message="Available with WakaTime Tracker data" />
							)}
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
