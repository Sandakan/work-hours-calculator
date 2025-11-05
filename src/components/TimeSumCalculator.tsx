import { useCallback, useEffect, useState } from 'react';
import { formatMinutes, sumTimeStrings } from '../utils/timeUtils';
import { loadFormState, saveFormState } from '../utils/storage';

export function TimeSumCalculator() {
	const savedState = loadFormState();
	const [input, setInput] = useState(savedState.tsInput || `37 hrs 56 mins
29 hrs 44 mins
41 hrs 1 min
48 hrs 13 min
17 hrs 43 min`);
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
		<section className="bg-white rounded-lg shadow p-6 mt-4">
			<h3 className="text-md font-medium mb-2">Time Sum (submodule)</h3>
			<p className="muted text-sm mb-2">Paste time strings (one per line) in the format "HH hrs MM mins".</p>
			<textarea
				id="ts-input"
				rows={4}
				className="w-full rounded-md border p-2"
				value={input}
				onChange={(e) => setInput(e.target.value)}
			/>
			<div className="flex gap-2 mt-3">
				<button
					type="button"
					id="ts-calc"
					onClick={handleSumTimes}
					className="bg-gray-800 text-white px-3 py-1 rounded hover:bg-gray-900">
					Sum times
				</button>
			</div>
			<pre id="ts-output" className="mt-3 text-sm bg-gray-50 p-3 rounded">
				{output}
			</pre>
		</section>
	);
}
