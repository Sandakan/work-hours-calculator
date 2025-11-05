import { useState } from 'react';
import { Charts } from './components/Charts';
import { CSVImport } from './components/CSVImport';
import { CurrentDateTime } from './components/CurrentDateTime';
import { TimeSumCalculator } from './components/TimeSumCalculator';
import { WorkHoursCalculator } from './components/WorkHoursCalculator';
import type { WorkHoursResult } from './utils/timeUtils';
import './App.css';

function App() {
	const [result, setResult] = useState<WorkHoursResult | null>(null);
	const [actualsByDate, setActualsByDate] = useState<Record<string, number>>({});
	const [parsedRows, setParsedRows] = useState<Record<string, unknown>[]>([]);

	const handleCalculate = (newResult: WorkHoursResult) => {
		setResult(newResult);
	};

	const handleCSVImport = (
		newResult: WorkHoursResult,
		newActualsByDate: Record<string, number>,
		newParsedRows: Record<string, unknown>[]
	) => {
		setResult(newResult);
		setActualsByDate(newActualsByDate);
		setParsedRows(newParsedRows);
	};

	return (
		<div className="bg-gray-50 text-gray-900 min-h-screen">
			<div className="max-w-full mx-auto p-6">
				<header className="flex items-start justify-between gap-6 mb-6">
					<div>
						<h1 className="text-2xl font-semibold">Work Hours & Time Calculator</h1>
						<p className="muted mt-1">shadcn-like UI with charts and realtime info</p>
					</div>
					<CurrentDateTime />
				</header>

				<main className="grid grid-cols-1 lg:grid-cols-3 gap-6">
					<WorkHoursCalculator onCalculate={handleCalculate} />
					<CSVImport onImport={handleCSVImport} />
				</main>

				<Charts result={result} actualsByDate={actualsByDate} parsedRows={parsedRows} />

				<div className="max-w-6xl mx-auto p-6">
					<TimeSumCalculator />
				</div>

				<footer className="mt-6 text-sm muted text-center pb-6">
					<p>React + Vite + Tailwind CSS. Charts powered by Chart.js.</p>
				</footer>
			</div>
		</div>
	);
}

export default App;
