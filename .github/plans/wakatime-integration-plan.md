# WakaTime Project Hours Integration - Implementation Plan

## Overview

This plan outlines the implementation of WakaTime API integration into the Work Hours Calculator application. The feature will allow users to fetch and display hours worked on specific projects tracked by WakaTime, providing real-time project tracking capabilities alongside the existing manual work hours calculation features.

WakaTime is a time tracking service that automatically tracks time spent coding across various projects, editors, and languages. By integrating this API, users can:

- Automatically import actual hours worked from WakaTime
- Compare manual estimates vs actual tracked time
- Analyze productivity metrics by project
- Eliminate manual time entry for WakaTime-tracked projects

---

## Requirements

### Functional Requirements

1. **WakaTime API Integration**
   - Implement secure API key storage (localStorage with user warning)
   - Support WakaTime REST API v1 authentication
   - Fetch project summaries and time statistics
   - Handle API rate limiting and errors gracefully

2. **User Input Collection**
   - API Key (required) - User's WakaTime API secret key
   - Project Name (required) - Exact project name as it appears in WakaTime
   - Date Range (required) - Start and end dates for the query
   - Optional filters:
     - Branches (specific Git branches)
     - Operating System
     - Editor/IDE
     - Language

3. **Data Display & Visualization**
   - Show total hours worked on the project
   - Display daily breakdown of hours
   - Integrate with existing chart components
   - Show project metadata (languages, editors used, etc.)
   - Display comparative metrics (if applicable)

4. **Data Integration**
   - Allow importing WakaTime data into the Work Hours Calculator
   - Merge WakaTime actuals with manual calculations
   - Support CSV export of WakaTime data
   - Enable side-by-side comparison with manual time entries

5. **Error Handling**
   - Invalid API key detection
   - Project not found scenarios
   - Network connectivity issues
   - Empty data sets
   - API quota exceeded warnings

### Non-Functional Requirements

1. **Security**
   - Secure API key storage with encryption warning
   - No API key transmission to third parties
   - Client-side only API calls (CORS-compliant)

2. **Performance**
   - Lazy loading of WakaTime component
   - Caching of API responses (session storage)
   - Debounced API calls to prevent rate limiting
   - Loading states for async operations

3. **User Experience**
   - Clear input validation with helpful error messages
   - Loading indicators during API calls
   - Responsive design matching existing UI
   - Auto-save form inputs to localStorage
   - Help text explaining how to get WakaTime API key

4. **Maintainability**
   - Typed TypeScript interfaces for API responses
   - Separate utility module for WakaTime API calls
   - Reusable components following existing patterns
   - Comprehensive error logging

---

## Implementation Steps

### Phase 1: API Integration & Utilities (2-3 hours)

#### Step 1.1: Create WakaTime Types and Interfaces

**File**: `src/types/wakatime.ts` (new file)

Create TypeScript interfaces for:

- API request parameters
- API response structures
- Project summary data
- Time range data
- Editor/language statistics
- Error responses

```typescript
// Example structure
export interface WakaTimeConfig {
  apiKey: string;
  baseUrl?: string;
}

export interface WakaTimeProjectRequest {
  projectName: string;
  startDate: string;
  endDate: string;
  branches?: string[];
}

export interface WakaTimeSummary {
  data: Array<{
    grand_total: {
      digital: string;
      hours: number;
      minutes: number;
      total_seconds: number;
    };
    projects: Array<{
      name: string;
      total_seconds: number;
      digital: string;
      hours: number;
      minutes: number;
    }>;
    range: {
      start: string;
      end: string;
    };
  }>;
  // ... other fields
}
```

#### Step 1.2: Implement WakaTime API Service

**File**: `src/utils/wakatimeApi.ts` (new file)

Implement the following functions:

- `validateApiKey(apiKey: string): Promise<boolean>` - Test API key validity
- `fetchProjectSummary(config: WakaTimeConfig, request: WakaTimeProjectRequest): Promise<WakaTimeSummary>` - Main data fetching function
- `fetchUserProjects(apiKey: string): Promise<string[]>` - Get list of user's projects
- `parseWakaTimeResponse(data: WakaTimeSummary, projectName: string): WakaTimeResult` - Transform API response to app format
- `calculateDailyBreakdown(data: WakaTimeSummary): Record<string, number>` - Extract daily hours
- Helper functions for:
  - Date formatting for API requests
  - Error message extraction
  - Retry logic with exponential backoff
  - Rate limit detection

**API Endpoints to Use**:

- Base URL: `https://wakatime.com/api/v1`
- Summary endpoint: `/users/current/summaries?start={date}&end={date}&project={name}`
- Projects endpoint: `/users/current/projects`
- Authentication: Basic Auth with API key as username, empty password

#### Step 1.3: Create WakaTime Storage Utilities

**File**: Update `src/utils/storage.ts`

Add functions for:

- `saveWakaTimeApiKey(apiKey: string): void` - Securely store API key
- `loadWakaTimeApiKey(): string | null` - Retrieve stored API key
- `clearWakaTimeApiKey(): void` - Remove API key from storage
- `saveWakaTimeFormState(state: WakaTimeFormState): void` - Persist form inputs
- `loadWakaTimeFormState(): WakaTimeFormState` - Load saved form state
- Cache management for API responses (with expiry)

**Storage Keys**:

```typescript
const STORAGE_KEYS = {
  WAKATIME_API_KEY: 'wakatime_api_key',
  WAKATIME_FORM: 'wakatime_form_state',
  WAKATIME_CACHE: 'wakatime_cache',
  WAKATIME_CACHE_EXPIRY: 'wakatime_cache_expiry'
};
```

### Phase 2: Component Development (3-4 hours)

#### Step 2.1: Create WakaTime Input Form Component

**File**: `src/components/WakaTimeTracker.tsx` (new file)

Component structure:

```tsx
interface WakaTimeTrackerProps {
  onDataFetch: (result: WakaTimeResult, dailyData: Record<string, number>) => void;
}

export function WakaTimeTracker({ onDataFetch }: WakaTimeTrackerProps) {
  // State management for all inputs
  // Form validation logic
  // API call handling
  // Loading states
  // Error display
}
```

**Features**:

- Input fields:
  - API Key (password input with show/hide toggle)
  - Project name (text input with autocomplete from cached projects)
  - Start date (date picker)
  - End date (date picker)
  - Advanced filters (collapsible section):
    - Branch filter (text input)
    - Editor filter (dropdown)
    - Language filter (dropdown)
- "Fetch Data" button with loading spinner
- "Test API Key" button for validation
- Link to WakaTime settings page for API key
- Security notice about local storage
- Results display area (similar to WorkHoursCalculator output)

**UI/UX Requirements**:

- Match existing card styling (white background, rounded corners, shadow)
- Use violet color scheme for consistency
- Responsive grid layout
- Clear visual hierarchy
- Helpful placeholder text
- Icon indicators (🔑 for API key, 📦 for project, etc.)

#### Step 2.2: Create WakaTime Results Display Component

**File**: `src/components/WakaTimeResults.tsx` (new file)

Display structure:

```tsx
interface WakaTimeResultsProps {
  result: WakaTimeResult;
  dailyBreakdown: Record<string, number>;
}

export function WakaTimeResults({ result, dailyBreakdown }: WakaTimeResultsProps) {
  // Format and display summary statistics
  // Show daily breakdown table
  // Display metadata (languages, editors)
}
```

**Display sections**:

1. Summary cards:
   - Total hours worked
   - Average hours per day
   - Most productive day
   - Project languages used
   - Primary editor/IDE

2. Daily breakdown table:
   - Date column
   - Hours column
   - Percentage of average
   - Visual bars for quick comparison

3. Metadata section:
   - Languages breakdown
   - Editors used
   - Operating systems
   - Time range queried

#### Step 2.3: Create WakaTime Integration UI Component

**File**: `src/components/WakaTimeIntegration.tsx` (new file)

Combines WakaTimeTracker and WakaTimeResults into a unified interface with:

- Tabbed or accordion interface
- "Import to Calculator" button
- "Export to CSV" button
- "Compare with Manual Entry" toggle
- Side-by-side comparison view (when enabled)

### Phase 3: Integration with Existing Features (2-3 hours)

#### Step 3.1: Update Main App Component

**File**: `src/App.tsx`

Changes needed:

- Import WakaTimeIntegration component
- Add state for WakaTime data
- Create handler for WakaTime data fetching
- Add WakaTimeIntegration to layout (new grid section or tab)
- Pass data to Charts component for visualization

Example addition:

```tsx
const [wakaTimeResult, setWakaTimeResult] = useState<WakaTimeResult | null>(null);
const [wakaTimeDailyData, setWakaTimeDailyData] = useState<Record<string, number>>({});

const handleWakaTimeData = (result: WakaTimeResult, dailyData: Record<string, number>) => {
  setWakaTimeResult(result);
  setWakaTimeDailyData(dailyData);
};

// In render:
<WakaTimeIntegration onDataFetch={handleWakaTimeData} />
```

#### Step 3.2: Enhance Charts Component

**File**: `src/components/Charts.tsx`

Add new chart types:

1. **WakaTime vs Manual Comparison Chart** (bar chart)
   - Side-by-side bars for each day
   - Legend distinguishing WakaTime vs manual entries
   - Difference indicator (over/under tracking)

2. **WakaTime Language Distribution** (pie chart)
   - Show time spent per programming language
   - Color-coded by language

3. **WakaTime Editor Usage** (donut chart)
   - Time spent in each editor/IDE

Update chart props to accept WakaTime data:

```tsx
interface ChartsProps {
  result: WorkHoursResult | null;
  actualsByDate: Record<string, number>;
  parsedRows: Record<string, unknown>[];
  wakaTimeResult?: WakaTimeResult | null;
  wakaTimeDailyData?: Record<string, number>;
}
```

#### Step 3.3: Create WakaTime-to-CSV Export Utility

**File**: `src/utils/csvUtils.ts` (update existing)

Add function:

```typescript
export function exportWakaTimeToCSV(
  dailyData: Record<string, number>,
  projectName: string
): string {
  // Convert WakaTime data to CSV format matching existing structure
  // Columns: Date, Task, Category, HRS, MINS
  // Task: WakaTime - {projectName}
  // Category: Development
}
```

#### Step 3.4: Implement Data Merging Logic

**File**: `src/utils/timeUtils.ts` (update existing)

Add functions:

```typescript
export function mergeWakaTimeWithManual(
  wakaTimeData: Record<string, number>,
  manualData: Record<string, number>
): Record<string, { manual: number; wakatime: number; difference: number }>;

export function calculateDiscrepancy(
  manual: number,
  wakatime: number
): { percentage: number; status: 'over' | 'under' | 'match' };
```

### Phase 4: UI/UX Enhancements (1-2 hours)

#### Step 4.1: Add Help & Documentation

**File**: `src/components/WakaTimeHelp.tsx` (new file)

Create collapsible help component with:

- "How to get your WakaTime API key" instructions
- Link to WakaTime dashboard
- API key security best practices
- Troubleshooting common issues
- Sample project names format
- Date range recommendations

#### Step 4.2: Implement Loading States

Add to WakaTimeTracker component:

- Skeleton loaders for results section
- Progress indicators for API calls
- Disable form during fetch operations
- Cancel button for ongoing requests

#### Step 4.3: Add Validation & Error Messages

Create validation rules:

- API key format validation (not empty, reasonable length)
- Date range validation (end >= start, not in future)
- Project name validation (not empty)
- Maximum date range (e.g., 90 days to prevent large responses)

Error message types:

- Network errors
- Authentication errors (401)
- Not found errors (404 - project doesn't exist)
- Rate limit errors (429)
- Server errors (500+)
- Parsing errors

### Phase 5: Testing & Polish (1-2 hours)

#### Step 5.1: Manual Testing Checklist

- [ ] API key validation works correctly
- [ ] Project name autocomplete functions
- [ ] Date range selection is intuitive
- [ ] Data fetching shows loading state
- [ ] Results display correctly
- [ ] Daily breakdown table renders properly
- [ ] Charts integrate without errors
- [ ] Export to CSV generates valid file
- [ ] Import to calculator populates fields
- [ ] Comparison view shows differences
- [ ] Error messages display appropriately
- [ ] Form state persists across page refreshes
- [ ] Mobile responsive design works
- [ ] Dark/light theme compatibility (if applicable)

#### Step 5.2: Error Scenario Testing

Test cases:

- Invalid API key
- Non-existent project name
- Empty date range
- Future date range
- Very large date range (>1 year)
- Network disconnection during fetch
- Malformed API responses
- Rate limit reached
- No data for selected period

#### Step 5.3: Performance Testing

- [ ] API response time under 3 seconds
- [ ] Caching reduces repeated calls
- [ ] Component renders without lag
- [ ] Charts update smoothly
- [ ] No memory leaks on repeated fetches
- [ ] localStorage doesn't exceed quotas

#### Step 5.4: Code Quality Review

- [ ] All TypeScript types properly defined
- [ ] No `any` types used
- [ ] Proper error handling in all async functions
- [ ] Console logs removed (or behind debug flag)
- [ ] Comments added for complex logic
- [ ] Code follows existing style guide
- [ ] No ESLint warnings or errors
- [ ] Components follow single responsibility principle

---

## Testing

### Unit Tests (Optional but Recommended)

**File**: `src/utils/wakatimeApi.test.ts` (new file)

Test coverage for:

- `parseWakaTimeResponse` with various API response formats
- `calculateDailyBreakdown` with edge cases (no data, single day, etc.)
- Date formatting functions
- Error message extraction
- Retry logic

**File**: `src/utils/timeUtils.test.ts` (update existing)

Add tests for:

- `mergeWakaTimeWithManual` with various data combinations
- `calculateDiscrepancy` with different percentage scenarios

### Integration Tests (Optional)

**File**: `src/components/WakaTimeTracker.test.tsx` (new file)

Test scenarios:

- Form submission with valid inputs
- Form validation with invalid inputs
- API success response handling
- API error response handling
- Loading state transitions

### Manual Testing Scenarios

1. **Happy Path**
   - User enters valid API key
   - User selects existing project
   - User chooses valid date range
   - Data fetches successfully
   - Results display correctly
   - User imports data to calculator
   - Charts update with new data

2. **Error Handling**
   - User enters invalid API key → Shows authentication error
   - User enters non-existent project → Shows "project not found" error
   - Network disconnects during fetch → Shows network error with retry option
   - API rate limit exceeded → Shows friendly message with wait time

3. **Edge Cases**
   - Empty project name → Validation prevents submission
   - Start date after end date → Validation error
   - Very large date range → Warning about potential slow response
   - No data for selected period → Shows "no data" message gracefully

4. **Data Integration**
   - WakaTime data merges correctly with existing manual data
   - Comparison chart shows accurate differences
   - Export includes all data sources
   - CSV import from WakaTime export works correctly

### Browser Compatibility Testing

Test on:

- [ ] Chrome 90+ (latest)
- [ ] Firefox 88+ (latest)
- [ ] Safari 14+ (latest)
- [ ] Edge 90+ (latest)

### Responsive Design Testing

Test on screen sizes:

- [ ] Mobile (320px - 480px)
- [ ] Tablet (481px - 768px)
- [ ] Desktop (769px - 1024px)
- [ ] Large Desktop (1025px+)

---

## Additional Considerations

### Security Notes

1. **API Key Storage**
   - API keys stored in localStorage are **not encrypted**
   - Add prominent warning to users about this
   - Consider adding option to "not remember API key"
   - Never log API keys to console
   - Never transmit API keys except to WakaTime API

2. **CORS Handling**
   - WakaTime API supports CORS for browser requests
   - If issues arise, document proxy server setup
   - Include fallback instructions for local development

3. **Data Privacy**
   - All data processing happens client-side
   - No data sent to third-party servers (except WakaTime)
   - Add privacy notice in help section

### Performance Optimization

1. **API Call Optimization**
   - Cache responses with 5-minute expiry
   - Debounce project name autocomplete (300ms)
   - Implement request cancellation for abandoned calls
   - Use AbortController for fetch operations

2. **Component Optimization**
   - Lazy load WakaTimeIntegration component
   - Memoize expensive calculations
   - Use React.memo for results display
   - Virtualize long daily breakdown tables (if >100 rows)

### Accessibility (A11Y)

1. **Keyboard Navigation**
   - All form inputs keyboard accessible
   - Focus indicators visible
   - Tab order logical
   - Enter key submits form

2. **Screen Readers**
   - Proper ARIA labels on all inputs
   - Loading states announced
   - Error messages associated with fields
   - Chart descriptions for non-visual users

3. **Visual Design**
   - Sufficient color contrast (WCAG AA)
   - No reliance on color alone for information
   - Scalable text (no fixed pixel sizes)
   - Focus indicators visible

### Future Enhancements (Out of Scope)

1. **Multiple Project Tracking**
   - Track multiple projects simultaneously
   - Aggregate view across projects
   - Project comparison dashboard

2. **Advanced Filtering**
   - Filter by Git branch
   - Filter by specific file types
   - Filter by time of day (business hours vs after hours)

3. **Goal Setting**
   - Set project hour goals
   - Progress tracking against goals
   - Notifications for milestones

4. **Historical Analysis**
   - Month-over-month trends
   - Year-over-year comparisons
   - Productivity insights

5. **Team Features**
   - Compare team member hours
   - Project allocation views
   - Team productivity metrics

6. **Advanced Exports**
   - PDF reports
   - Excel workbooks
   - JSON data dumps
   - Scheduled automated exports

---

## Timeline Estimate

| Phase | Duration | Complexity |
|-------|----------|------------|
| Phase 1: API Integration & Utilities | 2-3 hours | Medium |
| Phase 2: Component Development | 3-4 hours | High |
| Phase 3: Integration with Existing Features | 2-3 hours | Medium |
| Phase 4: UI/UX Enhancements | 1-2 hours | Low-Medium |
| Phase 5: Testing & Polish | 1-2 hours | Low |
| **Total** | **9-14 hours** | **Medium-High** |

**Note**: Timeline assumes:

- Familiarity with React, TypeScript, and the existing codebase
- Basic understanding of REST APIs
- Access to WakaTime account for testing
- No major architectural changes required

---

## Dependencies

### New NPM Packages (None Required)

The implementation can use existing dependencies:

- Native `fetch` API for HTTP requests
- Existing type system for TypeScript interfaces
- Current localStorage API for storage
- Existing Chart.js setup for visualizations

### Optional Enhancement Packages

If additional features desired:

- `date-fns` or `dayjs` - More robust date manipulation (currently using native Date)
- `react-query` or `swr` - Advanced data fetching with caching
- `crypto-js` - Client-side API key encryption (limited security benefit)
- `zod` - Runtime type validation for API responses

---

## Risks & Mitigations

### Risk 1: WakaTime API Rate Limiting

**Impact**: High
**Probability**: Medium
**Mitigation**:

- Implement request caching with reasonable TTL
- Add debouncing to user inputs
- Display rate limit warnings proactively
- Document best practices for date range selection

### Risk 2: API Key Security Concerns

**Impact**: High
**Probability**: Low
**Mitigation**:

- Clear security warnings in UI
- Option to not persist API key
- Documentation on WakaTime OAuth (future enhancement)
- No logging of sensitive data

### Risk 3: API Response Format Changes

**Impact**: Medium
**Probability**: Low
**Mitigation**:

- Robust error handling for unexpected response formats
- TypeScript interfaces catch structure changes early
- Comprehensive parsing error messages
- Fallback to generic display for unknown structures

### Risk 4: CORS Issues

**Impact**: Medium
**Probability**: Low (WakaTime supports CORS)
**Mitigation**:

- Document proxy setup if needed
- Test on multiple domains during development
- Provide clear error messages for CORS failures
- Include troubleshooting guide

### Risk 5: Large Date Ranges Performance

**Impact**: Low
**Probability**: Medium
**Mitigation**:

- Warn users about large date ranges (>90 days)
- Implement pagination for daily breakdown table
- Add "show more" functionality for long lists
- Optimize chart rendering for large datasets

---

## Success Criteria

The WakaTime integration will be considered successful when:

1. ✅ Users can authenticate with WakaTime API key
2. ✅ Users can select a project and date range
3. ✅ System fetches and displays accurate time data
4. ✅ Daily breakdown shows hours per day
5. ✅ Data integrates with existing calculator
6. ✅ Charts visualize WakaTime data correctly
7. ✅ Export to CSV includes WakaTime data
8. ✅ Error handling covers common failure scenarios
9. ✅ UI matches existing design system
10. ✅ Feature is responsive on mobile devices
11. ✅ Form state persists across sessions
12. ✅ No performance degradation in existing features
13. ✅ Security warnings are prominent and clear
14. ✅ Help documentation is comprehensive
15. ✅ All TypeScript types compile without errors

---

## Documentation Requirements

### User Documentation

Create or update `README.md` with:

- WakaTime integration section
- How to get WakaTime API key
- Step-by-step usage instructions
- Screenshots of the feature
- FAQ for common issues
- Security best practices

### Developer Documentation

Create `docs/WAKATIME_INTEGRATION.md` with:

- Architecture overview
- API integration details
- Component relationships
- State management flow
- Error handling strategy
- Extension points for future enhancements
- Testing guidelines

### Inline Code Documentation

Add JSDoc comments to:

- All public functions in `wakatimeApi.ts`
- Complex logic in components
- Type interfaces with descriptions
- Utility functions

Example:

```typescript
/**
 * Fetches project summary from WakaTime API for specified date range
 * @param config - WakaTime configuration including API key
 * @param request - Project details and date range
 * @returns Promise resolving to project summary data
 * @throws {Error} When API key is invalid or project not found
 */
export async function fetchProjectSummary(
  config: WakaTimeConfig,
  request: WakaTimeProjectRequest
): Promise<WakaTimeSummary> {
  // implementation
}
```

---

## Rollout Strategy

### Phase 1: Alpha (Internal Testing)

- Deploy to development environment
- Test with real WakaTime accounts
- Gather feedback on UX
- Fix critical bugs

### Phase 2: Beta (Limited Release)

- Add feature flag for gradual rollout
- Collect user feedback via form/survey
- Monitor error rates and API usage
- Iterate on UI based on feedback

### Phase 3: General Availability

- Enable for all users
- Publish updated documentation
- Announce feature in release notes
- Monitor usage analytics

### Monitoring & Metrics

Track the following:

- API success/failure rates
- Average response times
- Most common error types
- Feature usage percentage
- User feedback sentiment
- Performance impact on app load time

---

## Conclusion

This implementation plan provides a comprehensive roadmap for integrating WakaTime project hours tracking into the Work Hours Calculator application. The feature will enhance the app's capabilities by providing automatic time tracking data, reducing manual entry, and enabling powerful comparisons between planned and actual work hours.

The estimated development time of 9-14 hours assumes a single developer with appropriate skill levels. The modular approach ensures that each phase can be completed and tested independently, reducing risk and allowing for iterative improvements.

Key success factors:

- Maintain consistency with existing UI/UX patterns
- Prioritize security and user privacy
- Provide comprehensive error handling
- Ensure mobile responsiveness
- Create clear, helpful documentation

Upon completion, users will have a powerful tool that bridges manual work planning with automatic time tracking, providing insights into productivity and project progress that neither system could offer alone.
