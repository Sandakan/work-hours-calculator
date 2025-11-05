import { useCallback, useEffect, useState } from 'react';
import { loadFormState, saveFormState } from '../utils/storage';
import { formatMinutes, sumTimeStrings } from '../utils/timeUtils';

export function TimeSumCalculator() {
	const savedState = loadFormState();
	const [input, setInput] = useState(
		savedState.tsInput ||
			`37 hrs 56 mins
29 hrs 44 mins
41 hrs 1 min
48 hrs 13 min
17 hrs 43 min`
	);
	const [output, setOutput] = useState(savedState.tsOutput || 'Total time will appear here');

	// Save input to localStorage when it changes
	useEffect(() => {
		saveFormState({ tsInput: input, tsOutput: output });
	}, [input, output]);

	const handleSumTimes = useCallback(() => {
		try {
			const total = sumTimeStrings(input);
			setOutput(`Total: ${formatMinutes(total)}`);
		} catch (e) {
			setOutput('Error: ' + (e instanceof Error ? e.message : String(e)));
		}
	}, [input]);

	return (
		<section className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 mt-4 border border-gray-100 card-hover">
			<div className="mb-4">
				<h3 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
					<span className="text-2xl">⏱️</span>
					<span>Time Sum Calculator</span>
				</h3>
				<p className="text-xs text-gray-500 mt-1">Paste time strings (one per line) in the format "HH hrs MM mins".</p>
			</div>
			<textarea
				id="ts-input"
				rows={5}
				className="w-full rounded-lg border border-gray-300 p-4 text-sm focus:border-violet-500 focus:ring-2 focus:ring-violet-200 transition-all font-mono"
				placeholder="37 hrs 56 mins&#10;29 hrs 44 mins&#10;41 hrs 1 min"
				value={input}
				onChange={(e) => setInput(e.target.value)}
			/>
			<div className="flex gap-2 mt-4">
				<button
					type="button"
					id="ts-calc"
					onClick={handleSumTimes}
					className="bg-gray-800 hover:bg-gray-900 text-white px-6 py-2.5 rounded-lg font-medium shadow-md hover:shadow-lg transition-all duration-200 flex items-center gap-2">
					<span>➕</span>
					<span>Sum times</span>
				</button>
			</div>
			<pre
				id="ts-output"
				className="mt-4 text-base bg-white p-4 rounded-lg text-gray-800 border-2 border-violet-300 shadow-sm leading-relaxed"
				style={{ fontFamily: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif', fontWeight: '600' }}>
				{output}
			</pre>
		</section>
	);
}
