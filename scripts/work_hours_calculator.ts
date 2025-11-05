import { parseArgs } from 'jsr:@std/cli/parse-args';

// Helper function to parse time string using regex
function parseTime(timeString: string): number {
	const regex = /^(?:(\d+)\s*hrs?)?\s*(?:(\d+)\s*mins?)?$/i;
	const match = timeString.match(regex);

	if (!match) {
		throw new Error(`Invalid time format: ${timeString}. Expected format is "HH hrs MM mins", "HH hrs", or "MM mins"`);
	}

	const hours = match[1] ? parseInt(match[1], 10) : 0;
	const minutes = match[2] ? parseInt(match[2], 10) : 0;

	if (isNaN(hours) || isNaN(minutes) || hours < 0 || minutes < 0 || minutes > 59) {
		throw new Error(`Invalid time value: ${timeString}. Hours must be >= 0, minutes 0-59.`);
	}

	return hours * 60 + minutes;
}

// Helper function to format minutes into a time string
function formatMinutesToTime(totalMinutes: number): string {
	const hours = Math.floor(totalMinutes / 60);
	const minutes = Math.round(totalMinutes % 60);
	return `${hours} hrs ${minutes} mins`;
}

// Define the main function to perform the calculations.
function calculateWorkHours(
	totalHours: number,
	completedHours: number,
	daysRemaining: number,
	skipSunday: boolean,
	skipSaturday: boolean,
	excludeToday: boolean
): void {
	const remainingHours = totalHours - completedHours;

	const today = new Date();
	if (excludeToday) today.setDate(today.getDate() + 1);

	const skippedLog: string[] = [];
	let workdays = 0;

	for (let i = 0; i < daysRemaining; i++) {
		const current = new Date(today);
		current.setDate(today.getDate() + i);
		const day = current.getDay();

		if ((skipSunday && day === 0) || (skipSaturday && day === 6)) {
			skippedLog.push(`${current.toDateString()} (${day === 0 ? 'Sunday' : 'Saturday'})`);
			continue;
		}
		workdays++;
	}

	const hoursPerDay = workdays > 0 ? remainingHours / workdays : 0;

	// Logging
	console.log(`Total hours: ${formatMinutesToTime(totalHours)}`);
	console.log(`Completed hours: ${formatMinutesToTime(completedHours)}`);
	console.log(`Remaining hours: ${formatMinutesToTime(remainingHours)}`);
	console.log(`Remaining days: ${daysRemaining}`);

	if (skipSunday || skipSaturday) {
		console.log(
			`Workdays (excluding${skipSunday ? ' Sundays' : ''}${skipSunday && skipSaturday ? ' and' : ''}${
				skipSaturday ? ' Saturdays' : ''
			}): ${workdays}`
		);
		console.log(`Skipped ${skippedLog.length} days due to exclusions.`);
		if (skippedLog.length > 0) {
			console.log('Excluded days:');
			skippedLog.forEach((date) => console.log(`  - ${date}`));
		}
		console.log(`Hours per workday: ${formatMinutesToTime(hoursPerDay)}`);
	} else {
		console.log(`Hours per day: ${formatMinutesToTime(hoursPerDay)}`);
	}
}

const args = parseArgs(Deno.args, {
	string: ['totalHours', 'completedHours', 'daysRemaining'],
	default: { skipSunday: false, skipSaturday: false, excludeToday: false },
	boolean: ['skipSunday', 'skipSaturday', 'excludeToday'],
});

let totalHours: number;
let completedHours: number;
try {
	totalHours = parseTime(args.totalHours as string);
	completedHours = parseTime(args.completedHours as string);
} catch (e) {
	console.error(e);
	console.error(
		'  Example: deno run calculate_work_hours.ts --totalHours="8 hrs 30 mins" --completedHours="2 hrs 15 mins" [--daysRemaining=18] [--skipSunday=true] [--skipSaturday=true] [--excludeToday=true]'
	);
	Deno.exit(1);
}

let daysRemaining: number;
if (args.daysRemaining) {
	daysRemaining = Number(args.daysRemaining);
} else {
	const today = new Date();
	const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
	daysRemaining = endOfMonth.getDate() - today.getDate() + (args.excludeToday ? -1 : 0);
	console.log('Current day of the month:', today.toDateString());
	console.log('Last day of the month:', endOfMonth.getDate());
	console.log(`Days remaining in the month: ${daysRemaining}`);
}

if (isNaN(totalHours) || isNaN(completedHours)) {
	console.error('Error: Please provide valid values for totalHours and completedHours.');
	console.error(
		'  Example: deno run calculate_work_hours.ts --totalHours="8 hrs 30 mins" --completedHours="2 hrs 15 mins" [--daysRemaining=18] [--skipSunday=true] [--skipSaturday=true] [--excludeToday=true]'
	);
	console.error('  If daysRemaining is not provided, it will be calculated automatically.');
	Deno.exit(1);
} else {
	calculateWorkHours(totalHours, completedHours, daysRemaining, args.skipSunday, args.skipSaturday, args.excludeToday);
}
