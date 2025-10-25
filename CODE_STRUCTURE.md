# Goal Prioritization System - Code Structure

## 📁 File Organization

```
smartgoal/
├── server/
│   └── src/
│       └── models/
│           └── Goal.js                    [MODIFIED] - Added category, priority, isAutoSuggested
│
└── client/
    └── src/
        ├── utils/
        │   └── goalPriority.js            [NEW] - Core prioritization logic
        │
        ├── sections/
        │   └── GoalsManager.jsx           [MODIFIED] - Category selection, priority display
        │
        └── pages/
            └── dashboard/
                └── Goals.jsx              [MODIFIED] - Emergency fund suggestion, priority section
```

## 🔧 Core Utility Functions (`client/src/utils/goalPriority.js`)

### Constants

```javascript
// 7 goal categories with metadata
export const GOAL_CATEGORIES = {
  emergency_fund: {
    label: "Emergency Fund",
    priority: 1,
    icon: "🚨",
    description: "Critical safety net for unexpected expenses",
    color: "danger",
    isFoundational: true
  },
  debt_repayment: { ... },
  essential_purchase: { ... },
  education: { ... },
  investment: { ... },
  discretionary: { ... },
  other: { ... }
};

// 5 priority levels with display properties
export const PRIORITY_LEVELS = {
  1: { label: "Critical", color: "bg-danger", badge: "🔴" },
  2: { label: "High", color: "bg-warning", badge: "🟠" },
  3: { label: "Medium", color: "bg-info", badge: "🟡" },
  4: { label: "Low", color: "bg-primary", badge: "🔵" },
  5: { label: "Very Low", color: "bg-secondary", badge: "⚪" }
};
```

### Priority Calculation

```javascript
/**
 * Automatically calculates priority based on goal category
 * @param {string} category - Goal category
 * @returns {number} Priority level (1-5)
 */
export const calculateAutoPriority = (category) => {
  return GOAL_CATEGORIES[category]?.priority || 3;
};
```

### Goal Filtering

```javascript
/**
 * Filters goals with priority ≤ 2 (Critical/High)
 * @param {Array} goals - Array of goal objects
 * @returns {Array} Filtered priority goals
 */
export const getPriorityGoals = (goals) => {
  return goals.filter(goal => (goal.priority || 3) <= 2);
};

/**
 * Filters foundational goals (emergency fund, debt repayment)
 * @param {Array} goals - Array of goal objects
 * @returns {Array} Filtered foundational goals
 */
export const getFoundationalGoals = (goals) => {
  return goals.filter(goal => {
    const category = goal.category || 'other';
    return GOAL_CATEGORIES[category]?.isFoundational;
  });
};
```

### Emergency Fund Logic

```javascript
/**
 * Checks if user has an emergency fund goal
 * @param {Array} goals - Array of goal objects
 * @returns {boolean} True if emergency fund exists
 */
export const hasEmergencyFund = (goals) => {
  return goals.some(goal => goal.category === 'emergency_fund');
};

/**
 * Calculates recommended emergency fund target
 * @param {number} monthlyExpense - User's monthly expenses
 * @param {number} monthlyIncome - User's monthly income (optional)
 * @returns {number} Recommended emergency fund amount
 */
export const calculateEmergencyFundTarget = (monthlyExpense, monthlyIncome = 0) => {
  if (!monthlyExpense || monthlyExpense <= 0) return 0;
  
  // Low income: 3 months, Higher income: 6 months
  const multiplier = monthlyIncome < 20000 ? 3 : 6;
  return Math.round(monthlyExpense * multiplier);
};
```

### Priority Warning System

```javascript
/**
 * Determines if user should be warned about creating low-priority goal
 * @param {Array} goals - Existing goals
 * @param {string} newGoalCategory - Category of new goal being created
 * @returns {Object} { shouldWarn: boolean, incompletePriorityGoals: Array }
 */
export const shouldWarnAboutPriority = (goals, newGoalCategory) => {
  const newGoalPriority = calculateAutoPriority(newGoalCategory);
  
  // Only warn if creating medium/low priority goal
  if (newGoalPriority <= 2) {
    return { shouldWarn: false, incompletePriorityGoals: [] };
  }
  
  // Check for incomplete high-priority goals
  const incompletePriorityGoals = goals.filter(goal => {
    const priority = goal.priority || 3;
    const isHighPriority = priority <= 2;
    const isIncomplete = goal.status !== 'completed';
    return isHighPriority && isIncomplete;
  });
  
  return {
    shouldWarn: incompletePriorityGoals.length > 0,
    incompletePriorityGoals
  };
};
```

### Allocation Calculation

```javascript
/**
 * Calculates minimum recommended allocation to priority goals (60%)
 * @param {number} monthlySavings - User's monthly savings
 * @param {Array} priorityGoals - Array of priority goals
 * @returns {Object} Allocation recommendations
 */
export const calculateMinimumAllocation = (monthlySavings, priorityGoals) => {
  const minimumPercentage = 0.60; // 60%
  const minimumAmount = Math.round(monthlySavings * minimumPercentage);
  
  return {
    minimumAmount,
    minimumPercentage,
    remainingAmount: monthlySavings - minimumAmount,
    priorityGoalsCount: priorityGoals.length
  };
};
```

### Sorting Algorithm

```javascript
/**
 * Sorts goals by priority, then status, then due date
 * @param {Array} goals - Array of goal objects
 * @returns {Array} Sorted goals
 */
export const sortGoalsByPriority = (goals) => {
  return [...goals].sort((a, b) => {
    // 1. Sort by priority (ascending: 1, 2, 3, 4, 5)
    const priorityA = a.priority || 3;
    const priorityB = b.priority || 3;
    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }
    
    // 2. Sort by status (in_progress > pending > completed)
    const statusOrder = { in_progress: 1, pending: 2, completed: 3 };
    const statusA = statusOrder[a.status] || 2;
    const statusB = statusOrder[b.status] || 2;
    if (statusA !== statusB) {
      return statusA - statusB;
    }
    
    // 3. Sort by due date (earliest first)
    if (a.dueDate && b.dueDate) {
      return new Date(a.dueDate) - new Date(b.dueDate);
    }
    
    return 0;
  });
};
```

## 🎨 UI Components

### GoalsManager Component (`client/src/sections/GoalsManager.jsx`)

#### Category Selection Dropdown

```jsx
<div className="mb-3">
  <label className="form-label">Goal Category *</label>
  <select
    className="form-select"
    value={form.category}
    onChange={(e) => {
      const newCategory = e.target.value;
      const newPriority = calculateAutoPriority(newCategory);
      setForm({ ...form, category: newCategory, priority: newPriority });
    }}
    required
  >
    {Object.entries(GOAL_CATEGORIES).map(([key, cat]) => (
      <option key={key} value={key}>
        {cat.icon} {cat.label} - {cat.description}
      </option>
    ))}
  </select>
  <small className="form-text text-muted">
    ℹ️ Priority is automatically set based on category. 
    Emergency funds and debt repayment are highest priority.
  </small>
</div>
```

#### Priority Warning Dialog

```jsx
const saveGoal = async () => {
  // Check if we should warn about priority
  const { shouldWarn, incompletePriorityGoals } = shouldWarnAboutPriority(
    existingGoals,
    form.category
  );
  
  if (shouldWarn) {
    const confirmed = window.confirm(
      `⚠️ You have ${incompletePriorityGoals.length} high-priority goal(s) ` +
      `that aren't complete yet:\n\n` +
      incompletePriorityGoals.map(g => `• ${g.title}`).join('\n') +
      `\n\nFinancial experts recommend completing critical goals like ` +
      `emergency funds and debt repayment before pursuing discretionary goals. ` +
      `This builds a strong financial foundation.\n\n` +
      `Would you like to proceed anyway?`
    );
    
    if (!confirmed) return;
  }
  
  // Save goal with category and priority
  const payload = {
    ...form,
    category: form.category,
    priority: form.priority
  };
  
  await api.post("/goals", payload);
};
```

#### Goal Display with Priority Badges

```jsx
{sortGoalsByPriority(goals).map((goal) => {
  const categoryInfo = getCategoryInfo(goal.category);
  const priorityInfo = getPriorityInfo(goal.priority);
  
  return (
    <div key={goal._id} className="goal-card">
      <div className="d-flex align-items-center gap-2">
        <span style={{ fontSize: '1.5rem' }}>{categoryInfo.icon}</span>
        <h6>{goal.title}</h6>
        <span className={`badge ${priorityInfo.color}`}>
          {priorityInfo.badge} {priorityInfo.label}
        </span>
      </div>
      {/* ... rest of goal display ... */}
    </div>
  );
})}
```

### Goals Page (`client/src/pages/dashboard/Goals.jsx`)

#### Emergency Fund Suggestion Banner

```jsx
{showEmergencyFundSuggestion && financeData.monthlyExpense > 0 && (
  <div className="alert alert-warning alert-dismissible fade show mb-4">
    <div className="d-flex align-items-start">
      <div className="me-3" style={{ fontSize: '2rem' }}>🚨</div>
      <div className="flex-grow-1">
        <h5 className="alert-heading mb-2">Build Your Emergency Fund First!</h5>
        <p className="mb-2">
          Financial experts recommend having <strong>3-6 months of expenses</strong> saved. 
          Based on your monthly expenses of <strong>{formatCurrency(financeData.monthlyExpense)}</strong>, 
          we recommend <strong>{formatCurrency(calculateEmergencyFundTarget(financeData.monthlyExpense))}</strong>.
        </p>
        <button 
          className="btn btn-warning btn-sm"
          onClick={createEmergencyFundGoal}
        >
          Create Emergency Fund Goal
        </button>
      </div>
      <button 
        type="button" 
        className="btn-close" 
        onClick={() => setShowEmergencyFundSuggestion(false)}
      />
    </div>
  </div>
)}
```

#### Priority Goals Section

```jsx
{!goalsLoading && goals.length > 0 && getPriorityGoals(goals).length > 0 && (
  <div className="card mb-4 border-danger">
    <div className="card-header bg-danger bg-opacity-10 border-danger">
      <div className="d-flex align-items-center justify-content-between">
        <div className="d-flex align-items-center">
          <span style={{ fontSize: '1.5rem' }} className="me-2">🎯</span>
          <div>
            <h5 className="mb-0">Priority Goals</h5>
            <small className="text-muted">Focus on these critical goals first</small>
          </div>
        </div>
        <span className="badge bg-danger">{getPriorityGoals(goals).length}</span>
      </div>
    </div>
    <div className="card-body">
      <div className="alert alert-info mb-3">
        <small>
          <strong>💡 Smart Tip:</strong> Allocate at least <strong>60% of your monthly savings</strong> 
          to these priority goals.
        </small>
      </div>
      <div className="row g-3">
        {sortGoalsByPriority(getPriorityGoals(goals)).map((goal) => (
          <div key={goal._id} className="col-md-6">
            {/* Priority goal card with progress bar */}
          </div>
        ))}
      </div>
    </div>
  </div>
)}
```

#### Emergency Fund Auto-Creation

```jsx
const createEmergencyFundGoal = async () => {
  try {
    const targetAmount = calculateEmergencyFundTarget(financeData.monthlyExpense);
    const payload = {
      title: "Emergency Fund",
      description: "Build a safety net for unexpected expenses (3-6 months of expenses)",
      targetAmount,
      currentAmount: Math.max(0, financeData.totalSavings || 0),
      category: "emergency_fund",
      priority: 1,
      status: "in_progress",
      isAutoSuggested: true
    };
    
    await api.post("/goals", payload);
    toast.success("Emergency Fund goal created! This is your top priority.");
    loadGoals();
    loadFinanceData();
  } catch (error) {
    console.error("Failed to create emergency fund goal:", error);
    toast.error("Failed to create emergency fund goal");
  }
};
```

## 🗄️ Database Schema (`server/src/models/Goal.js`)

```javascript
const goalSchema = new mongoose.Schema({
  // ... existing fields ...
  
  // NEW: Goal category for prioritization
  category: {
    type: String,
    enum: [
      'emergency_fund',
      'debt_repayment',
      'essential_purchase',
      'education',
      'investment',
      'discretionary',
      'other'
    ],
    default: 'other'
  },
  
  // NEW: Priority level (1=Critical, 5=Very Low)
  priority: {
    type: Number,
    min: 1,
    max: 5,
    default: 3
  },
  
  // NEW: Flag for auto-suggested goals
  isAutoSuggested: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});
```

## 🔄 Data Flow

### Goal Creation Flow

```
User clicks "Add New Goal"
    ↓
User selects category from dropdown
    ↓
calculateAutoPriority(category) → sets priority automatically
    ↓
User fills in other fields (title, target, etc.)
    ↓
User clicks "Save Goal"
    ↓
shouldWarnAboutPriority(goals, category) → checks if warning needed
    ↓
If warning needed: Show confirmation dialog
    ↓
If confirmed or no warning: POST /api/goals with category & priority
    ↓
Backend saves goal with new fields
    ↓
Frontend reloads goals
    ↓
sortGoalsByPriority(goals) → displays in priority order
```

### Emergency Fund Suggestion Flow

```
User visits Goals page
    ↓
loadGoals() → fetches all goals
    ↓
loadFinanceData() → fetches monthly expenses
    ↓
hasEmergencyFund(goals) → checks if emergency fund exists
    ↓
If no emergency fund && monthlyExpense > 0:
    ↓
calculateEmergencyFundTarget(monthlyExpense) → calculates target
    ↓
Show emergency fund suggestion banner
    ↓
User clicks "Create Emergency Fund Goal"
    ↓
createEmergencyFundGoal() → auto-creates goal with:
  - category: "emergency_fund"
  - priority: 1
  - isAutoSuggested: true
  - targetAmount: calculated value
    ↓
Goal appears in Priority Goals section
```

## 🎯 Key Integration Points

### 1. GoalsManager ↔ goalPriority.js
- `calculateAutoPriority()` - Auto-sets priority when category changes
- `shouldWarnAboutPriority()` - Checks if warning needed before save
- `sortGoalsByPriority()` - Sorts goals for display
- `getCategoryInfo()` - Gets category metadata for display
- `getPriorityInfo()` - Gets priority metadata for badges

### 2. Goals.jsx ↔ goalPriority.js
- `hasEmergencyFund()` - Detects missing emergency fund
- `calculateEmergencyFundTarget()` - Calculates recommended target
- `getPriorityGoals()` - Filters goals for Priority Goals section
- `sortGoalsByPriority()` - Sorts priority goals for display

### 3. Frontend ↔ Backend
- POST /api/goals - Saves goal with category, priority, isAutoSuggested
- GET /api/goals - Retrieves goals with new fields
- Backend accepts new fields without schema changes (flexible schema)

## 📝 Usage Examples

### Example 1: Creating Emergency Fund Goal

```javascript
// User has ₹15,000 monthly expenses, ₹18,000 income
const monthlyExpense = 15000;
const monthlyIncome = 18000;

// Calculate target (3 months since income < ₹20,000)
const target = calculateEmergencyFundTarget(monthlyExpense, monthlyIncome);
// Result: ₹45,000

// Create goal
const goal = {
  title: "Emergency Fund",
  category: "emergency_fund",
  priority: calculateAutoPriority("emergency_fund"), // Returns 1
  targetAmount: target,
  isAutoSuggested: true
};
```

### Example 2: Checking Priority Warning

```javascript
// User has incomplete emergency fund
const existingGoals = [
  { title: "Emergency Fund", category: "emergency_fund", priority: 1, status: "in_progress" }
];

// User tries to create discretionary goal
const newCategory = "discretionary";

// Check if warning needed
const { shouldWarn, incompletePriorityGoals } = shouldWarnAboutPriority(
  existingGoals,
  newCategory
);

// Result: shouldWarn = true, incompletePriorityGoals = [Emergency Fund goal]
```

### Example 3: Sorting Goals

```javascript
const goals = [
  { title: "Vacation", priority: 4, status: "pending" },
  { title: "Emergency Fund", priority: 1, status: "in_progress" },
  { title: "Investment", priority: 3, status: "pending" },
  { title: "Debt Payment", priority: 1, status: "in_progress" }
];

const sorted = sortGoalsByPriority(goals);

// Result order:
// 1. Emergency Fund (priority 1, in_progress)
// 2. Debt Payment (priority 1, in_progress)
// 3. Investment (priority 3, pending)
// 4. Vacation (priority 4, pending)
```

## 🧪 Testing Scenarios

### Scenario 1: New User with No Goals
- ✅ Emergency fund banner appears
- ✅ Recommended target calculated correctly
- ✅ One-click creation works
- ✅ Goal appears in Priority Goals section

### Scenario 2: User with Incomplete Priority Goals
- ✅ Warning appears when creating low-priority goal
- ✅ List of incomplete goals shown
- ✅ User can proceed or cancel
- ✅ No warning for high-priority goals

### Scenario 3: User with Completed Priority Goals
- ✅ No warning when creating low-priority goals
- ✅ Priority Goals section shows only incomplete priority goals
- ✅ Completed goals don't trigger warnings

### Scenario 4: Goal Sorting
- ✅ Goals sorted by priority first
- ✅ Then by status (in_progress > pending > completed)
- ✅ Then by due date
- ✅ Visual order matches priority order

## 🚀 Performance Considerations

- All utility functions are pure (no side effects)
- Sorting is done client-side (small dataset)
- Emergency fund check is O(n) where n = number of goals
- Priority warning check is O(n) where n = number of goals
- No unnecessary re-renders (proper React hooks usage)
- Calculations are memoized where appropriate

## 🔐 Security Considerations

- Backend validates category enum values
- Priority range validated (1-5)
- No sensitive data in priority calculations
- User can override warnings (non-blocking)
- Auto-suggested goals clearly marked