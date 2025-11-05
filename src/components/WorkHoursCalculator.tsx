import { useCallback, useEffect, useState } from 'react';
import type { WorkHoursResult } from '../utils/timeUtils';
import { calcWorkHours, formatMinutes } from '../utils/timeUtils';
import { loadFormState, saveFormState } from '../utils/storage';

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
		});
	}, [total, completed, startDate, endDate, skipSunday, skipSaturday, excludeToday]);

	const handleCalculate = useCallback(() => {
		try {
			const result = calcWorkHours(total, completed, startDate, endDate, skipSunday, skipSaturday, excludeToday);

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

			setOutput(out.join('\n'));
			onCalculate(result);
		} catch (e) {
			setOutput('Error: ' + (e instanceof Error ? e.message : String(e)));
		}
	}, [total, completed, startDate, endDate, skipSunday, skipSaturday, excludeToday, onCalculate]);

	return (
		<section className="lg:col-span-2 bg-white rounded-lg shadow p-6">
			<div className="flex items-center justify-between mb-4">
				<h2 className="text-lg font-medium">Work Hours Calculator</h2>
				<div className="text-sm muted">Interactive / parameter-driven</div>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				<div>
					<label htmlFor="wh-total" className="text-sm muted">
						Total required hours
					</label>
					<input
						id="wh-total"
						type="text"
						className="mt-1 block w-full rounded-md border px-3 py-2"
						value={total}
						onChange={(e) => setTotal(e.target.value)}
					/>
				</div>
				<div>
					<label htmlFor="wh-completed" className="text-sm muted">
						Completed hours
					</label>
					<input
						id="wh-completed"
						type="text"
						className="mt-1 block w-full rounded-md border px-3 py-2"
						value={completed}
						onChange={(e) => setCompleted(e.target.value)}
					/>
				</div>

				<div>
					<label htmlFor="wh-start" className="text-sm muted">
						Billing start
					</label>
					<input
						id="wh-start"
						type="date"
						className="mt-1 block w-full rounded-md border px-3 py-2"
						value={startDate}
						onChange={(e) => setStartDate(e.target.value)}
					/>
				</div>
				<div>
					<label htmlFor="wh-end" className="text-sm muted">
						Billing end
					</label>
					<input
						id="wh-end"
						type="date"
						className="mt-1 block w-full rounded-md border px-3 py-2"
						value={endDate}
						onChange={(e) => setEndDate(e.target.value)}
					/>
				</div>
			</div>

			<div className="flex gap-4 mt-4 items-center flex-wrap">
				<label className="inline-flex items-center gap-2">
					<input
						type="checkbox"
						className="rounded"
						checked={skipSunday}
						onChange={(e) => setSkipSunday(e.target.checked)}
					/>
					<span className="muted">Skip Sundays</span>
				</label>
				<label className="inline-flex items-center gap-2">
					<input
						type="checkbox"
						className="rounded"
						checked={skipSaturday}
						onChange={(e) => setSkipSaturday(e.target.checked)}
					/>
					<span className="muted">Skip Saturdays</span>
				</label>
				<label className="inline-flex items-center gap-2">
					<input
						type="checkbox"
						className="rounded"
						checked={excludeToday}
						onChange={(e) => setExcludeToday(e.target.checked)}
					/>
					<span className="muted">Exclude today</span>
				</label>
				<button
					type="button"
					onClick={handleCalculate}
					className="ml-auto bg-violet-600 text-white px-4 py-2 rounded hover:bg-violet-700">
					Calculate
				</button>
			</div>

			<div className="mt-6 grid grid-cols-1 gap-4">
				<div className="bg-gray-50 rounded p-4">
					<div className="text-sm muted">Summary</div>
					<pre className="text-sm mt-2 bg-transparent p-0 whitespace-pre-wrap break-all">{output}</pre>
				</div>
			</div>
		</section>
	);
}
