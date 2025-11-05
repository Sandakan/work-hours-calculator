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
		<div className="min-h-screen text-gray-900" style={{ background: 'linear-gradient(135deg, #f5f7fa 0%, #e9ecef 100%)' }}>
			<div className="max-w-full mx-auto p-4 sm:p-6 lg:p-8">
				<header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 fade-in">
					<div>
						<h1 className="text-3xl sm:text-4xl font-bold gradient-text">
							Work Hours & Time Calculator
						</h1>
						<p className="text-gray-600 mt-2 text-sm sm:text-base flex items-center gap-2">
							<span>📊</span>
							<span>Modern UI with charts and real-time tracking</span>
						</p>
					</div>
					<CurrentDateTime />
				</header>

				<main className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 fade-in">
					<WorkHoursCalculator onCalculate={handleCalculate} />
					<CSVImport onImport={handleCSVImport} />
				</main>

				<Charts result={result} actualsByDate={actualsByDate} parsedRows={parsedRows} />

				<div className="max-w-6xl mx-auto px-4 sm:px-6">
					<TimeSumCalculator />
				</div>

				<footer className="mt-8 text-sm text-gray-500 text-center pb-6 fade-in">
					<p className="flex items-center justify-center gap-2">
						<span>⚡</span>
						<span>Built with React + Vite + Tailwind CSS</span>
						<span>•</span>
						<span>Charts by Chart.js</span>
					</p>
				</footer>
			</div>
		</div>
	);
}

export default App;
