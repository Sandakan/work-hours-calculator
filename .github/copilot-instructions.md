# Work Hours Calculator - AI Coding Guidelines

## Architecture Overview

This is a React + TypeScript single-page application with three main data sources (Calculator, CSV Import, WakaTime) that feed into shared visualization components. The app uses prop drilling for state management and localStorage for persistence.

### Core Data Flow
- **App.tsx** orchestrates shared state across all components
- Each data source (calculator/CSV/WakaTime) clears others when activated
- Results flow to **Charts.tsx** for visualization
- All form inputs auto-save to localStorage

### Key Components
- `WorkHoursCalculator`: Core calculation form with billing period logic
- `CSVImport`: PapaParse-based CSV processing with date grouping
- `WakaTimeTracker`: External API integration with proxy and caching
- `Charts`: Chart.js visualizations (7 different chart types)
- `TimeSumCalculator`: Standalone time summation utility

## Critical Patterns & Conventions

### Time Format
Always use `"X hrs Y mins"` format throughout the codebase:
```typescript
// ✅ Correct
"160 hrs 0 mins"
"37 hrs 56 mins"

// ❌ Wrong
"160:00"
"160 hours"
```

### State Management
- Shared state lives in `App.tsx` and flows down via props
- Use `useCallback` for event handlers to prevent unnecessary re-renders
- Clear other data sources when switching tabs:
```typescript
setResult(newResult);
setActiveDataSource('calculator');
// Clear other data sources
setActualsByDate({});
setParsedRows([]);
setWakaTimeResult(null);
```

### Storage Pattern
- All form state auto-saves to localStorage via `useEffect`
- Use `loadFormState()` and `saveFormState()` from `storage.ts`
- Dynamic defaults based on current month (last month 24th to current month 25th)

### WakaTime Integration
- Requires Vite proxy due to CORS restrictions
- API responses cached for 5 minutes
- Convert seconds to hours: `totalSeconds / 3600`
- Project filtering happens server-side via `?project=` parameter

### Chart.js Setup
Register components in `Charts.tsx`:
```typescript
ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement, Title, Tooltip, Legend
);
```

## Development Workflow

### Building & Running
```bash
npm run dev      # Vite dev server with WakaTime proxy
npm run build    # TypeScript compilation + Vite build
npm run lint     # ESLint checking
```

### Adding New Features
1. Create component in `src/components/`
2. Export from component file
3. Import in `src/App.tsx`
4. Add Tailwind classes for styling
5. Use utilities from `src/utils/`

### Component Props Pattern
Pass all shared state as individual props (not objects):
```typescript
<WorkHoursCalculator
  onCalculate={handleCalculate}
  totalHours={totalHours}
  setTotalHours={setTotalHours}
  // ... 10+ more props
/>
```

## Utility Functions

### timeUtils.ts
- `parseTime(string)`: `"160 hrs 0 mins"` → minutes
- `formatMinutes(number)`: minutes → `"160 hrs 0 mins"`
- `calcWorkHours(...)`: Core business logic with earnings calculations
- `sumTimeStrings(text)`: Sum multiple time entries from textarea

### storage.ts
- `loadFormState()`: Get saved form data with defaults
- `saveFormState(state)`: Merge and save to localStorage
- `saveToCache(key, data, ttlMinutes)`: Cache API responses

### wakatimeApi.ts
- `getProjectData()`: Main function returning `{result, dailyData}`
- `parseWakaTimeResponse()`: Transform API response to app format
- `calculateDailyBreakdown()`: Convert summary to date→hours map

## Styling & UI

### Color Palette
- Primary: `#7c3aed` (violet)
- Success: `#10b981` (green)
- Info: `#60a5fa` (blue)
- Muted: `#6b7280` (gray)

### Responsive Design
- Mobile-first with `sm:`, `lg:` breakpoints
- Flex layouts with `gap-` utilities
- Cards use `rounded-xl shadow-lg border border-gray-100`

### Animation Classes
- `fade-in`: CSS transition for content appearance
- `gradient-text`: Violet gradient text effect

## Common Pitfalls

### Time Calculations
- Always work in minutes internally, convert to hours for display
- Handle negative remaining hours gracefully
- Skip weekends logic: check `day.getDay() === 0` (Sunday) or `=== 6` (Saturday)

### API Integration
- WakaTime API blocks direct browser access - always use proxy
- Handle rate limiting (429) and invalid API keys (401)
- Cache responses to avoid hitting rate limits

### State Synchronization
- When switching data sources, clear ALL related state
- WakaTime data triggers automatic work hours recalculation
- CSV import requires both result calculation AND data parsing

### Chart Data
- Ensure data arrays match label arrays exactly
- Handle empty states with user-friendly messages
- Use consistent color schemes across chart types

## File Organization

```
src/
├── components/     # UI components (one per file)
├── utils/         # Business logic & external APIs
├── types/         # TypeScript interfaces
└── App.tsx        # State orchestration
```

## Testing & Validation

Currently no test suite exists. When adding tests:
- Test time parsing/formatting logic in `timeUtils.ts`
- Mock WakaTime API responses
- Test chart data generation
- Validate localStorage persistence
- use `npm run build` to ensure type safety and linting
