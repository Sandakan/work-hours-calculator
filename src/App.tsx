import { useCallback, useEffect, useState } from 'react';
import { Charts } from './components/Charts';
import { CSVImport } from './components/CSVImport';
import { CurrentDateTime } from './components/CurrentDateTime';
import { TimeSumCalculator } from './components/TimeSumCalculator';
import { WorkHoursCalculator } from './components/WorkHoursCalculator';
import { WakaTimeTracker } from './components/WakaTimeTracker';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { loadFormState, saveFormState } from './utils/storage';
import { calcWorkHours } from './utils/timeUtils';
import type { WakaTimeResult } from './types/wakatime';
import type { WorkHoursResult } from './utils/timeUtils';

type TabType = 'calculator' | 'csv' | 'wakatime';
type DataSource = 'calculator' | 'csv' | 'wakatime' | null;

const DATA_SOURCE_META: Record<string, { label: string; icon: string }> = {
	calculator: { label: 'Work Hours Calculator', icon: '🧮' },
	csv:        { label: 'CSV Import',             icon: '📁' },
	wakatime:   { label: 'WakaTime Tracker',       icon: '⏱️' },
};

function App() {
	const savedState = loadFormState();

	const [activeTab, setActiveTab] = useState<TabType>('calculator');
	const [activeDataSource, setActiveDataSource] = useState<DataSource>(null);

	// Shared state
	const [totalHours,    setTotalHours]    = useState(savedState.whTotal);
	const [completedHours, setCompletedHours] = useState(savedState.whCompleted);
	const [hourlyRate,    setHourlyRate]    = useState(savedState.hourlyRate);
	const [billingStart,  setBillingStart]  = useState(savedState.whStart);
	const [billingEnd,    setBillingEnd]    = useState(savedState.whEnd);
	const [skipSunday,    setSkipSunday]    = useState(savedState.whSun);
	const [skipSaturday,  setSkipSaturday]  = useState(savedState.whSat);
	const [excludeToday,  setExcludeToday]  = useState(savedState.whExcludeToday);

	// Module-specific state
	const [result,          setResult]          = useState<WorkHoursResult | null>(null);
	const [actualsByDate,   setActualsByDate]   = useState<Record<string, number>>({});
	const [parsedRows,      setParsedRows]      = useState<Record<string, unknown>[]>([]);
	const [wakaTimeResult,  setWakaTimeResult]  = useState<WakaTimeResult | null>(null);
	const [wakaTimeDailyData, setWakaTimeDailyData] = useState<Record<string, number>>({});

	useEffect(() => {
		saveFormState({
			whTotal: totalHours, whCompleted: completedHours, hourlyRate,
			whStart: billingStart, whEnd: billingEnd,
			whSun: skipSunday, whSat: skipSaturday, whExcludeToday: excludeToday,
		});
	}, [totalHours, completedHours, hourlyRate, billingStart, billingEnd, skipSunday, skipSaturday, excludeToday]);

	const handleCalculate = useCallback((newResult: WorkHoursResult) => {
		setResult(newResult);
		setActiveDataSource('calculator');
		setActualsByDate({});
		setParsedRows([]);
		setWakaTimeResult(null);
		setWakaTimeDailyData({});
	}, []);

	const handleCSVImport = useCallback((
		newResult: WorkHoursResult,
		newActualsByDate: Record<string, number>,
		newParsedRows: Record<string, unknown>[],
	) => {
		setResult(newResult);
		setActualsByDate(newActualsByDate);
		setParsedRows(newParsedRows);
		setActiveDataSource('csv');
		setWakaTimeResult(null);
		setWakaTimeDailyData({});
	}, []);

	const handleWakaTimeData = useCallback((
		newResult: WakaTimeResult,
		dailyData: Record<string, number>,
	) => {
		setWakaTimeResult(newResult);
		setWakaTimeDailyData(dailyData);
		setActiveDataSource('wakatime');
		setActualsByDate({});
		setParsedRows([]);
	}, []);

	useEffect(() => {
		if (activeDataSource === 'wakatime' && totalHours && completedHours && billingStart && billingEnd) {
			try {
				const rate = parseFloat(hourlyRate) || 0;
				setResult(calcWorkHours(totalHours, completedHours, billingStart, billingEnd, skipSunday, skipSaturday, excludeToday, rate));
			} catch (error) {
				console.error('Failed to auto-calculate work hours:', error);
				setResult(null);
			}
		}
	}, [activeDataSource, totalHours, completedHours, billingStart, billingEnd, skipSunday, skipSaturday, excludeToday, hourlyRate]);

	const sourceMeta = activeDataSource ? DATA_SOURCE_META[activeDataSource] : null;

	return (
		<div className="min-h-screen bg-background text-foreground">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10">

				{/* ── Header ─────────────────────────────────────── */}
				<header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 mb-10">
					<div className="space-y-1">
						<div className="flex items-center gap-3">
							<div className="w-8 h-8 rounded-lg bg-primary/15 border border-primary/25 flex items-center justify-center text-sm shrink-0">
								⏱
							</div>
							<h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
								Work Hours & Time Calculator
							</h1>
						</div>
						<p className="text-muted-foreground text-sm pl-11">
							Track, import, and visualise your billable hours — all in one place.
						</p>
					</div>
					<div className="pl-11 sm:pl-0">
						<CurrentDateTime />
					</div>
				</header>

				{/* ── Tabbed Input Modules ─────────────────────────── */}
				<Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabType)} className="mb-8">
					<Card className="overflow-hidden border border-border/60">
						<TabsList className="w-full h-auto p-0 bg-muted/30 rounded-none border-b border-border/60 grid grid-cols-3">
							{[
								{ value: 'calculator', icon: '🧮', label: 'Work Hours' },
								{ value: 'csv',        icon: '📁', label: 'CSV Import' },
								{ value: 'wakatime',   icon: '⏱️', label: 'WakaTime'   },
							].map(({ value, icon, label }) => (
								<TabsTrigger
									key={value}
									value={value}
									className="
										flex items-center justify-center gap-2 px-4 py-3.5 rounded-none
										text-sm font-medium text-muted-foreground
										data-[state=active]:bg-background/60
										data-[state=active]:text-primary
										data-[state=active]:shadow-none
										data-[state=active]:border-b-2
										data-[state=active]:border-primary
										transition-all duration-150
									"
								>
									<span className="text-base">{icon}</span>
									<span className="hidden sm:inline">{label}</span>
								</TabsTrigger>
							))}
						</TabsList>

						<CardContent className="pt-6 pb-8">
							<TabsContent value="calculator" className="mt-0 outline-none animate-in fade-in slide-in-from-bottom-2 duration-300">
								<WorkHoursCalculator
									onCalculate={handleCalculate}
									totalHours={totalHours}          setTotalHours={setTotalHours}
									completedHours={completedHours}  setCompletedHours={setCompletedHours}
									hourlyRate={hourlyRate}          setHourlyRate={setHourlyRate}
									billingStart={billingStart}      setBillingStart={setBillingStart}
									billingEnd={billingEnd}          setBillingEnd={setBillingEnd}
									skipSunday={skipSunday}          setSkipSunday={setSkipSunday}
									skipSaturday={skipSaturday}      setSkipSaturday={setSkipSaturday}
									excludeToday={excludeToday}      setExcludeToday={setExcludeToday}
								/>
							</TabsContent>

							<TabsContent value="csv" className="mt-0 outline-none animate-in fade-in slide-in-from-bottom-2 duration-300">
								<CSVImport
									onImport={handleCSVImport}
									totalHours={totalHours}          setTotalHours={setTotalHours}
									completedHours={completedHours}  setCompletedHours={setCompletedHours}
									hourlyRate={hourlyRate}          setHourlyRate={setHourlyRate}
									billingStart={billingStart}      setBillingStart={setBillingStart}
									billingEnd={billingEnd}          setBillingEnd={setBillingEnd}
									skipSunday={skipSunday}          setSkipSunday={setSkipSunday}
									skipSaturday={skipSaturday}      setSkipSaturday={setSkipSaturday}
									excludeToday={excludeToday}      setExcludeToday={setExcludeToday}
								/>
							</TabsContent>

							<TabsContent value="wakatime" className="mt-0 outline-none animate-in fade-in slide-in-from-bottom-2 duration-300">
								<WakaTimeTracker
									onDataFetch={handleWakaTimeData}
									totalHours={totalHours}          setTotalHours={setTotalHours}
									completedHours={completedHours}  setCompletedHours={setCompletedHours}
									hourlyRate={hourlyRate}          setHourlyRate={setHourlyRate}
									billingStart={billingStart}      setBillingStart={setBillingStart}
									billingEnd={billingEnd}          setBillingEnd={setBillingEnd}
									skipSunday={skipSunday}          setSkipSunday={setSkipSunday}
									skipSaturday={skipSaturday}      setSkipSaturday={setSkipSaturday}
									excludeToday={excludeToday}      setExcludeToday={setExcludeToday}
									result={result}
								/>
							</TabsContent>
						</CardContent>
					</Card>
				</Tabs>

				{/* ── Active Data Source Indicator ─────────────────── */}
				{sourceMeta && (
					<div className="flex items-center gap-2.5 mb-8">
						<span className="text-xs text-muted-foreground">Showing charts from</span>
						<Badge variant="secondary" className="text-primary font-semibold gap-1.5">
							<span>{sourceMeta.icon}</span>
							{sourceMeta.label}
						</Badge>
					</div>
				)}

				{/* ── Charts ───────────────────────────────────────── */}
				<Charts
					result={result}
					actualsByDate={actualsByDate}
					parsedRows={parsedRows}
					wakaTimeResult={wakaTimeResult}
					wakaTimeDailyData={wakaTimeDailyData}
					activeDataSource={activeDataSource}
				/>

				{/* ── Time Sum Calculator ───────────────────────────── */}
				<div className="max-w-3xl mx-auto mt-10">
					<TimeSumCalculator />
				</div>

				{/* ── Footer ───────────────────────────────────────── */}
				<footer className="mt-16 pt-6 border-t border-border/40">
					<div className="flex flex-col sm:flex-row items-center justify-center gap-3 text-xs text-muted-foreground/60">
						<span>React + Vite + shadcn/ui</span>
						<Separator orientation="vertical" className="h-3 hidden sm:block opacity-40" />
						<span>Charts by Chart.js</span>
						<Separator orientation="vertical" className="h-3 hidden sm:block opacity-40" />
						<span>WakaTime API</span>
					</div>
				</footer>
			</div>
		</div>
	);
}

export default App;
