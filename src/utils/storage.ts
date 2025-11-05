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
	tsInput: string;
	tsOutput: string;
}

const STORAGE_KEY = 'workHoursGUI_formState';

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

export function saveFormState(state: Partial<FormState>): void {
	const existing = loadFormState();
	const merged = { ...existing, ...state };
	localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
}

export function loadFormState(): FormState {
	const saved = localStorage.getItem(STORAGE_KEY);
	if (!saved) {
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
			tsInput: '',
			tsOutput: 'Total time will appear here',
		};
	}
	try {
		return JSON.parse(saved);
	} catch {
		return getDefaultState();
	}
}

// Check if there is saved data in localStorage
export function hasSavedData(): boolean {
	return localStorage.getItem(STORAGE_KEY) !== null;
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
		tsInput: '',
		tsOutput: 'Total time will appear here',
	};
}
