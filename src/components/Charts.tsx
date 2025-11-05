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
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import type { WorkHoursResult } from '../utils/timeUtils';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend);

interface ChartsProps {
	result: WorkHoursResult | null;
	actualsByDate: Record<string, number>;
	parsedRows: Record<string, unknown>[];
}

export function ProgressChart({ result }: { result: WorkHoursResult | null }) {
	if (!result) {
		return <div className="text-sm text-gray-500">No data</div>;
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
		return <div className="text-sm text-gray-500">No data - calculate work hours first</div>;
	}

	const labels = result.days.map((d) => d.date.toLocaleDateString());
	// Convert perDay from minutes to hours (perDay is in minutes)
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
		return <div className="text-sm text-gray-500">No data - calculate work hours first</div>;
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
		return <div className="text-sm text-gray-500">No data</div>;
	}

	const bins = 10;
	const min = Math.min(...actualHours);
	const max = Math.max(...actualHours);
	const width = (max - min) / bins || 1;
	const counts = new Array(bins).fill(0);
	const labels = new Array(bins)
		.fill(0)
		.map((_, i) => `${(min + i * width).toFixed(1)}-${(min + (i + 1) * width).toFixed(1)}`);

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
		return <div className="text-sm text-gray-500">No data</div>;
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

export function Charts({ result, actualsByDate, parsedRows }: ChartsProps) {
	return (
		<div className="max-w-6xl mx-auto p-6">
			<div className="bg-white rounded-lg shadow p-6 mt-4">
				<h3 className="text-md font-medium mb-2">Progress</h3>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div className="bg-gray-50 rounded p-4 h-64">
						<ProgressChart result={result} />
					</div>
					<div className="bg-gray-50 rounded p-4">
						<div className="text-sm muted mb-2">Daily plan (hours per remaining workday)</div>
						<DailyChart result={result} actualsByDate={actualsByDate} />
					</div>
				</div>
			</div>

			<div className="bg-white rounded-lg shadow p-6 mt-4">
				<h3 className="text-md font-medium mb-2">Burn-down / Forecast</h3>
				<div className="h-96 w-full">
					<BurnDownChart result={result} actualsByDate={actualsByDate} />
				</div>
			</div>

			<div className="bg-white rounded-lg shadow p-6 mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
				<div>
					<h4 className="text-sm font-medium mb-2">Actuals histogram (daily hours)</h4>
					<div className="bg-gray-50 rounded p-4 h-48">
						<HistogramChart actualsByDate={actualsByDate} />
					</div>
				</div>
				<div>
					<h4 className="text-sm font-medium mb-2">Category breakdown</h4>
					<div className="bg-gray-50 rounded p-4 h-48">
						<CategoryChart parsedRows={parsedRows} />
					</div>
				</div>
			</div>
		</div>
	);
}
