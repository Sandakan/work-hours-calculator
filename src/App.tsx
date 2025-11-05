import { useCallback, useEffect, useState } from 'react';
import { Charts } from './components/Charts';
import { CSVImport } from './components/CSVImport';
import { CurrentDateTime } from './components/CurrentDateTime';
import { TimeSumCalculator } from './components/TimeSumCalculator';
import { WakaTimeTracker } from './components/WakaTimeTracker';
import { WorkHoursCalculator } from './components/WorkHoursCalculator';
import { loadFormState, saveFormState } from './utils/storage';
import { calcWorkHours } from './utils/timeUtils';
import type { WakaTimeResult } from './types/wakatime';
import type { WorkHoursResult } from './utils/timeUtils';
import './App.css';

type TabType = 'calculator' | 'csv' | 'wakatime';
type DataSource = 'calculator' | 'csv' | 'wakatime' | null;

function App() {
	const savedState = loadFormState();

	const [activeTab, setActiveTab] = useState<TabType>('calculator');
	const [activeDataSource, setActiveDataSource] = useState<DataSource>(null);

	// Shared state across all modules
	const [totalHours, setTotalHours] = useState(savedState.whTotal);
	const [completedHours, setCompletedHours] = useState(savedState.whCompleted);
	const [hourlyRate, setHourlyRate] = useState(savedState.hourlyRate);
	const [billingStart, setBillingStart] = useState(savedState.whStart);
	const [billingEnd, setBillingEnd] = useState(savedState.whEnd);
	const [skipSunday, setSkipSunday] = useState(savedState.whSun);
	const [skipSaturday, setSkipSaturday] = useState(savedState.whSat);
	const [excludeToday, setExcludeToday] = useState(savedState.whExcludeToday);

	// Module-specific state
	const [result, setResult] = useState<WorkHoursResult | null>(null);
	const [actualsByDate, setActualsByDate] = useState<Record<string, number>>({});
	const [parsedRows, setParsedRows] = useState<Record<string, unknown>[]>([]);
	const [wakaTimeResult, setWakaTimeResult] = useState<WakaTimeResult | null>(null);
	const [wakaTimeDailyData, setWakaTimeDailyData] = useState<Record<string, number>>({});

	// Save shared state to localStorage whenever it changes
	useEffect(() => {
		saveFormState({
			whTotal: totalHours,
			whCompleted: completedHours,
			hourlyRate: hourlyRate,
			whStart: billingStart,
			whEnd: billingEnd,
			whSun: skipSunday,
			whSat: skipSaturday,
			whExcludeToday: excludeToday,
		});
	}, [totalHours, completedHours, hourlyRate, billingStart, billingEnd, skipSunday, skipSaturday, excludeToday]);

	const handleCalculate = useCallback((newResult: WorkHoursResult) => {
		setResult(newResult);
		setActiveDataSource('calculator');
		// Clear other data sources
		setActualsByDate({});
		setParsedRows([]);
		setWakaTimeResult(null);
		setWakaTimeDailyData({});
	}, []);

	const handleCSVImport = useCallback(
		(
			newResult: WorkHoursResult,
			newActualsByDate: Record<string, number>,
			newParsedRows: Record<string, unknown>[]
		) => {
			setResult(newResult);
			setActualsByDate(newActualsByDate);
			setParsedRows(newParsedRows);
			setActiveDataSource('csv');
			// Clear other data sources
			setWakaTimeResult(null);
			setWakaTimeDailyData({});
		},
		[]
	);

	const handleWakaTimeData = useCallback(
		(newResult: WakaTimeResult, dailyData: Record<string, number>) => {
			setWakaTimeResult(newResult);
			setWakaTimeDailyData(dailyData);
			setActiveDataSource('wakatime');

			// Clear CSV-specific data
			setActualsByDate({});
			setParsedRows([]);

			// Automatically calculate work hours using shared business context
			try {
				if (totalHours && completedHours && billingStart && billingEnd) {
					const rate = parseFloat(hourlyRate) || 0;
					const calculatorResult = calcWorkHours(
						totalHours,
						completedHours,
						billingStart,
						billingEnd,
						skipSunday,
						skipSaturday,
						excludeToday,
						rate
					);
					setResult(calculatorResult);
				}
			} catch (error) {
				console.error('Failed to auto-calculate work hours:', error);
				setResult(null);
			}
		},
		[totalHours, completedHours, hourlyRate, billingStart, billingEnd, skipSunday, skipSaturday, excludeToday]
	);

	return (
		<div
			className="min-h-screen text-gray-900"
			style={{ background: 'linear-gradient(135deg, #f5f7fa 0%, #e9ecef 100%)' }}>
			<div className="max-w-full mx-auto p-4 sm:p-6 lg:p-8">
				<header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 fade-in">
					<div>
						<h1 className="text-3xl sm:text-4xl font-bold gradient-text">Work Hours & Time Calculator</h1>
						<p className="text-gray-600 mt-2 text-sm sm:text-base flex items-center gap-2">
							<span>📊</span>
							<span>Modern UI with charts and real-time tracking</span>
						</p>
					</div>
					<CurrentDateTime />
				</header>
				{/* Tabbed Input Modules */}
				<div className="mb-6 fade-in">
					<div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
						{/* Tab Navigation */}
						<div className="flex border-b border-gray-200 bg-gray-50">
							<button
								type="button"
								onClick={() => setActiveTab('calculator')}
								className={`flex-1 px-6 py-4 text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
									activeTab === 'calculator'
										? 'bg-white text-violet-600 border-b-2 border-violet-600'
										: 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
								}`}>
								<span className="text-lg">🧮</span>
								<span>Work Hours Calculator</span>
							</button>
							<button
								type="button"
								onClick={() => setActiveTab('csv')}
								className={`flex-1 px-6 py-4 text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
									activeTab === 'csv'
										? 'bg-white text-violet-600 border-b-2 border-violet-600'
										: 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
								}`}>
								<span className="text-lg">📁</span>
								<span>CSV Import</span>
							</button>
							<button
								type="button"
								onClick={() => setActiveTab('wakatime')}
								className={`flex-1 px-6 py-4 text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
									activeTab === 'wakatime'
										? 'bg-white text-violet-600 border-b-2 border-violet-600'
										: 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
								}`}>
								<span className="text-lg">⏱️</span>
								<span>WakaTime Tracker</span>
							</button>
						</div>

						{/* Tab Content */}
						<div className="p-6">
							{activeTab === 'calculator' && (
								<WorkHoursCalculator
									onCalculate={handleCalculate}
									totalHours={totalHours}
									setTotalHours={setTotalHours}
									completedHours={completedHours}
									setCompletedHours={setCompletedHours}
									hourlyRate={hourlyRate}
									setHourlyRate={setHourlyRate}
									billingStart={billingStart}
									setBillingStart={setBillingStart}
									billingEnd={billingEnd}
									setBillingEnd={setBillingEnd}
									skipSunday={skipSunday}
									setSkipSunday={setSkipSunday}
									skipSaturday={skipSaturday}
									setSkipSaturday={setSkipSaturday}
									excludeToday={excludeToday}
									setExcludeToday={setExcludeToday}
								/>
							)}
							{activeTab === 'csv' && (
								<CSVImport
									onImport={handleCSVImport}
									totalHours={totalHours}
									setTotalHours={setTotalHours}
									completedHours={completedHours}
									setCompletedHours={setCompletedHours}
									hourlyRate={hourlyRate}
									setHourlyRate={setHourlyRate}
									billingStart={billingStart}
									setBillingStart={setBillingStart}
									billingEnd={billingEnd}
									setBillingEnd={setBillingEnd}
									skipSunday={skipSunday}
									setSkipSunday={setSkipSunday}
									skipSaturday={skipSaturday}
									setSkipSaturday={setSkipSaturday}
									excludeToday={excludeToday}
									setExcludeToday={setExcludeToday}
								/>
							)}
							{activeTab === 'wakatime' && (
								<WakaTimeTracker
									onDataFetch={handleWakaTimeData}
									totalHours={totalHours}
									setTotalHours={setTotalHours}
									completedHours={completedHours}
									setCompletedHours={setCompletedHours}
									hourlyRate={hourlyRate}
									setHourlyRate={setHourlyRate}
									billingStart={billingStart}
									setBillingStart={setBillingStart}
									billingEnd={billingEnd}
									setBillingEnd={setBillingEnd}
									skipSunday={skipSunday}
									setSkipSunday={setSkipSunday}
									skipSaturday={skipSaturday}
									setSkipSaturday={setSkipSaturday}
									excludeToday={excludeToday}
									setExcludeToday={setExcludeToday}
									result={result}
								/>
							)}
						</div>
					</div>
				</div>
				{/* Data Source Indicator */}
				{activeDataSource && (
					<div className="mb-4 fade-in">
						<div className="bg-linear-to-r from-violet-50 to-purple-50 border-l-4 border-violet-500 rounded-lg p-4 shadow-sm">
							<div className="flex items-center gap-3">
								<div className="shrink-0">
									{activeDataSource === 'calculator' && <span className="text-2xl">🧮</span>}
									{activeDataSource === 'csv' && <span className="text-2xl">📁</span>}
									{activeDataSource === 'wakatime' && <span className="text-2xl">⏱️</span>}
								</div>
								<div>
									<p className="text-sm font-semibold text-gray-800">
										Displaying data from:{' '}
										<span className="text-violet-700">
											{activeDataSource === 'calculator' && 'Work Hours Calculator'}
											{activeDataSource === 'csv' && 'CSV Import'}
											{activeDataSource === 'wakatime' && 'WakaTime Tracker'}
										</span>
									</p>
									<p className="text-xs text-gray-600 mt-1">
										Charts and analytics below show data from this source only
									</p>
								</div>
							</div>
						</div>
					</div>
				)}
				<Charts
					result={result}
					actualsByDate={actualsByDate}
					parsedRows={parsedRows}
					wakaTimeResult={wakaTimeResult}
					wakaTimeDailyData={wakaTimeDailyData}
					activeDataSource={activeDataSource}
				/>{' '}
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
