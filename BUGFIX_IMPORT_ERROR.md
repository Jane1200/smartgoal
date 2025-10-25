# Bug Fix: Missing Import in Goals.jsx

## Issue
```
Uncaught ReferenceError: sortGoalsByPriority is not defined
    at GoalsPage (Goals.jsx:333:61)
```

## Root Cause
The `sortGoalsByPriority` function was used in the Goals.jsx component but was not imported from the `goalPriority.js` utility module.

## Solution
Added `sortGoalsByPriority` to the import statement in Goals.jsx.

### Before:
```javascript
import { 
  getPriorityGoals, 
  hasEmergencyFund, 
  calculateEmergencyFundTarget,
  getCategoryInfo,
  getPriorityInfo
} from "@/utils/goalPriority.js";
```

### After:
```javascript
import { 
  getPriorityGoals, 
  hasEmergencyFund, 
  calculateEmergencyFundTarget,
  getCategoryInfo,
  getPriorityInfo,
  sortGoalsByPriority  // ✅ Added this
} from "@/utils/goalPriority.js";
```

## File Modified
- `client/src/pages/dashboard/Goals.jsx` - Line 14

## Status
✅ **Fixed** - The application should now work correctly without the ReferenceError.

## Testing
To verify the fix:
1. Navigate to the Goals page
2. Check that the Priority Goals section displays correctly
3. Verify that goals are sorted by priority
4. Ensure no console errors appear

## Related Functions
All utility functions from `goalPriority.js` that are used in Goals.jsx:
- ✅ `getPriorityGoals` - Filters priority goals
- ✅ `hasEmergencyFund` - Checks for emergency fund
- ✅ `calculateEmergencyFundTarget` - Calculates target amount
- ✅ `getCategoryInfo` - Gets category metadata
- ✅ `getPriorityInfo` - Gets priority metadata
- ✅ `sortGoalsByPriority` - Sorts goals by priority (NOW IMPORTED)

## Prevention
When adding new utility functions:
1. Always check that all used functions are imported
2. Use IDE auto-import features when available
3. Test the component after adding new functionality
4. Run build to catch missing imports early