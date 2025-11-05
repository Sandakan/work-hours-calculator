// WakaTime API Configuration
export interface WakaTimeConfig {
	apiKey: string;
	baseUrl?: string;
}

// Request parameters for fetching project data
export interface WakaTimeProjectRequest {
	projectName: string;
	startDate: string; // YYYY-MM-DD format
	endDate: string; // YYYY-MM-DD format
	branches?: string[];
}

// WakaTime API Response structures
export interface WakaTimeGrandTotal {
	digital: string;
	hours: number;
	minutes: number;
	total_seconds: number;
	text: string;
}

export interface WakaTimeProject {
	name: string;
	total_seconds: number;
	digital: string;
	hours: number;
	minutes: number;
	percent: number;
}

export interface WakaTimeLanguage {
	name: string;
	total_seconds: number;
	digital: string;
	hours: number;
	minutes: number;
	percent: number;
}

export interface WakaTimeEditor {
	name: string;
	total_seconds: number;
	digital: string;
	hours: number;
	minutes: number;
	percent: number;
}

export interface WakaTimeOperatingSystem {
	name: string;
	total_seconds: number;
	digital: string;
	hours: number;
	minutes: number;
	percent: number;
}

export interface WakaTimeDayData {
	grand_total: WakaTimeGrandTotal;
	projects: WakaTimeProject[];
	languages: WakaTimeLanguage[];
	editors: WakaTimeEditor[];
	operating_systems: WakaTimeOperatingSystem[];
	range: {
		start: string;
		end: string;
		date: string;
		text: string;
		timezone: string;
	};
}

export interface WakaTimeSummary {
	data: WakaTimeDayData[];
	start: string;
	end: string;
}

// Parsed result for application use
export interface WakaTimeResult {
	projectName: string;
	totalSeconds: number;
	totalHours: number;
	totalMinutes: number;
	digitalTime: string;
	startDate: string;
	endDate: string;
	daysWithData: number;
	averageHoursPerDay: number;
	mostProductiveDay: {
		date: string;
		hours: number;
	} | null;
	languages: Array<{
		name: string;
		hours: number;
		percent: number;
	}>;
	editors: Array<{
		name: string;
		hours: number;
		percent: number;
	}>;
	operatingSystems: Array<{
		name: string;
		hours: number;
		percent: number;
	}>;
}

// Form state for localStorage persistence
export interface WakaTimeFormState {
	apiKey: string;
	projectName: string;
	startDate: string;
	endDate: string;
	rememberApiKey: boolean;
}

// Error response from WakaTime API
export interface WakaTimeError {
	error: string;
	message?: string;
}

// Projects list response
export interface WakaTimeProjectsResponse {
	data: Array<{
		id: string;
		name: string;
		repository: {
			name: string;
			provider: string;
		} | null;
		created_at: string;
		last_heartbeat_at: string;
	}>;
}
