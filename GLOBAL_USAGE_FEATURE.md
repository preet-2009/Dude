# Global Credit Usage Feature

## Overview
Added a new feature that displays the total credits used by all users today in the top right corner of the taskbar.

## Changes Made

### 1. Database (server/db.js)
- Created new table `global_credit_usage` to track daily credit usage across all users
- Added index on date column for efficient queries
- Table structure:
  - `id`: Serial primary key
  - `date`: Date (defaults to current date, unique)
  - `credits_used`: Integer (tracks total credits used)

### 2. Backend API (server/routes/chat.js)
- Modified `/api/chat/send` endpoint to increment global usage when credits are deducted
- Added new endpoint `/api/chat/global-usage` (GET) that returns today's total credit usage
- Uses PostgreSQL's `ON CONFLICT` to update existing daily record or create new one

### 3. Frontend UI (public/index.html)
- Added new `global-usage-display` div in the topbar-right section
- Displays:
  - Clock icon
  - Number of credits used (formatted with commas)
  - Label "used today"
- Positioned before the user's personal credits display
- Includes tooltip on hover explaining it shows global usage

### 4. Styling (public/css/style.css)
- Added `.global-usage-display` styles matching the credits display design
- Responsive: Hidden on mobile devices (≤768px) to save space
- Hover effects for better UX
- Uses theme variables for consistent appearance

### 5. JavaScript Logic (public/js/app.js)
- Added `updateGlobalUsageUI()` function that fetches and displays global usage
- Formats numbers with commas for readability (e.g., "1,234")
- Auto-updates on page load
- Refreshes every 30 seconds to show near real-time data
- Exposed globally so other modules can trigger updates

### 6. Real-time Updates (public/js/chat.js)
- Calls `updateGlobalUsageUI()` after each message is sent
- Ensures the counter updates immediately when user sends a message
- Provides instant feedback on global platform usage

## How It Works

1. **Tracking**: Every time a non-owner user sends a message (costs 5 credits), the global counter increments by 5
2. **Storage**: Daily totals are stored in the database with the current date as the key
3. **Display**: The UI fetches the current day's total and displays it formatted
4. **Updates**: 
   - Automatic refresh every 30 seconds
   - Immediate update after sending a message
   - On page load

## User Experience

- Users can see how active the platform is globally
- Creates a sense of community and platform engagement
- Transparent about overall usage
- Non-intrusive design that matches existing UI
- Tooltip explains what the number represents

## Technical Details

- **Database**: PostgreSQL with atomic increment operations
- **API**: RESTful endpoint with error handling
- **Frontend**: Vanilla JavaScript with async/await
- **Performance**: Efficient queries with indexed date column
- **Scalability**: Daily records prevent table bloat

## Future Enhancements

Potential improvements:
- Show weekly/monthly totals
- Display user count or active users
- Add sparkline chart showing usage trend
- Gamification elements (milestones, achievements)
- Regional breakdown of usage
