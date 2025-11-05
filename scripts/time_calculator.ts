/**
 * time_calculator.ts
 *
 * Description: This script calculates the sum of time durations,
 * provided as command-line arguments or extracted from PDF files in a directory.
 * It primarily handles time durations in "HH hrs MM mins" format from command line.
 * It can also extract time differences from date strings within PDF files.
 *
 * How to Run:
 *
 * 1.  Save the code to a file, e.g., `time_calculator.ts`.
 * 2.  Ensure you have Deno installed.
 * 3.  Open your terminal and navigate to the directory where you saved the file.
 * 4.  Run the script using Deno with the following command:
 *
 * To process time durations from command line:
 *
 * deno run --allow-read time_calculator.ts "37 hrs 56 mins" "29 hrs 44 mins" "41 hrs 1 min" "48 hrs 13 min" "17 hrs 43 min"
 *
 * To process time differences from date strings in PDF files in a directory:
 *
 * deno run --allow-read time_calculator.ts --pdf-dir="./path/to/your/pdf/directory"
 *
 * (Replace `./path/to/your/pdf/directory` with the actual path to the directory
 * containing your PDF files. The PDF files should contain time strings
 * in either "HH hrs MM mins" or "Start:YYYY-MM-DD HH:MM, End:YYYY-MM-DD HH:MM" format.)
 *
 * 5.  The script will output the total time in "HH hours MM minutes" format.
 */

// Import necessary modules (for Deno)
import { join } from 'jsr:@std/path';
import { pdfToText } from 'npm:pdf-ts';

// Function to parse a time string (e.g., "37 hrs 56 mins") into total minutes
function parseTimeString(timeString: string): number {
	const parts = timeString.split(' ');
	if (parts.length === 4 && parts[1] === 'hrs' && parts[3] === 'mins') {
		const hours = parseInt(parts[0], 10);
		const minutes = parseInt(parts[2], 10);
		if (isNaN(hours) || isNaN(minutes)) {
			throw new Error(`Invalid time value: ${timeString}. Hours and minutes must be numbers.`);
		}
		return hours * 60 + minutes;
	} else {
		throw new Error(`Invalid time format: ${timeString}.  Use 'HH hrs MM mins'`);
	}
}

// Function to format total minutes back into "HH hours MM minutes" format
function formatTime(totalMinutes: number): string {
	const hours = Math.floor(totalMinutes / 60);
	const minutes = totalMinutes % 60;
	return `${hours} hours ${minutes} minutes`;
}

/**
 * Extracts time strings from the text content of a PDF.
 * @param text The text to search within.
 * @returns An array of time strings found in the text.
 */
function extractTimeStrings(text: string): string[] {
	const timeRegex1 = /(\d+ hrs \d+ mins)/g;
	const timeRegex2 = /Start: (\d{4}-\d{2}-\d{2} \d{2}:\d{2}), End: (\d{4}-\d{2}-\d{2} \d{2}:\d{2})/g;
	let match;
	const timeStrings: string[] = [];
	while ((match = timeRegex1.exec(text)) !== null) {
		timeStrings.push(match[0]);
	}
	while ((match = timeRegex2.exec(text)) !== null) {
		timeStrings.push(match[0]);
	}
	return timeStrings;
}

/**
 * Processes PDF files in a directory to extract time strings.
 * @param pdfDir The path to the directory containing PDF files.
 * @returns An array of time strings extracted from all PDF files.
 */
async function processPDFs(pdfDir: string): Promise<string[]> {
	const timeStrings: string[] = [];
	try {
		const files = Deno.readDirSync(pdfDir); // Use Deno's readdirSync
		for (const file of files) {
			const filePath = join(pdfDir, file.name);
			const fileInfo = Deno.statSync(filePath);
			if (fileInfo.isFile && file.name.toLowerCase().endsWith('.pdf')) {
				try {
					// Read the file as bytes.
					const fileContent = Deno.readFileSync(filePath);

					const data = await pdfToText(fileContent);
					const times = extractTimeStrings(data);
					timeStrings.push(...times);
				} catch (error) {
					console.error(`Error processing PDF file ${filePath}:`, error);
					// Consider if you want to continue processing other files or stop.
				}
			}
		}
	} catch (error) {
		console.error(`Error reading directory ${pdfDir}:`, error);
		throw error; // Re-throw the error to be caught by the main function.
	}
	return timeStrings;
}

// Main function to calculate the sum of times
async function main() {
	let totalMinutes = 0;
	const timeStrings: string[] = [];

	// Parse command line arguments
	for (const arg of Deno.args) {
		if (arg.startsWith('--pdf-dir=')) {
			const pdfDir = arg.split('=')[1];
			try {
				const pdfTimes = await processPDFs(pdfDir);
				timeStrings.push(...pdfTimes);
			} catch (_error) {
				Deno.exit(1);
			}
		} else if (!arg.startsWith('--')) {
			//if it does not start with --, treat it as a time string.
			try {
				const minutes = parseTimeString(arg);
				totalMinutes += minutes;
				timeStrings.push(arg);
			} catch (_e) {
				console.error(`Error processing argument: ${arg}.  Skipping.`);
			}
		}
	}

	// Process extracted time strings.  Important:  Only process PDF-extracted times here.
	if (Deno.args.some((arg) => arg.startsWith('--pdf-dir='))) {
		// Only do this if --pdf-dir was provided
		for (const timeString of timeStrings) {
			try {
				totalMinutes += parseTimeString(timeString); // Ensure PDF times are added
			} catch (_error) {
				console.error(`Error processing time string: ${timeString}. Skipping.`);
			}
		}
	}

	const result = formatTime(totalMinutes);
	console.log(`Total time: ${result}`);
}

// Execute the main function
main();
