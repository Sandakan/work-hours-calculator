import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
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
17 hrs 43 min`,
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
		<Card className="shadow-lg hover:shadow-xl transition-all duration-300">
			<CardHeader>
				<CardTitle className="text-xl font-semibold flex items-center gap-2">
					<span className="text-2xl">⏱️</span>
					<span>Time Sum Calculator</span>
				</CardTitle>
			</CardHeader>
			<CardContent className="flex flex-col gap-6">
				<FieldGroup>
					<Field>
						<FieldLabel htmlFor="ts-input">Input Time Strings</FieldLabel>
						<textarea
							id="ts-input"
							rows={5}
							className="flex min-h-30 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 font-mono"
							placeholder="37 hrs 56 mins&#10;29 hrs 44 mins&#10;41 hrs 1 min"
							value={input}
							onChange={(e) => setInput(e.target.value)}
						/>
						<FieldDescription>
							Paste time strings (one per line) in the format "HH hrs MM mins".
						</FieldDescription>
					</Field>
				</FieldGroup>

				<div className="flex justify-start">
					<Button onClick={handleSumTimes} variant="default" className="gap-2">
						<span>➕</span>
						<span>Sum times</span>
					</Button>
				</div>

				<div className="bg-muted/50 rounded-lg p-4 border border-dashed">
					<pre
						id="ts-output"
						className="text-lg font-bold text-primary text-center"
						style={{
							fontFamily: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
						}}
					>
						{output}
					</pre>
				</div>
			</CardContent>
		</Card>
	);
}
