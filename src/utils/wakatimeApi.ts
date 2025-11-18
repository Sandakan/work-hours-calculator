import type {
	WakaTimeConfig,
	WakaTimeProjectRequest,
	WakaTimeProjectsResponse,
	WakaTimeResult,
	WakaTimeSummary,
} from '../types/wakatime';

// Use proxy in both development (Vite) and production (Netlify Edge Function)
const BASE_URL = '/api/wakatime';

/**
 * Creates Basic Auth header for WakaTime API
 * API key is used as username, password is empty
 */
function createAuthHeader(apiKey: string): string {
	return 'Basic ' + btoa(apiKey + ':');
}

/**
 * Validates if an API key is valid by making a test request
 * @param apiKey - WakaTime API secret key
 * @returns Promise<boolean> - true if valid, false otherwise
 */
export async function validateApiKey(apiKey: string): Promise<boolean> {
	try {
		const response = await fetch(`${BASE_URL}/users/current`, {
			method: 'GET',
			headers: {
				Authorization: createAuthHeader(apiKey),
			},
			mode: 'cors',
		});

		return response.ok;
	} catch (error) {
		console.error('API key validation error:', error);
		// Check if it's a CORS error
		if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
			throw new Error(
				'CORS Error: WakaTime API cannot be accessed directly from the browser. You may need to use a proxy server or the WakaTime browser extension instead.'
			);
		}
		return false;
	}
}

/**
 * Fetches list of user's projects from WakaTime
 * @param apiKey - WakaTime API secret key
 * @returns Promise<string[]> - Array of project names
 */
export async function fetchUserProjects(apiKey: string): Promise<string[]> {
	try {
		const response = await fetch(`${BASE_URL}/users/current/projects`, {
			headers: {
				Authorization: createAuthHeader(apiKey),
			},
		});

		if (!response.ok) {
			throw new Error(`Failed to fetch projects: ${response.statusText}`);
		}

		const data: WakaTimeProjectsResponse = await response.json();
		return data.data.map((project) => project.name);
	} catch (error) {
		console.error('Error fetching projects:', error);
		throw error;
	}
}

/**
 * Formats date to YYYY-MM-DD format required by WakaTime API
 */
function formatDateForApi(date: string): string {
	const d = new Date(date);
	return d.toISOString().split('T')[0];
}

/**
 * Fetches project summary data from WakaTime API
 * @param config - WakaTime configuration
 * @param request - Project request parameters
 * @returns Promise<WakaTimeSummary> - Summary data
 * @throws {Error} When API key is invalid or project not found
 */
export async function fetchProjectSummary(
	config: WakaTimeConfig,
	request: WakaTimeProjectRequest
): Promise<WakaTimeSummary> {
	const baseUrl = config.baseUrl || BASE_URL;
	const startDate = formatDateForApi(request.startDate);
	const endDate = formatDateForApi(request.endDate);

	const url = `${baseUrl}/users/current/summaries?start=${startDate}&end=${endDate}&project=${encodeURIComponent(
		request.projectName
	)}`;

	try {
		const response = await fetch(url, {
			method: 'GET',
			headers: {
				Authorization: createAuthHeader(config.apiKey),
			},
			mode: 'cors',
		});

		if (!response.ok) {
			if (response.status === 401) {
				throw new Error('Invalid API key. Please check your WakaTime API key.');
			} else if (response.status === 404) {
				throw new Error(`Project "${request.projectName}" not found.`);
			} else if (response.status === 429) {
				throw new Error('Rate limit exceeded. Please wait a few minutes and try again.');
			} else {
				throw new Error(`API error: ${response.statusText}`);
			}
		}

		const data: WakaTimeSummary = await response.json();

		// Log response for debugging
		console.log('WakaTime API Response:', data);

		return data;
	} catch (error) {
		if (error instanceof Error) {
			// Check if it's a CORS error
			if (error.message.includes('Failed to fetch') || error.name === 'TypeError') {
				throw new Error(
					'⚠️ CORS Error: WakaTime API blocks direct browser access. This feature requires a backend proxy server to work properly. For now, please use the WakaTime dashboard directly at wakatime.com'
				);
			}
			throw error;
		}
		throw new Error('Failed to fetch WakaTime data. Please check your connection.');
	}
}

/**
 * Calculates daily breakdown from WakaTime summary
 * @param data - WakaTime summary data
 * @returns Record<string, number> - Map of date to hours
 */
export function calculateDailyBreakdown(data: WakaTimeSummary): Record<string, number> {
	const dailyData: Record<string, number> = {};

	if (!data || !data.data || !Array.isArray(data.data)) {
		return dailyData;
	}

	for (const day of data.data) {
		// Safely access date
		const dateStr = day.range?.date || day.range?.start || '';
		if (!dateStr) continue;

		// When API is called with ?project= parameter, it filters the response
		// So grand_total contains the total for that project
		if (day.grand_total && typeof day.grand_total.total_seconds === 'number') {
			// Convert seconds to hours (as decimal)
			dailyData[dateStr] = day.grand_total.total_seconds / 3600;
		} else {
			dailyData[dateStr] = 0;
		}
	}

	return dailyData;
}

/**
 * Aggregates language statistics across all days
 */
function aggregateLanguages(data: WakaTimeSummary): Array<{ name: string; hours: number; percent: number }> {
	const languageMap = new Map<string, number>();
	let totalSeconds = 0;

	if (!data || !data.data || !Array.isArray(data.data)) {
		return [];
	}

	for (const day of data.data) {
		if (!day.languages || !Array.isArray(day.languages)) {
			continue;
		}

		for (const lang of day.languages) {
			const current = languageMap.get(lang.name) || 0;
			languageMap.set(lang.name, current + lang.total_seconds);
			totalSeconds += lang.total_seconds;
		}
	}

	const languages = Array.from(languageMap.entries()).map(([name, seconds]) => ({
		name,
		hours: seconds / 3600,
		percent: totalSeconds > 0 ? (seconds / totalSeconds) * 100 : 0,
	}));

	// Sort by hours descending
	return languages.sort((a, b) => b.hours - a.hours);
}

/**
 * Aggregates editor statistics across all days
 */
function aggregateEditors(data: WakaTimeSummary): Array<{ name: string; hours: number; percent: number }> {
	const editorMap = new Map<string, number>();
	let totalSeconds = 0;

	if (!data || !data.data || !Array.isArray(data.data)) {
		return [];
	}

	for (const day of data.data) {
		if (!day.editors || !Array.isArray(day.editors)) {
			continue;
		}

		for (const editor of day.editors) {
			const current = editorMap.get(editor.name) || 0;
			editorMap.set(editor.name, current + editor.total_seconds);
			totalSeconds += editor.total_seconds;
		}
	}

	const editors = Array.from(editorMap.entries()).map(([name, seconds]) => ({
		name,
		hours: seconds / 3600,
		percent: totalSeconds > 0 ? (seconds / totalSeconds) * 100 : 0,
	}));

	return editors.sort((a, b) => b.hours - a.hours);
}

/**
 * Aggregates operating system statistics across all days
 */
function aggregateOperatingSystems(data: WakaTimeSummary): Array<{ name: string; hours: number; percent: number }> {
	const osMap = new Map<string, number>();
	let totalSeconds = 0;

	if (!data || !data.data || !Array.isArray(data.data)) {
		return [];
	}

	for (const day of data.data) {
		if (!day.operating_systems || !Array.isArray(day.operating_systems)) {
			continue;
		}

		for (const os of day.operating_systems) {
			const current = osMap.get(os.name) || 0;
			osMap.set(os.name, current + os.total_seconds);
			totalSeconds += os.total_seconds;
		}
	}

	const systems = Array.from(osMap.entries()).map(([name, seconds]) => ({
		name,
		hours: seconds / 3600,
		percent: totalSeconds > 0 ? (seconds / totalSeconds) * 100 : 0,
	}));

	return systems.sort((a, b) => b.hours - a.hours);
}

/**
 * Finds the most productive day in the dataset
 */
function findMostProductiveDay(dailyData: Record<string, number>): { date: string; hours: number } | null {
	const entries = Object.entries(dailyData);
	if (entries.length === 0) return null;

	const maxEntry = entries.reduce((max, current) => (current[1] > max[1] ? current : max));

	return {
		date: maxEntry[0],
		hours: maxEntry[1],
	};
}

/**
 * Parses WakaTime API response into application format
 * @param data - Raw WakaTime summary data
 * @param projectName - Name of the project
 * @returns WakaTimeResult - Parsed and formatted result
 */
export function parseWakaTimeResponse(data: WakaTimeSummary, projectName: string): WakaTimeResult {
	let totalSeconds = 0;
	let daysWithData = 0;

	// Validate data structure
	if (!data || !data.data || !Array.isArray(data.data)) {
		throw new Error('Invalid API response structure');
	}

	// When API is called with ?project= parameter, it filters the response
	// So each day's grand_total contains the total for that project
	for (const day of data.data) {
		if (day.grand_total && typeof day.grand_total.total_seconds === 'number') {
			const daySeconds = day.grand_total.total_seconds;
			if (daySeconds > 0) {
				totalSeconds += daySeconds;
				daysWithData++;
			}
		}
	}

	const totalHours = Math.floor(totalSeconds / 3600);
	const totalMinutes = Math.floor((totalSeconds % 3600) / 60);
	const digitalTime = `${totalHours}h ${totalMinutes}m`;

	const dailyData = calculateDailyBreakdown(data);
	const averageHoursPerDay = daysWithData > 0 ? totalSeconds / 3600 / daysWithData : 0;

	return {
		projectName,
		totalSeconds,
		totalHours,
		totalMinutes,
		digitalTime,
		startDate: data.start,
		endDate: data.end,
		daysWithData,
		averageHoursPerDay,
		mostProductiveDay: findMostProductiveDay(dailyData),
		languages: aggregateLanguages(data),
		editors: aggregateEditors(data),
		operatingSystems: aggregateOperatingSystems(data),
	};
}

/**
 * Main function to fetch and parse WakaTime project data
 * @param config - WakaTime configuration
 * @param request - Project request parameters
 * @returns Promise containing both the parsed result and daily breakdown
 */
export async function getProjectData(
	config: WakaTimeConfig,
	request: WakaTimeProjectRequest
): Promise<{ result: WakaTimeResult; dailyData: Record<string, number> }> {
	const summary = await fetchProjectSummary(config, request);
	const result = parseWakaTimeResponse(summary, request.projectName);
	const dailyData = calculateDailyBreakdown(summary);

	return { result, dailyData };
}
