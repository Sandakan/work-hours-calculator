import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
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
				rateValue,
			);

			const out = [];
			out.push('Total hours: ' + formatMinutes(result.total));
			out.push('Completed hours: ' + formatMinutes(result.completed));
			out.push('Remaining hours: ' + formatMinutes(result.remaining));
			out.push(
				`Billing period: ${result.billingStart.toDateString()} to ${result.billingEnd.toDateString()}`,
			);
			out.push('Remaining days: ' + result.remainingDays);
			if (result.skipped.length) out.push('Skipped days: ' + result.skipped.join(', '));
			out.push(
				(result.workdays !== result.remainingDays
					? 'Workdays (after exclusions): '
					: 'Workdays: ') + result.workdays,
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
		<div className="flex flex-col gap-6">
			<p className="text-sm text-muted-foreground">
				Calculate remaining work hours based on total required, completed hours, and billing period.
				Configure weekend skipping and see detailed breakdowns.
			</p>

			{/* Business Context Section (Shared across all modules) */}
			<Card className="bg-muted/30 border-dashed">
				<CardHeader className="pb-3">
					<CardTitle className="text-sm font-semibold flex items-center gap-2">
						<span>💼</span>
						<span>Business Context (Shared)</span>
					</CardTitle>
				</CardHeader>
				<CardContent>
					<FieldGroup>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
							<Field>
								<FieldLabel htmlFor="wh-total">📝 Total required hours</FieldLabel>
								<Input
									id="wh-total"
									type="text"
									placeholder="e.g., 160 hrs 0 mins"
									value={totalHours}
									onChange={(e) => setTotalHours(e.target.value)}
								/>
							</Field>
							<Field>
								<FieldLabel htmlFor="wh-completed">✅ Completed hours</FieldLabel>
								<Input
									id="wh-completed"
									type="text"
									placeholder="e.g., 130 hrs 40 mins"
									value={completedHours}
									onChange={(e) => setCompletedHours(e.target.value)}
								/>
							</Field>
							<Field>
								<FieldLabel htmlFor="wh-rate">💰 Hourly rate (Rs/hr)</FieldLabel>
								<Input
									id="wh-rate"
									type="number"
									min="0"
									step="0.01"
									placeholder="e.g., 500"
									value={hourlyRate}
									onChange={(e) => setHourlyRate(e.target.value)}
								/>
							</Field>
							<div className="grid grid-cols-2 gap-4">
								<Field>
									<FieldLabel htmlFor="wh-start">📅 Start</FieldLabel>
									<Input
										id="wh-start"
										type="date"
										value={billingStart}
										onChange={(e) => setBillingStart(e.target.value)}
									/>
								</Field>
								<Field>
									<FieldLabel htmlFor="wh-end">🏁 End</FieldLabel>
									<Input
										id="wh-end"
										type="date"
										value={billingEnd}
										onChange={(e) => setBillingEnd(e.target.value)}
									/>
								</Field>
							</div>
						</div>

						{/* Weekend and Today Options */}
						<div className="flex gap-4 items-center flex-wrap pt-2">
							<Field orientation="horizontal" className="w-auto">
								<Checkbox
									id="skip-sun"
									checked={skipSunday}
									onCheckedChange={(v) => setSkipSunday(!!v)}
								/>
								<FieldLabel htmlFor="skip-sun" className="text-sm font-normal">
									Skip Sundays
								</FieldLabel>
							</Field>
							<Field orientation="horizontal" className="w-auto">
								<Checkbox
									id="skip-sat"
									checked={skipSaturday}
									onCheckedChange={(v) => setSkipSaturday(!!v)}
								/>
								<FieldLabel htmlFor="skip-sat" className="text-sm font-normal">
									Skip Saturdays
								</FieldLabel>
							</Field>
							<Field orientation="horizontal" className="w-auto">
								<Checkbox
									id="ex-today"
									checked={excludeToday}
									onCheckedChange={(v) => setExcludeToday(!!v)}
								/>
								<FieldLabel htmlFor="ex-today" className="text-sm font-normal">
									Exclude today
								</FieldLabel>
							</Field>
						</div>
					</FieldGroup>
				</CardContent>
			</Card>

			{/* Calculate Button */}
			<div className="flex justify-end">
				<Button onClick={handleCalculate} size="lg" className="w-full sm:w-auto">
					Calculate
					<span className="ml-2">→</span>
				</Button>
			</div>

			<Card className="bg-primary/5 border-primary/20">
				<CardHeader className="pb-3">
					<CardTitle className="text-sm font-semibold flex items-center gap-2">
						<span>📊</span>
						<span>Summary</span>
					</CardTitle>
				</CardHeader>
				<CardContent>
					<pre className="text-sm bg-background/50 rounded-md p-4 whitespace-pre-wrap break-all leading-loose font-medium border">
						{output}
					</pre>
				</CardContent>
			</Card>
		</div>
	);
}
