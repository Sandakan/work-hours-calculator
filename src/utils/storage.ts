export interface FormState {
	whTotal: string;
	whCompleted: string;
	whStart: string;
	whEnd: string;
	whSun: boolean;
	whSat: boolean;
	whExcludeToday: boolean;
	hourlyRate: string;
	csvRequired: string;
	csvHourlyRate: string;
	tsInput: string;
	tsOutput: string;
}

export interface WakaTimeFormState {
	apiKey: string;
	projectName: string;
	startDate: string;
	endDate: string;
	rememberApiKey: boolean;
	hourlyRate: string;
}

const STORAGE_KEY = 'workHoursGUI_formState';
const WAKATIME_API_KEY = 'wakatime_api_key';
const WAKATIME_FORM_STATE = 'wakatime_form_state';
const WAKATIME_CACHE = 'wakatime_cache';

// Helper function to get dynamic dates
function getDynamicDates(): { billingStart: string; billingEnd: string } {
	const today = new Date();
	const currentYear = today.getFullYear();
	const currentMonth = today.getMonth();

	// Last month 24th
	const lastMonthDate = new Date(currentYear, currentMonth - 1, 24);
	// Current month 25th
	const currentMonthDate = new Date(currentYear, currentMonth, 25);

	// Format as YYYY-MM-DD
	const formatDate = (date: Date): string => {
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, '0');
		const day = String(date.getDate()).padStart(2, '0');
		return `${year}-${month}-${day}`;
	};

	return {
		billingStart: formatDate(lastMonthDate),
		billingEnd: formatDate(currentMonthDate),
	};
}

function getDefaultState(): FormState {
	const { billingStart, billingEnd } = getDynamicDates();
	return {
		whTotal: '100 hrs 0 mins',
		whCompleted: '0 hrs 0 mins',
		whStart: billingStart,
		whEnd: billingEnd,
		whSun: false,
		whSat: false,
		whExcludeToday: false,
		hourlyRate: '2900',
		csvRequired: '',
		csvHourlyRate: '0',
		tsInput: '',
		tsOutput: 'Total time will appear here',
	};
}

export function saveFormState(state: Partial<FormState>): void {
	const existing = loadFormState();
	const merged = { ...existing, ...state };
	localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
}

export function loadFormState(): FormState {
	const saved = localStorage.getItem(STORAGE_KEY);
	const defaultState = getDefaultState();

	if (!saved) {
		return defaultState;
	}

	try {
		const parsed = JSON.parse(saved);
		// Merge with defaults to handle backwards compatibility (new fields)
		return { ...defaultState, ...parsed };
	} catch {
		return defaultState;
	}
}

// Check if there is saved data in localStorage
export function hasSavedData(): boolean {
	return localStorage.getItem(STORAGE_KEY) !== null;
}

// WakaTime Storage Functions

export function saveWakaTimeApiKey(apiKey: string): void {
	localStorage.setItem(WAKATIME_API_KEY, apiKey);
}

export function loadWakaTimeApiKey(): string | null {
	return localStorage.getItem(WAKATIME_API_KEY);
}

export function clearWakaTimeApiKey(): void {
	localStorage.removeItem(WAKATIME_API_KEY);
}

export function saveWakaTimeFormState(state: Partial<WakaTimeFormState>): void {
	const existing = loadWakaTimeFormState();
	const merged = { ...existing, ...state };
	localStorage.setItem(WAKATIME_FORM_STATE, JSON.stringify(merged));
}

export function loadWakaTimeFormState(): WakaTimeFormState {
	const saved = localStorage.getItem(WAKATIME_FORM_STATE);
	if (!saved) {
		const { billingStart, billingEnd } = getDynamicDates();
		return {
			apiKey: '',
			projectName: '',
			startDate: billingStart,
			endDate: billingEnd,
			rememberApiKey: true,
			hourlyRate: '0',
		};
	}
	try {
		const parsed = JSON.parse(saved);
		// Load API key if remember is enabled
		if (parsed.rememberApiKey) {
			parsed.apiKey = loadWakaTimeApiKey() || '';
		}
		// Provide default for hourlyRate if not present (for backwards compatibility)
		if (!parsed.hourlyRate) {
			parsed.hourlyRate = '0';
		}
		return parsed;
	} catch {
		const { billingStart, billingEnd } = getDynamicDates();
		return {
			apiKey: '',
			projectName: '',
			startDate: billingStart,
			endDate: billingEnd,
			rememberApiKey: true,
			hourlyRate: '0',
		};
	}
}

export function clearWakaTimeFormState(): void {
	localStorage.removeItem(WAKATIME_FORM_STATE);
}

// Cache management for API responses
interface CacheEntry<T> {
	data: T;
	expiry: number;
}

export function saveToCache<T>(key: string, data: T, ttlMinutes = 5): void {
	const expiry = Date.now() + ttlMinutes * 60 * 1000;
	const entry: CacheEntry<T> = { data, expiry };
	localStorage.setItem(`${WAKATIME_CACHE}_${key}`, JSON.stringify(entry));
}

export function loadFromCache<T>(key: string): T | null {
	const saved = localStorage.getItem(`${WAKATIME_CACHE}_${key}`);
	if (!saved) return null;

	try {
		const entry: CacheEntry<T> = JSON.parse(saved);
		if (Date.now() > entry.expiry) {
			localStorage.removeItem(`${WAKATIME_CACHE}_${key}`);
			return null;
		}
		return entry.data;
	} catch {
		return null;
	}
}

export function clearWakaTimeCache(): void {
	const keys = Object.keys(localStorage);
	keys.forEach((key) => {
		if (key.startsWith(WAKATIME_CACHE)) {
			localStorage.removeItem(key);
		}
	});
}
