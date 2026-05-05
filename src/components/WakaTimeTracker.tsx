import { useCallback, useEffect, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import type { WakaTimeResult } from '../types/wakatime';
import {
	clearWakaTimeApiKey,
	loadFromCache,
	loadWakaTimeFormState,
	saveToCache,
	saveWakaTimeApiKey,
	saveWakaTimeFormState,
} from '../utils/storage';
import { fetchUserProjects, getProjectData, validateApiKey } from '../utils/wakatimeApi';

interface WakaTimeTrackerProps {
	onDataFetch: (result: WakaTimeResult, dailyData: Record<string, number>) => void;
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
	result: import('../utils/timeUtils').WorkHoursResult | null;
}

export function WakaTimeTracker({
	onDataFetch,
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
	result: calculatorResult,
}: WakaTimeTrackerProps) {
	const savedState = loadWakaTimeFormState();

	const [apiKey, setApiKey] = useState(savedState.apiKey);
	const [showApiKey, setShowApiKey] = useState(false);
	const [projectName, setProjectName] = useState(savedState.projectName);
	const [rememberApiKey, setRememberApiKey] = useState(savedState.rememberApiKey);
	const [loading, setLoading] = useState(false);
	const [validating, setValidating] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [result, setResult] = useState<WakaTimeResult | null>(null);
	const [projectSuggestions, setProjectSuggestions] = useState<string[]>([]);

	// Save form state whenever inputs change (except apiKey to avoid infinite loops)
	useEffect(() => {
		saveWakaTimeFormState({
			projectName,
			rememberApiKey,
		});
	}, [projectName, rememberApiKey]);

	// Handle API key storage separately
	useEffect(() => {
		if (rememberApiKey && apiKey) {
			saveWakaTimeApiKey(apiKey);
		} else if (!rememberApiKey) {
			clearWakaTimeApiKey();
		}
	}, [apiKey, rememberApiKey]);

	// Load projects when API key changes (debounced to avoid excessive calls)
	useEffect(() => {
		if (!apiKey || apiKey.length < 20) {
			return;
		}

		// Check cache first
		const cached = loadFromCache<string[]>('projects');
		if (cached) {
			setProjectSuggestions(cached);
			return;
		}

		// Debounce project fetching
		const timer = setTimeout(() => {
			fetchUserProjects(apiKey)
				.then((projects) => {
					setProjectSuggestions(projects);
					saveToCache('projects', projects, 30); // Cache for 30 minutes
				})
				.catch((err) => {
					// Silently fail for project suggestions
					console.warn('Could not fetch projects:', err);
					setProjectSuggestions([]);
				});
		}, 500);

		return () => clearTimeout(timer);
	}, [apiKey]);

	const handleValidateApiKey = async () => {
		if (!apiKey) {
			setError('Please enter an API key');
			return;
		}

		setValidating(true);
		setError(null);

		try {
			const isValid = await validateApiKey(apiKey);
			if (isValid) {
				setError(null);
				alert('✅ API key is valid!');
			} else {
				setError('Invalid API key. Please check your WakaTime settings.');
			}
		} catch {
			setError('Failed to validate API key. Please check your connection.');
		} finally {
			setValidating(false);
		}
	};

	const handleFetchData = useCallback(async () => {
		// Validation
		if (!apiKey) {
			setError('Please enter your WakaTime API key');
			return;
		}

		if (!projectName) {
			setError('Please enter a project name');
			return;
		}

		if (!billingStart || !billingEnd) {
			setError('Please select both start and end dates');
			return;
		}

		const start = new Date(billingStart);
		const end = new Date(billingEnd);

		if (end < start) {
			setError('End date must be after start date');
			return;
		}

		const today = new Date();
		today.setHours(0, 0, 0, 0);

		if (start > today) {
			setError('Start date cannot be in the future');
			return;
		}

		// Check for very large date ranges
		const daysDiff = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
		if (daysDiff > 90) {
			const proceed = confirm(
				'You selected a date range longer than 90 days. This may take a while. Continue?',
			);
			if (!proceed) return;
		}

		setLoading(true);
		setError(null);

		try {
			// Check cache
			const cacheKey = `${projectName}_${billingStart}_${billingEnd}`;
			const cached = loadFromCache<{
				result: WakaTimeResult;
				dailyData: Record<string, number>;
			}>(cacheKey);

			if (cached) {
				setResult(cached.result);
				// Update completed hours from WakaTime data
				const totalMinutes = cached.result.totalHours * 60 + cached.result.totalMinutes;
				setCompletedHours(`${Math.floor(totalMinutes / 60)} hrs ${totalMinutes % 60} mins`);
				onDataFetch(cached.result, cached.dailyData);
				setLoading(false);
				return;
			}

			const data = await getProjectData(
				{ apiKey },
				{
					projectName,
					startDate: billingStart,
					endDate: billingEnd,
				},
			);

			setResult(data.result);
			// Update completed hours from WakaTime data
			const totalMinutes = data.result.totalHours * 60 + data.result.totalMinutes;
			setCompletedHours(`${Math.floor(totalMinutes / 60)} hrs ${totalMinutes % 60} mins`);
			onDataFetch(data.result, data.dailyData);

			// Cache the result
			saveToCache(cacheKey, data, 5);

			setError(null);
		} catch (err) {
			if (err instanceof Error) {
				setError(err.message);
			} else {
				setError('Failed to fetch WakaTime data. Please try again.');
			}
			setResult(null);
		} finally {
			setLoading(false);
		}
	}, [apiKey, projectName, billingStart, billingEnd, onDataFetch, setCompletedHours]);

	return (
		<div className="flex flex-col gap-6">
			<p className="text-sm text-muted-foreground">
				Automatically track hours from WakaTime.com. Enter your API key, select a project and date
				range, then fetch your tracked time data.
			</p>

			<div className="flex flex-col gap-4">
				{/* Notices */}
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<Alert className="bg-muted/30 border-dashed py-3">
						<AlertTitle className="text-xs flex items-center gap-2">
							<span>🔒</span> Secure
						</AlertTitle>
						<AlertDescription className="text-xs text-muted-foreground mt-1">
							Your API key is stored locally in your browser. It is never sent to any third-party
							servers except WakaTime.
						</AlertDescription>
					</Alert>
					<Alert className="bg-primary/5 border-primary/10 py-3">
						<AlertTitle className="text-xs flex items-center gap-2">
							<span>✅</span> Proxy Active
						</AlertTitle>
						<AlertDescription className="text-xs text-muted-foreground mt-1">
							This app uses a server-side proxy to securely communicate with WakaTime API,
							eliminating CORS restrictions.
						</AlertDescription>
					</Alert>
				</div>

				{/* API Key Input */}
				<Card>
					<CardContent className="pt-6">
						<FieldGroup>
							<Field>
								<FieldLabel htmlFor="wt-api-key">🔑 WakaTime API Key</FieldLabel>
								<div className="flex gap-2">
									<div className="flex-1 relative">
										<Input
											id="wt-api-key"
											type={showApiKey ? 'text' : 'password'}
											placeholder="waka_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
											value={apiKey}
											onChange={(e) => setApiKey(e.target.value)}
										/>
										<button
											type="button"
											onClick={() => setShowApiKey(!showApiKey)}
											className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
										>
											{showApiKey ? '🙈' : '👁️'}
										</button>
									</div>
									<Button
										variant="outline"
										onClick={handleValidateApiKey}
										disabled={validating || !apiKey}
									>
										{validating ? 'Testing...' : 'Test'}
									</Button>
								</div>
								<div className="text-xs text-muted-foreground mt-1">
									Get your API key from{' '}
									<a
										href="https://wakatime.com/settings/account"
										target="_blank"
										rel="noopener noreferrer"
										className="text-primary hover:underline font-medium"
									>
										WakaTime Settings
									</a>
								</div>
							</Field>

							<Field orientation="horizontal">
								<Checkbox
									id="wt-remember"
									checked={rememberApiKey}
									onCheckedChange={(v) => setRememberApiKey(!!v)}
								/>
								<FieldLabel htmlFor="wt-remember" className="text-sm font-normal">
									Remember API key (stored locally)
								</FieldLabel>
							</Field>
						</FieldGroup>
					</CardContent>
				</Card>

				{/* Shared Business Context Fields */}
				<Card className="bg-muted/30 border-dashed">
					<CardHeader className="pb-3">
						<CardTitle className="text-sm font-semibold flex items-center gap-2">
							<span>📋</span>
							<span>Business Context (Shared)</span>
						</CardTitle>
					</CardHeader>
					<CardContent>
						<FieldGroup>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
								<Field>
									<FieldLabel htmlFor="wt-total">📝 Total required hours</FieldLabel>
									<Input
										id="wt-total"
										type="text"
										placeholder="e.g., 160 hrs 0 mins"
										value={totalHours}
										onChange={(e) => setTotalHours(e.target.value)}
									/>
								</Field>
								<Field>
									<FieldLabel htmlFor="wt-completed">✅ Completed (auto-filled)</FieldLabel>
									<Input
										id="wt-completed"
										type="text"
										value={completedHours}
										readOnly
										className="bg-muted"
									/>
								</Field>
								<Field>
									<FieldLabel htmlFor="wt-rate">💰 Hourly rate (Rs/hr)</FieldLabel>
									<Input
										id="wt-rate"
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
										<FieldLabel htmlFor="wt-billing-start">📅 Start</FieldLabel>
										<Input
											id="wt-billing-start"
											type="date"
											value={billingStart}
											onChange={(e) => setBillingStart(e.target.value)}
										/>
									</Field>
									<Field>
										<FieldLabel htmlFor="wt-billing-end">🏁 End</FieldLabel>
										<Input
											id="wt-billing-end"
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
										id="wt-skip-sun"
										checked={skipSunday}
										onCheckedChange={(v) => setSkipSunday(!!v)}
									/>
									<FieldLabel htmlFor="wt-skip-sun" className="text-sm font-normal">
										Skip Sundays
									</FieldLabel>
								</Field>
								<Field orientation="horizontal" className="w-auto">
									<Checkbox
										id="wt-skip-sat"
										checked={skipSaturday}
										onCheckedChange={(v) => setSkipSaturday(!!v)}
									/>
									<FieldLabel htmlFor="wt-skip-sat" className="text-sm font-normal">
										Skip Saturdays
									</FieldLabel>
								</Field>
								<Field orientation="horizontal" className="w-auto">
									<Checkbox
										id="wt-ex-today"
										checked={excludeToday}
										onCheckedChange={(v) => setExcludeToday(!!v)}
									/>
									<FieldLabel htmlFor="wt-ex-today" className="text-sm font-normal">
										Exclude today
									</FieldLabel>
								</Field>
							</div>
						</FieldGroup>
					</CardContent>
				</Card>

				{/* Calculation Summary - Inline if available */}
				{calculatorResult && (
					<Card className="bg-primary/5 border-primary/20">
						<CardHeader className="pb-3">
							<CardTitle className="text-sm font-semibold flex items-center gap-2">
								<span>📊</span>
								<span>Calculation Summary</span>
							</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
								<div>
									<div className="text-muted-foreground text-xs">Remaining</div>
									<div className="font-bold text-primary">
										{Math.floor(Math.max(0, calculatorResult.remaining) / 60)}h{' '}
										{Math.max(0, calculatorResult.remaining) % 60}m
									</div>
								</div>
								<div>
									<div className="text-muted-foreground text-xs">Workdays</div>
									<div className="font-bold">{calculatorResult.workdays}</div>
								</div>
								<div>
									<div className="text-muted-foreground text-xs">Per Day</div>
									<div className="font-bold">
										{Math.floor(calculatorResult.perDay / 60)}h{' '}
										{Math.floor(calculatorResult.perDay % 60)}m
									</div>
								</div>
								<div>
									<div className="text-muted-foreground text-xs">Progress</div>
									<div className="font-bold">
										{Math.round((calculatorResult.completed / calculatorResult.total) * 100)}%
									</div>
								</div>
							</div>
						</CardContent>
					</Card>
				)}

				{/* WakaTime Project Input */}
				<div className="flex flex-col sm:flex-row gap-4 items-end">
					<Field className="flex-1">
						<FieldLabel htmlFor="wt-project">📦 Project Name</FieldLabel>
						<Input
							id="wt-project"
							type="text"
							list="project-suggestions"
							placeholder="e.g., my-project"
							value={projectName}
							onChange={(e) => setProjectName(e.target.value)}
						/>
						{projectSuggestions.length > 0 && (
							<datalist id="project-suggestions">
								{projectSuggestions.map((proj) => (
									<option key={proj} value={proj} />
								))}
							</datalist>
						)}
					</Field>
					<Button
						onClick={handleFetchData}
						disabled={loading}
						size="lg"
						className="w-full sm:w-auto min-w-35"
					>
						{loading ? (
							<>
								<span className="animate-spin mr-2">⏳</span>
								Fetching...
							</>
						) : (
							<>
								Fetch Data
								<span className="ml-2">→</span>
							</>
						)}
					</Button>
				</div>

				{/* Error Display */}
				{error && (
					<Alert variant="destructive">
						<AlertTitle className="text-xs">Error</AlertTitle>
						<AlertDescription className="text-xs">{error}</AlertDescription>
					</Alert>
				)}

				{/* Results Display */}
				{result && (
					<Card className="border-primary/30">
						<CardHeader className="pb-3">
							<CardTitle className="text-sm font-semibold flex items-center gap-2">
								<span>📊</span>
								<span>WakaTime Analysis: {result.projectName}</span>
							</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
								<div className="space-y-4">
									<div className="grid grid-cols-2 gap-2 text-sm">
										<span className="text-muted-foreground">Total Time:</span>
										<span className="font-semibold">
											{result.digitalTime} ({result.totalHours}h {result.totalMinutes}m)
										</span>

										<span className="text-muted-foreground">Period:</span>
										<span className="font-medium">
											{result.startDate} to {result.endDate}
										</span>

										<span className="text-muted-foreground">Days with data:</span>
										<span className="font-medium">{result.daysWithData}</span>

										<span className="text-muted-foreground">Daily Avg:</span>
										<span className="font-medium text-primary">
											{result.averageHoursPerDay.toFixed(2)}h
										</span>
									</div>

									{parseFloat(hourlyRate) > 0 && (
										<div className="bg-primary/5 rounded-lg p-3 border border-primary/10">
											<div className="text-xs font-semibold text-primary mb-2 uppercase tracking-wider">
												Earnings Estimation
											</div>
											<div className="grid grid-cols-2 gap-1 text-sm">
												<span className="text-muted-foreground">Total:</span>
												<span className="font-bold">
													Rs{' '}
													{(
														result.totalHours * parseFloat(hourlyRate) +
														(result.totalMinutes / 60) * parseFloat(hourlyRate)
													).toFixed(2)}
												</span>
												<span className="text-muted-foreground">Daily:</span>
												<span className="font-medium">
													Rs {(result.averageHoursPerDay * parseFloat(hourlyRate)).toFixed(2)}
												</span>
											</div>
										</div>
									)}
								</div>

								<div className="space-y-4">
									{result.languages.length > 0 && (
										<div>
											<div className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
												Top Languages
											</div>
											<div className="flex flex-wrap gap-2">
												{result.languages.slice(0, 5).map((lang) => (
													<Badge
														key={lang.name}
														variant="secondary"
														className="flex flex-col items-start gap-0.5 py-1.5 px-3"
													>
														<span className="font-bold">{lang.name}</span>
														<span className="text-[10px] opacity-70">
															{lang.hours.toFixed(1)}h ({lang.percent.toFixed(0)}%)
														</span>
													</Badge>
												))}
											</div>
										</div>
									)}

									{result.editors.length > 0 && (
										<div>
											<div className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
												IDE Usage
											</div>
											<div className="flex flex-wrap gap-2">
												{result.editors.map((editor) => (
													<Badge key={editor.name} variant="outline" className="text-xs">
														{editor.name}
													</Badge>
												))}
											</div>
										</div>
									)}
								</div>
							</div>
						</CardContent>
					</Card>
				)}
			</div>
		</div>
	);
}
