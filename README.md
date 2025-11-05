# Work Hours & Time Calculator

A modern React application for calculating work hours, tracking project progress, and visualizing time data with interactive charts.

## Overview

This is a complete React rewrite of the Work Hours Calculator, transforming the original HTML/JavaScript application into a production-ready React + TypeScript application with Tailwind CSS and interactive Chart.js visualizations.

**Live Demo**: `http://localhost:5173/` (when dev server is running)

## Features

### 📊 Work Hours Calculator

- Calculate remaining hours based on total and completed hours
- Support for custom billing periods (date range selection)
- Option to skip weekends (Saturday/Sunday exclusion)
- Real-time calculation results
- Detailed summary output

### 📁 CSV Import & Processing

- Import CSV files with date, task, category, hours, and minutes
- Automatic data parsing and grouping by date
- Visual table display of imported data
- Integration with work hours calculations

### 📈 Interactive Charts

1. **Progress Chart** - Donut chart showing completed vs. remaining hours
2. **Daily Plan Chart** - Bar chart with actual hours overlay
3. **Burn-down Chart** - Line chart tracking planned vs. actual progress
4. **Actuals Histogram** - Distribution of daily work hours
5. **Category Breakdown** - Pie chart by category

### 🔢 Time Sum Calculator

- Calculate total time from multiple entries
- Support for "HH hrs MM mins" format
- Quick summation tool

### 💾 Persistent Storage

- All form inputs auto-saved to browser localStorage
- State persists across sessions
- No data loss on refresh

### ⏰ Real-time Clock

- Live date and time display
- Updates every second

## Tech Stack

| Technology | Purpose | Version |
|------------|---------|---------|
| React | UI Framework | 19.1.1 |
| TypeScript | Type Safety | ~5.9.3 |
| Vite | Build Tool | 7.1.14+ |
| Tailwind CSS | Styling | Latest |
| Chart.js | Data Visualization | 4.4.0+ |
| react-chartjs-2 | React Chart Integration | Latest |
| PapaParse | CSV Processing | 5.3.2+ |

## Project Structure

```
src/
├── components/
│   ├── Charts.tsx                 # All chart components
│   ├── CSVImport.tsx             # CSV upload & parsing
│   ├── WorkHoursCalculator.tsx   # Main calculator form
│   ├── TimeSumCalculator.tsx     # Time summation tool
│   └── CurrentDateTime.tsx        # Real-time clock
├── utils/
│   ├── timeUtils.ts              # Time calculations
│   ├── csvUtils.ts               # CSV parsing
│   └── storage.ts                # localStorage management
├── App.tsx                        # Main app component
├── App.css                        # Component styles
├── index.css                      # Global styles
└── main.tsx                       # React entry point
```

## Installation

### Prerequisites

- Node.js 16+ (v18 recommended)
- npm or yarn

### Setup

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

## Usage

### Work Hours Calculation

1. Enter your **total required hours** (e.g., "160 hrs 0 mins")
2. Enter **completed hours** (e.g., "130 hrs 40 mins")
3. Set billing **start** and **end** dates
4. (Optional) Check "Skip Sundays" / "Skip Saturdays" / "Exclude today"
5. Click **Calculate**
6. View results and automatic chart updates

### CSV Import

**CSV Format Required:**

```
Date,Task,Category,HRS,MINS
2025-07-25,Design,Backend,8,30
2025-07-25,Testing,QA,2,15
2025-07-26,Development,Backend,7,45
```

**Steps:**

1. Click **Import CSV** and select your file
2. Enter required hours
3. Click **Parse & Display**
4. Review grouped data in table
5. Charts update with imported data

### Time Sum Calculator

1. Paste time entries (one per line)
2. Format: "HH hrs MM mins" (e.g., "37 hrs 56 mins")
3. Click **Sum times**
4. View total result

## Key Components

### WorkHoursCalculator

Main calculation interface with form inputs for hours and date ranges.

```tsx
<WorkHoursCalculator onCalculate={handleCalculate} />
```

### CSVImport

CSV upload and processing with data table display.

```tsx
<CSVImport onImport={handleCSVImport} />
```

### Charts

Complete charting system with 5 different visualization types.

```tsx
<Charts result={result} actualsByDate={actualsByDate} parsedRows={parsedRows} />
```

### TimeSumCalculator

Standalone time summation utility.

```tsx
<TimeSumCalculator />
```

### CurrentDateTime

Real-time clock display with auto-updates.

```tsx
<CurrentDateTime />
```

## Utility Functions

### timeUtils.ts

- `parseTime(string): number` - Parse time strings to minutes
- `formatMinutes(number): string` - Format minutes to readable string
- `calcWorkHours(...): WorkHoursResult` - Main calculation logic
- `sumTimeStrings(text): number` - Sum multiple time entries

### csvUtils.ts

- `parseCSV(csvText)` - Parse and group CSV data by date

### storage.ts

- `saveFormState(state)` - Persist form data
- `loadFormState(): FormState` - Retrieve saved state

## Styling

The application uses **Tailwind CSS** for all styling with a custom color palette:

- **Primary**: `#7c3aed` (violet - accent color)
- **Success**: `#10b981` (green - actuals/import)
- **Info**: `#60a5fa` (blue - parse actions)
- **Muted**: `#6b7280` (gray - secondary text)

All components are fully responsive and mobile-friendly.

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Performance

- **Dev Server**: ~266ms startup (Vite)
- **Hot Module Replacement**: Instant updates
- **Build Size**: Optimized with tree-shaking
- **Charts**: Efficient Canvas rendering
- **React**: Optimized re-renders with memo

## Development

### Adding New Features

1. Create component in `src/components/`
2. Export from component file
3. Import in `src/App.tsx`
4. Add styling with Tailwind classes
5. Use utilities from `src/utils/`

### Type Safety

All components and utilities are fully typed with TypeScript. Key interfaces:

```typescript
interface WorkHoursResult {
  total: number
  completed: number
  remaining: number
  billingStart: Date
  billingEnd: Date
  remainingDays: number
  workdays: number
  perDay: number
  skipped: string[]
  days: Array<{ date: Date; work: boolean }>
}
```

## Deployment

### Build for Production

```bash
npm run build
```

Output directory: `dist/`

### Deploy Options

- **GitHub Pages**: Upload `dist/` to gh-pages branch
- **Vercel**: `vercel` command or GitHub integration
- **Netlify**: Drop `dist/` folder
- **Traditional Hosting**: Upload `dist/` via FTP/SFTP

## Troubleshooting

### Charts not displaying

- Check browser DevTools console for errors
- Verify Chart.js is properly registered
- Ensure data is being calculated correctly

### CSV import failing

- Validate column headers: `Date, Task, Category, HRS, MINS`
- Check date format is recognized (YYYY-MM-DD preferred)
- Review console for parsing errors

### Calculations incorrect

- Verify time format: "HHH hrs MM mins"
- Check date ranges don't have timezone issues
- Ensure all numbers are valid integers

### localStorage not working

- Check if private/incognito mode is enabled
- Verify browser allows localStorage
- Check storage quota isn't exceeded

## Documentation

Additional documentation files:

- **REACT_README.md** - Comprehensive project guide
- **SETUP_GUIDE.md** - Quick start instructions
- **CONVERSION_SUMMARY.md** - HTML to React conversion overview
- **FILE_INDEX.md** - Detailed file reference
- **COMPLETION_CHECKLIST.md** - Full feature checklist

## License

This project is available for personal and commercial use.

## Future Enhancements

- Dark mode toggle
- Export to PDF/CSV
- Multi-project tracking
- Cloud data sync
- Mobile app (React Native)
- Unit & E2E tests
- Analytics dashboard

## Support

For issues or questions, refer to the documentation files or check the component source code with inline comments.

---

**Status**: ✅ Production Ready

**Last Updated**: November 2025

**Built with React 19 + Vite + Tailwind CSS**
