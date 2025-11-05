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
	billingStart: Date,
	billingEnd: Date,
	skipSunday: boolean,
	skipSaturday: boolean,
	excludeToday: boolean
): void {
	const remainingHours = totalHours - completedHours;
	const skippedLog: string[] = [];
	let workdays = 0;
	let remainingDays = 0;

	// Determine the correct start date for calculation
	const today = new Date();
	today.setHours(0, 0, 0, 0);
	let start: Date;
	if (today > billingEnd) {
		start = new Date(billingEnd.getTime() + 1); // No days left
	} else if (today < billingStart) {
		start = new Date(billingStart);
	} else {
		start = new Date(today);
		if (excludeToday) {
			start.setDate(today.getDate() + 1);
		}
	}

	for (const d = new Date(start); d <= billingEnd; d.setDate(d.getDate() + 1)) {
		remainingDays++;
		const day = d.getDay();
		if ((skipSunday && day === 0) || (skipSaturday && day === 6)) {
			skippedLog.push(`${d.toDateString()} (${day === 0 ? 'Sunday' : 'Saturday'})`);
			continue;
		}
		workdays++;
	}

	const hoursPerDay = workdays > 0 ? remainingHours / workdays : 0;

	// Logging
	console.log(`Total hours: ${formatMinutesToTime(totalHours)}`);
	console.log(`Completed hours: ${formatMinutesToTime(completedHours)}`);
	console.log(`Remaining hours: ${formatMinutesToTime(remainingHours)}`);
	console.log(`Billing period: ${billingStart.toDateString()} to ${billingEnd.toDateString()}`);
	console.log(`Remaining days: ${remainingDays}`);

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

function printHelp() {
	console.log(
		`Usage: deno run work_hours_cli.ts --totalHours="8 hrs 30 mins" --completedHours="2 hrs 15 mins" --billingStart=YYYY-MM-DD --billingEnd=YYYY-MM-DD [--skipSunday] [--skipSaturday] [--excludeToday]`
	);
	console.log('  --totalHours        Total required hours (e.g., "160 hrs 0 mins")');
	console.log('  --completedHours    Completed hours (e.g., "130 hrs 40 mins")');
	console.log('  --billingStart      Billing period start date (YYYY-MM-DD)');
	console.log('  --billingEnd        Billing period end date (YYYY-MM-DD)');
	console.log('  --skipSunday        Exclude Sundays from calculation');
	console.log('  --skipSaturday      Exclude Saturdays from calculation');
	console.log('  --excludeToday      Exclude today from calculation');
}

function main() {
	try {
		const args = parseArgs(Deno.args, {
			string: ['totalHours', 'completedHours', 'billingStart', 'billingEnd'],
			boolean: ['skipSunday', 'skipSaturday', 'excludeToday', 'help'],
			default: { skipSunday: false, skipSaturday: false, excludeToday: false, help: false },
		});

		if (args.help) {
			printHelp();
			Deno.exit(0);
		}

		if (!args.totalHours || !args.completedHours || !args.billingStart || !args.billingEnd) {
			console.error('Error: Missing required arguments.');
			printHelp();
			Deno.exit(1);
		}

		const totalHours = parseTime(args.totalHours as string);
		const completedHours = parseTime(args.completedHours as string);
		const skipSunday = !!args.skipSunday;
		const skipSaturday = !!args.skipSaturday;
		const excludeToday = !!args.excludeToday;

		const billingStart = new Date(args.billingStart as string);
		const billingEnd = new Date(args.billingEnd as string);
		if (isNaN(billingStart.getTime()) || isNaN(billingEnd.getTime()) || billingEnd < billingStart) {
			console.error('Invalid billing period dates.');
			Deno.exit(1);
		}

		calculateWorkHours(totalHours, completedHours, billingStart, billingEnd, skipSunday, skipSaturday, excludeToday);
	} catch (e) {
		console.error(e);
		printHelp();
		Deno.exit(1);
	}
}

if (import.meta.main) {
	main();
}
