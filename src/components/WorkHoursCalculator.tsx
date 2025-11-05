import { useCallback, useEffect, useState } from 'react';
import { hasSavedData } from '../utils/storage';
import type { WorkHoursResult } from '../utils/timeUtils';
import { calcWorkHours, formatCurrency, formatMinutes } from '../utils/timeUtils';

interface WorkHoursCalculatorProps {
	onCalculate: (result: WorkHoursResult) => void;
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

export function WorkHoursCalculator({
	onCalculate,
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
}: WorkHoursCalculatorProps) {
	const [output, setOutput] = useState('Results will appear here');

	const handleCalculate = useCallback(() => {
		try {
			const rateValue = parseFloat(hourlyRate) || 0;
			const result = calcWorkHours(
				totalHours,
				completedHours,
				billingStart,
				billingEnd,
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
	}, [
		totalHours,
		completedHours,
		billingStart,
		billingEnd,
		skipSunday,
		skipSaturday,
		excludeToday,
		hourlyRate,
		onCalculate,
	]);

	// Auto-calculate on startup if data exists in localStorage
	useEffect(() => {
		if (hasSavedData()) {
			handleCalculate();
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []); // Only run once on mount

	return (
		<div>
			<p className="text-sm text-gray-600 mb-6">
				Calculate remaining work hours based on total required, completed hours, and billing period. Configure weekend
				skipping and see detailed breakdowns.
			</p>

			{/* Business Context Section (Shared across all modules) */}
			<div className="mb-6 p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
				<h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
					<span>💼</span>
					<span>Business Context (Shared across all modules)</span>
				</h3>
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
							value={totalHours}
							onChange={(e) => setTotalHours(e.target.value)}
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
							value={completedHours}
							onChange={(e) => setCompletedHours(e.target.value)}
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
							value={billingStart}
							onChange={(e) => setBillingStart(e.target.value)}
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
							value={billingEnd}
							onChange={(e) => setBillingEnd(e.target.value)}
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

			{/* Calculate Button */}
			<div className="flex justify-end mb-6">
				<button
					type="button"
					onClick={handleCalculate}
					className="bg-violet-600 hover:bg-violet-700 text-white px-6 py-2.5 rounded-lg font-medium shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 flex items-center gap-2">
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
		</div>
	);
}
