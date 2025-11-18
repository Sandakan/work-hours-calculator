import { useCallback, useEffect, useState } from 'react';
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
			const proceed = confirm('You selected a date range longer than 90 days. This may take a while. Continue?');
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
				}
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
		<div>
			<p className="text-sm text-gray-600 mb-6">
				Automatically track hours from WakaTime.com. Enter your API key, select a project and date range, then fetch
				your tracked time data.
			</p>
			{/* Security Notice */}
			<div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
				<p className="text-xs text-yellow-800 flex items-center gap-2">
					<span>🔒</span>
					<span>
						Your API key is stored locally in your browser. It is never sent to any third-party servers except WakaTime.
					</span>
				</p>
			</div>
			{/* Proxy Active Notice */}
			<div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-3">
				<p className="text-xs text-green-800 flex items-center gap-2">
					<span>✅</span>
					<span>
						<strong>Proxy Active:</strong> This app uses a server-side proxy to securely communicate with WakaTime API,
						eliminating CORS restrictions. Your API key is sent only to WakaTime through our secure proxy.
					</span>
				</p>
			</div>
			{/* API Key Input */}
			<div className="mb-4">
				<label htmlFor="wt-api-key" className="text-sm font-medium text-gray-700 block mb-1">
					🔑 WakaTime API Key (Secret Key)
				</label>
				<div className="flex gap-2">
					<div className="flex-1 relative">
						<input
							id="wt-api-key"
							type={showApiKey ? 'text' : 'password'}
							className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-violet-500 focus:ring-2 focus:ring-violet-200 transition-all"
							placeholder="waka_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
							value={apiKey}
							onChange={(e) => setApiKey(e.target.value)}
						/>
						<button
							type="button"
							onClick={() => setShowApiKey(!showApiKey)}
							className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 text-xs">
							{showApiKey ? '🙈' : '👁️'}
						</button>
					</div>
					<button
						type="button"
						onClick={handleValidateApiKey}
						disabled={validating || !apiKey}
						className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-all">
						{validating ? 'Testing...' : 'Test'}
					</button>
				</div>
				<p className="text-xs text-gray-500 mt-1">
					Get your API key from{' '}
					<a
						href="https://wakatime.com/settings/account"
						target="_blank"
						rel="noopener noreferrer"
						className="text-violet-600 hover:underline">
						WakaTime Settings
					</a>
				</p>
			</div>
			{/* Remember API Key Checkbox */}
			<div className="mb-4">
				<label className="inline-flex items-center gap-2 cursor-pointer group">
					<input
						type="checkbox"
						className="rounded w-4 h-4 text-violet-600 border-gray-300 focus:ring-violet-500 cursor-pointer"
						checked={rememberApiKey}
						onChange={(e) => setRememberApiKey(e.target.checked)}
					/>
					<span className="text-sm text-gray-600 group-hover:text-gray-900 transition-colors">
						Remember API key (stored locally)
					</span>
				</label>
			</div>
			{/* Shared Business Context Fields */}
			<div className="mb-4 bg-violet-50 rounded-lg p-4 border border-violet-200">
				<h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
					<span>📋</span>
					<span>Business Context (Shared across all modules)</span>
				</h4>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
					<div>
						<label htmlFor="wt-total" className="text-sm font-medium text-gray-700 block mb-1">
							� Total required hours
						</label>
						<input
							id="wt-total"
							type="text"
							placeholder="e.g., 160 hrs 0 mins"
							className="block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-violet-500 focus:ring-2 focus:ring-violet-200 transition-all bg-white"
							value={totalHours}
							onChange={(e) => setTotalHours(e.target.value)}
						/>
					</div>
					<div>
						<label htmlFor="wt-completed" className="text-sm font-medium text-gray-700 block mb-1">
							✅ Completed hours (auto-filled from WakaTime)
						</label>
						<input
							id="wt-completed"
							type="text"
							placeholder="Will be calculated from WakaTime"
							className="block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-violet-500 focus:ring-2 focus:ring-violet-200 transition-all bg-gray-100"
							value={completedHours}
							readOnly
						/>
					</div>
					<div>
						<label htmlFor="wt-rate" className="text-sm font-medium text-gray-700 block mb-1">
							💰 Hourly rate (Rs/hr)
						</label>
						<input
							id="wt-rate"
							type="number"
							min="0"
							step="0.01"
							placeholder="e.g., 500"
							className="block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-violet-500 focus:ring-2 focus:ring-violet-200 transition-all bg-white"
							value={hourlyRate}
							onChange={(e) => setHourlyRate(e.target.value)}
						/>
					</div>
					<div>
						<label htmlFor="wt-billing-start" className="text-sm font-medium text-gray-700 block mb-1">
							📅 Billing start
						</label>
						<input
							id="wt-billing-start"
							type="date"
							className="block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-violet-500 focus:ring-2 focus:ring-violet-200 transition-all bg-white"
							value={billingStart}
							onChange={(e) => setBillingStart(e.target.value)}
						/>
					</div>
					<div>
						<label htmlFor="wt-billing-end" className="text-sm font-medium text-gray-700 block mb-1">
							🏁 Billing end
						</label>
						<input
							id="wt-billing-end"
							type="date"
							className="block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-violet-500 focus:ring-2 focus:ring-violet-200 transition-all bg-white"
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
			{/* Summary Display */}
			{calculatorResult && (
				<div className="mb-4 bg-green-50 rounded-lg p-4 border-2 border-green-200">
					<h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
						<span>📊</span>
						<span>Calculation Summary</span>
					</h4>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
						<div className="flex justify-between">
							<span className="text-gray-600">Total hours:</span>
							<span className="font-medium">
								{Math.floor(calculatorResult.total / 60)} hrs {calculatorResult.total % 60} mins
							</span>
						</div>
						<div className="flex justify-between">
							<span className="text-gray-600">Completed hours:</span>
							<span className="font-medium">
								{Math.floor(calculatorResult.completed / 60)} hrs {calculatorResult.completed % 60} mins
							</span>
						</div>
						<div className="flex justify-between">
							<span className="text-gray-600">Remaining hours:</span>
							<span className="font-medium">
								{Math.floor(Math.max(0, calculatorResult.remaining) / 60)} hrs{' '}
								{Math.max(0, calculatorResult.remaining) % 60} mins
							</span>
						</div>
						<div className="flex justify-between">
							<span className="text-gray-600">Billing period:</span>
							<span className="font-medium">
								{calculatorResult.billingStart.toLocaleDateString()} to{' '}
								{calculatorResult.billingEnd.toLocaleDateString()}
							</span>
						</div>
						<div className="flex justify-between">
							<span className="text-gray-600">Remaining days:</span>
							<span className="font-medium">{calculatorResult.remainingDays}</span>
						</div>
						<div className="flex justify-between">
							<span className="text-gray-600">Workdays:</span>
							<span className="font-medium">{calculatorResult.workdays}</span>
						</div>
						<div className="flex justify-between col-span-1 md:col-span-2">
							<span className="text-gray-600">Hours per day:</span>
							<span className="font-medium">
								{Math.floor(calculatorResult.perDay / 60)} hrs {calculatorResult.perDay % 60} mins
							</span>
						</div>
					</div>
				</div>
			)}
			{/* WakaTime Project Input */}
			<div className="mb-4">
				<label htmlFor="wt-project" className="text-sm font-medium text-gray-700 block mb-1">
					📦 Project Name
				</label>
				<input
					id="wt-project"
					type="text"
					list="project-suggestions"
					className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-violet-500 focus:ring-2 focus:ring-violet-200 transition-all"
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
			</div>{' '}
			{/* Fetch Button */}
			<div className="flex justify-end mb-4">
				<button
					type="button"
					onClick={handleFetchData}
					disabled={loading}
					className="bg-violet-600 hover:bg-violet-700 disabled:bg-gray-400 text-white px-6 py-2.5 rounded-lg font-medium shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 flex items-center gap-2">
					{loading ? (
						<>
							<span className="animate-spin">⏳</span>
							<span>Fetching...</span>
						</>
					) : (
						<>
							<span>Fetch Data</span>
							<span>→</span>
						</>
					)}
				</button>
			</div>
			{/* Error Display */}
			{error && (
				<div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
					<p className="text-sm text-red-800 flex items-center gap-2">
						<span>❌</span>
						<span>{error}</span>
					</p>
				</div>
			)}
			{/* Results Display */}
			{result && (
				<div className="bg-violet-50 rounded-lg p-4 border-2 border-violet-200">
					<div className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
						<span>📊</span>
						<span>WakaTime Summary</span>
					</div>
					<div className="bg-white rounded p-4 border border-violet-300 shadow-sm">
						<div className="space-y-2 text-sm">
							<p>
								<strong>Project:</strong> {result.projectName}
							</p>
							<p>
								<strong>Total Time:</strong> {result.digitalTime} ({result.totalHours} hours {result.totalMinutes}{' '}
								minutes)
							</p>
							<p>
								<strong>Period:</strong> {result.startDate} to {result.endDate}
							</p>
							<p>
								<strong>Days with data:</strong> {result.daysWithData}
							</p>
							<p>
								<strong>Average per day:</strong> {result.averageHoursPerDay.toFixed(2)} hours
							</p>
							{result.mostProductiveDay && (
								<p>
									<strong>Most productive day:</strong> {result.mostProductiveDay.date} (
									{result.mostProductiveDay.hours.toFixed(2)} hours)
								</p>
							)}

							{parseFloat(hourlyRate) > 0 && (
								<>
									<div className="mt-4 pt-4 border-t border-violet-200">
										<p className="font-semibold text-violet-700 mb-2">💰 EARNINGS BREAKDOWN</p>
									</div>
									<p>
										<strong>Hourly rate:</strong> Rs {parseFloat(hourlyRate).toFixed(2)}
									</p>
									<p>
										<strong>Total earnings:</strong> Rs{' '}
										{(
											result.totalHours * parseFloat(hourlyRate) +
											(result.totalMinutes / 60) * parseFloat(hourlyRate)
										).toFixed(2)}
									</p>
									<p>
										<strong>Average per day:</strong> Rs{' '}
										{(result.averageHoursPerDay * parseFloat(hourlyRate)).toFixed(2)}
									</p>
								</>
							)}

							{result.languages.length > 0 && (
								<div className="mt-4">
									<strong>Languages:</strong>
									<ul className="ml-4 mt-1">
										{result.languages.slice(0, 5).map((lang) => (
											<li key={lang.name}>
												{lang.name}: {lang.hours.toFixed(2)}h ({lang.percent.toFixed(1)}%)
											</li>
										))}
									</ul>
								</div>
							)}

							{result.editors.length > 0 && (
								<div className="mt-4">
									<strong>Editors:</strong>
									<ul className="ml-4 mt-1">
										{result.editors.map((editor) => (
											<li key={editor.name}>
												{editor.name}: {editor.hours.toFixed(2)}h ({editor.percent.toFixed(1)}%)
											</li>
										))}
									</ul>
								</div>
							)}
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
