import { useCallback, useEffect, useState } from 'react';
import { hasSavedData, loadFormState, saveFormState } from '../utils/storage';
import type { WorkHoursResult } from '../utils/timeUtils';
import { calcWorkHours, formatCurrency, formatMinutes } from '../utils/timeUtils';

interface WorkHoursCalculatorProps {
	onCalculate: (result: WorkHoursResult) => void;
}

export function WorkHoursCalculator({ onCalculate }: WorkHoursCalculatorProps) {
	const savedState = loadFormState();
	const [total, setTotal] = useState(savedState.whTotal);
	const [completed, setCompleted] = useState(savedState.whCompleted);
	const [startDate, setStartDate] = useState(savedState.whStart);
	const [endDate, setEndDate] = useState(savedState.whEnd);
	const [skipSunday, setSkipSunday] = useState(savedState.whSun);
	const [skipSaturday, setSkipSaturday] = useState(savedState.whSat);
	const [excludeToday, setExcludeToday] = useState(savedState.whExcludeToday);
	const [hourlyRate, setHourlyRate] = useState(savedState.hourlyRate);
	const [output, setOutput] = useState('Results will appear here');

	// Save to localStorage whenever any input changes
	useEffect(() => {
		saveFormState({
			whTotal: total,
			whCompleted: completed,
			whStart: startDate,
			whEnd: endDate,
			whSun: skipSunday,
			whSat: skipSaturday,
			whExcludeToday: excludeToday,
			hourlyRate: hourlyRate,
		});
	}, [total, completed, startDate, endDate, skipSunday, skipSaturday, excludeToday, hourlyRate]);

	const handleCalculate = useCallback(() => {
		try {
			const rateValue = parseFloat(hourlyRate) || 0;
			const result = calcWorkHours(
				total,
				completed,
				startDate,
				endDate,
				skipSunday,
				skipSaturday,
				excludeToday,
				rateValue
			);

			const out = [];
			out.push('Total hours: ' + formatMinutes(result.total));
			out.push('Completed hours: ' + formatMinutes(result.completed));
			out.push('Remaining hours: ' + formatMinutes(result.remaining));
			out.push(`Billing period: ${result.billingStart.toDateString()} to ${result.billingEnd.toDateString()}`);
			out.push('Remaining days: ' + result.remainingDays);
			if (result.skipped.length) out.push('Skipped days: ' + result.skipped.join(', '));
			out.push(
				(result.workdays !== result.remainingDays ? 'Workdays (after exclusions): ' : 'Workdays: ') + result.workdays
			);
			out.push('Hours per day: ' + formatMinutes(result.perDay));

			if (rateValue > 0) {
				out.push('');
				out.push('💰 EARNINGS BREAKDOWN');
				out.push('Hourly rate: ' + formatCurrency(result.hourlyRate));
				out.push('Total earnings: ' + formatCurrency(result.totalEarnings));
				out.push('Completed earnings: ' + formatCurrency(result.completedEarnings));
				out.push('Remaining earnings: ' + formatCurrency(result.remainingEarnings));
				out.push('Earnings per day: ' + formatCurrency(result.earningsPerDay));
			}

			setOutput(out.join('\n'));
			onCalculate(result);
		} catch (e) {
			setOutput('Error: ' + (e instanceof Error ? e.message : String(e)));
		}
	}, [total, completed, startDate, endDate, skipSunday, skipSaturday, excludeToday, hourlyRate, onCalculate]);

	// Auto-calculate on startup if data exists in localStorage
	useEffect(() => {
		if (hasSavedData()) {
			handleCalculate();
		}
	}, [handleCalculate]);

	return (
		<section className="lg:col-span-2 bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 border border-gray-100 card-hover">
			<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-2">
				<div>
					<h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
						<span className="text-2xl">🧮</span>
						<span>Work Hours Calculator</span>
					</h2>
					<p className="text-xs text-gray-500 mt-1">Interactive / parameter-driven</p>
				</div>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				<div>
					<label htmlFor="wh-total" className="text-sm font-medium text-gray-700 block mb-1">
						📝 Total required hours
					</label>
					<input
						id="wh-total"
						type="text"
						className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-violet-500 focus:ring-2 focus:ring-violet-200 transition-all"
						placeholder="e.g., 160 hrs 0 mins"
						value={total}
						onChange={(e) => setTotal(e.target.value)}
					/>
				</div>
				<div>
					<label htmlFor="wh-completed" className="text-sm font-medium text-gray-700 block mb-1">
						✅ Completed hours
					</label>
					<input
						id="wh-completed"
						type="text"
						className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-violet-500 focus:ring-2 focus:ring-violet-200 transition-all"
						placeholder="e.g., 130 hrs 40 mins"
						value={completed}
						onChange={(e) => setCompleted(e.target.value)}
					/>
				</div>

				<div>
					<label htmlFor="wh-rate" className="text-sm font-medium text-gray-700 block mb-1">
						💰 Hourly rate (Rs/hr)
					</label>
					<input
						id="wh-rate"
						type="number"
						min="0"
						step="0.01"
						className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-violet-500 focus:ring-2 focus:ring-violet-200 transition-all"
						placeholder="e.g., 500"
						value={hourlyRate}
						onChange={(e) => setHourlyRate(e.target.value)}
					/>
				</div>

				<div>
					<label htmlFor="wh-start" className="text-sm font-medium text-gray-700 block mb-1">
						📅 Billing start
					</label>
					<input
						id="wh-start"
						type="date"
						className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-violet-500 focus:ring-2 focus:ring-violet-200 transition-all"
						value={startDate}
						onChange={(e) => setStartDate(e.target.value)}
					/>
				</div>
				<div>
					<label htmlFor="wh-end" className="text-sm font-medium text-gray-700 block mb-1">
						🏁 Billing end
					</label>
					<input
						id="wh-end"
						type="date"
						className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-violet-500 focus:ring-2 focus:ring-violet-200 transition-all"
						value={endDate}
						onChange={(e) => setEndDate(e.target.value)}
					/>
				</div>
			</div>

			<div className="flex gap-3 sm:gap-4 mt-6 items-center flex-wrap">
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
				<button
					type="button"
					onClick={handleCalculate}
					className="ml-auto bg-violet-600 hover:bg-violet-700 text-white px-6 py-2.5 rounded-lg font-medium shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 flex items-center gap-2">
					<span>Calculate</span>
					<span>→</span>
				</button>
			</div>

			<div className="mt-6 grid grid-cols-1 gap-4">
				<div className="bg-violet-50 rounded-lg p-4 border-2 border-violet-200">
					<div className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
						<span>📊</span>
						<span>Summary</span>
					</div>
					<pre
						className="text-sm mt-2 bg-white rounded p-4 whitespace-pre-wrap break-all text-gray-800 leading-loose border border-violet-300 shadow-sm"
						style={{
							fontFamily: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
							fontWeight: '500',
						}}>
						{output}
					</pre>
				</div>
			</div>
		</section>
	);
}
