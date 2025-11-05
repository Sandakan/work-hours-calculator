export interface FormState {
	whTotal: string;
	whCompleted: string;
	whStart: string;
	whEnd: string;
	whSun: boolean;
	whSat: boolean;
	whExcludeToday: boolean;
	csvRequired: string;
	tsInput: string;
	tsOutput: string;
}

const STORAGE_KEY = 'workHoursGUI_formState';

export function saveFormState(state: Partial<FormState>): void {
	const existing = loadFormState();
	const merged = { ...existing, ...state };
	localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
}

export function loadFormState(): FormState {
	const saved = localStorage.getItem(STORAGE_KEY);
	if (!saved) {
		return {
			whTotal: '160 hrs 0 mins',
			whCompleted: '130 hrs 40 mins',
			whStart: '2025-07-25',
			whEnd: '2025-08-28',
			whSun: false,
			whSat: false,
			whExcludeToday: false,
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

function getDefaultState(): FormState {
	return {
		whTotal: '160 hrs 0 mins',
		whCompleted: '130 hrs 40 mins',
		whStart: '2025-07-25',
		whEnd: '2025-08-28',
		whSun: false,
		whSat: false,
		whExcludeToday: false,
		csvRequired: '',
		tsInput: '',
		tsOutput: 'Total time will appear here',
	};
}
