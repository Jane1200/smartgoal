# Goal Progress & Wants Income Allocation - Implementation Guide

## Overview

This document outlines the new feature that allows goal progress to be based on wants income (from the 50/30/20 rule) rather than total income, with intelligent allocation based on goal time periods (short-term vs long-term) and marketplace income distribution.

## Backend Implementation ✅ COMPLETE

### Models Created

#### 1. **Goal.js** - Updated
- Added `timePeriod` field: `"short-term"` or `"long-term"`
- Added `wantsIncomeAllocation` field: percentage of wants income for this goal
- Default: Goals are long-term with 0% allocation

```javascript
timePeriod: {
  type: String,
  enum: ["short-term", "long-term"],
  default: "long-term"
},
wantsIncomeAllocation: {
  type: Number,
  min: 0,
  default: 0
}
```

#### 2. **MarketplaceIncome.js** - NEW
Tracks income from sold marketplace items with distribution status:
- `sellerId`: Who made the sale
- `marketplaceItemId`: Item that was sold
- `orderId`: Associated order
- `amount`: Sale price
- `status`: pending/confirmed/distributed/cancelled
- `distributionStatus`: Tracks if income has been allocated to goals

#### 3. **GoalAllocationPreference.js** - NEW
Stores user's preferences for how to allocate wants income:
- `shortTermRatio`: % of wants to short-term goals (default: 70%)
- `longTermRatio`: % of wants to long-term goals (default: 30%)
- `allocationMode`: "automatic" or "manual"
- `manualAllocations`: User-defined per-goal allocation percentages
- `allocationHistory`: Track all allocation transactions

### Backend Routes Added/Updated

#### Goals Routes (`/api/goals`)

**New Endpoints:**

1. **GET `/by-period`** - Get goals grouped by time period
   - Returns: `{ shortTerm: [...], longTerm: [...] }`

2. **GET `/allocation-preference/settings`** - Get allocation preferences
   - Returns: User's current allocation preference settings

3. **PUT `/allocation-preference/settings`** - Update allocation preferences
   ```json
   {
     "shortTermRatio": 70,
     "longTermRatio": 30,
     "allocationMode": "automatic"
   }
   ```

4. **POST `/distribute-wants-income`** - Distribute wants income to goals
   ```json
   {
     "wantsIncomeAmount": 5000
   }
   ```
   - Auto-allocates to goals based on time period preferences

5. **POST `/distribute-marketplace-income/:incomeId`** - Distribute marketplace income
   - Allocates entire marketplace income to goals using preference settings

**Updated Endpoints:**

- **POST `/` (Create)** - Now accepts:
  - `timePeriod`: "short-term" or "long-term"
  - `wantsIncomeAllocation`: percentage (0-100)

- **PUT `/:id` (Update)** - Can update the above fields

#### Finance Routes (`/api/finance`)

**New Endpoint:**

1. **GET `/wants-income`** - Calculate wants spending available for goals
   - Optional query: `month`, `year`
   - Returns: Total wants spending based on 50/30/20 rule
   - Expenses categorized as "wants": entertainment, shopping, travel

#### Marketplace Income Routes (`/api/marketplace-income`) - NEW

1. **GET `/`** - List all marketplace income
   - Query: `status` (all/pending/confirmed/distributed), `limit`, `page`

2. **GET `/undistributed`** - Get income not yet allocated to goals

3. **GET `/summary`** - Get total income statistics
   - Query: `startDate`, `endDate` (optional)

4. **GET `/:incomeId`** - Get single income record

### Order Processing Updated

When a marketplace item is sold (payment confirmed):
1. Item marked as sold
2. **New**: `MarketplaceIncome` entry created automatically
3. Entry status: "confirmed"
4. Seller can then distribute this income to their goals

## Frontend Implementation - RECOMMENDED

### Components to Create/Update

#### 1. **GoalFormModal.jsx** - UPDATE EXISTING
Add fields for goal setup:
```jsx
// Add these fields to your goal form:
<div className="form-group">
  <label>Goal Time Period</label>
  <select value={formData.timePeriod}>
    <option value="short-term">Short-term (0-1 year)</option>
    <option value="long-term">Long-term (1+ years)</option>
  </select>
</div>

<div className="form-group">
  <label>Initial Wants Income Allocation (%)</label>
  <input 
    type="number" 
    min="0" 
    max="100" 
    value={formData.wantsIncomeAllocation}
    onChange={...}
  />
</div>
```

#### 2. **GoalAllocationSettings.jsx** - NEW COMPONENT
User preferences UI:
```jsx
// Features:
- Toggle between "Automatic" and "Manual" allocation modes
- Automatic mode: Set short-term vs long-term ratio sliders
- Manual mode: Set per-goal allocation percentages
- Allocation history view
- Save preferences
```

**Implementation Path:**
```
client/src/components/GoalAllocationSettings.jsx
- GET /api/goals/allocation-preference/settings
- PUT /api/goals/allocation-preference/settings
```

#### 3. **WantsIncomeDistribution.jsx** - NEW COMPONENT
Distribute wants spending to goals:
```jsx
// Features:
- Show calculated wants spending from current month
- Display short-term vs long-term split preview
- Show which goals will receive allocations
- Button to confirm distribution
- Loading/success states
```

**Implementation Path:**
```
client/src/components/WantsIncomeDistribution.jsx
- GET /api/finance/wants-income (get total wants)
- GET /api/goals/by-period (get goals)
- POST /api/goals/distribute-wants-income
```

#### 4. **MarketplaceIncomePanel.jsx** - NEW COMPONENT
View and distribute marketplace sales income:
```jsx
// Features for sellers:
- List of all sold items
- Show undistributed income
- Allocate each sale to goals
- Income statistics/summary
- Track distribution history
```

**Implementation Path:**
```
client/src/components/MarketplaceIncomePanel.jsx
- GET /api/marketplace-income (list)
- GET /api/marketplace-income/undistributed
- GET /api/marketplace-income/summary
- POST /api/goals/distribute-marketplace-income/:incomeId
```

#### 5. **GoalsOverview.jsx** - UPDATE EXISTING
Enhance the goals display:
```jsx
// Updates:
- Group goals by time period (short-term/long-term)
- Display wants income allocation % for each goal
- Show progress bars with allocated amount vs target
- Color-code by time period
- Show contribution from wants vs marketplace income
```

#### 6. **FinancesPage.jsx** - UPDATE EXISTING
Add wants income section:
```jsx
// Changes:
- Display the 50/30/20 breakdown with wants highlighted
- Add "Allocate Wants to Goals" action
- Show how much wants income is available
- Link to allocation settings
```

### API Utility Functions

Create helper functions in `client/src/utils/`:

```javascript
// goalAllocationApi.js
export async function getGoalsByPeriod() {
  return api.get('/goals/by-period');
}

export async function getAllocationPreference() {
  return api.get('/goals/allocation-preference/settings');
}

export async function updateAllocationPreference(data) {
  return api.put('/goals/allocation-preference/settings', data);
}

export async function distributeWantsIncome(amount) {
  return api.post('/goals/distribute-wants-income', { 
    wantsIncomeAmount: amount 
  });
}

export async function distributeMarketplaceIncome(incomeId) {
  return api.post(`/goals/distribute-marketplace-income/${incomeId}`);
}

// marketplaceIncomeApi.js
export async function getMarketplaceIncome(params) {
  return api.get('/marketplace-income', { params });
}

export async function getUndistributedIncome() {
  return api.get('/marketplace-income/undistributed');
}

export async function getMarketplaceIncomeSummary(startDate, endDate) {
  return api.get('/marketplace-income/summary', {
    params: { startDate, endDate }
  });
}
```

## User Flow

### Setting Up Goals with Time Periods

1. User creates/edits a goal
2. Sets goal as "short-term" or "long-term"
3. Optionally sets wants income allocation percentage
4. Goal progress now accumulates from:
   - Direct manual additions
   - Wants income distribution
   - Marketplace sales income distribution

### Allocating Wants Income to Goals

1. User views Finance page
2. Sees 50/30/20 breakdown with wants highlighted
3. Clicks "Allocate Wants to Goals"
4. System calculates wants spending from current month
5. Based on user's preference settings:
   - **Automatic**: Splits wants between short-term (70%) and long-term (30%) goals evenly
   - **Manual**: Uses user-defined per-goal percentages
6. Goal progress updated with allocated amounts

### Distributing Marketplace Income to Goals

1. Seller lists item and sells it
2. After payment confirmation, MarketplaceIncome entry created
3. Seller views their sales in marketplace panel
4. Clicks "Allocate to Goals" on undistributed income
5. Income distributed to goals using allocation preferences
6. Goal progress updated

## Database Queries

### Getting goal progress including allocations:
```javascript
// This shows how much each goal has received from different sources
// Direct: Manual additions
// Wants: From wants income allocation
// Marketplace: From sold items
const goal = await Goal.findById(goalId);
// goal.currentAmount includes all allocations
```

### Tracking allocation sources:
```javascript
// Via GoalAllocationPreference.allocationHistory
const preference = await GoalAllocationPreference.findOne({ userId });
// Shows all allocation transactions with dates and amounts
```

### Marketplace income status:
```javascript
// Get seller's sales not yet allocated to goals
const undistributed = await MarketplaceIncome.getUndistributedIncome(sellerId);
// Get all sales with distribution details
const sales = await MarketplaceIncome.find({ sellerId });
```

## Testing Checklist

### Backend Tests
- [ ] Create goal with timePeriod = "short-term"
- [ ] Update goal's wantsIncomeAllocation field
- [ ] Get goals grouped by period
- [ ] Create allocation preference
- [ ] Update allocation preference with 70/30 split
- [ ] Distribute ₹5000 wants income (70% to short-term, 30% to long-term)
- [ ] Verify goal currentAmount increased
- [ ] Create marketplace income on order payment
- [ ] Distribute marketplace income to goals
- [ ] Get marketplace income summary

### Frontend Tests
- [ ] Can create goal with time period selection
- [ ] Allocation settings page loads and updates
- [ ] Wants income calculation shows correct amount
- [ ] Distribution preview shows split correctly
- [ ] Goals update after distribution
- [ ] Marketplace sales panel shows undistributed income
- [ ] Can allocate marketplace income
- [ ] Goals dashboard shows time period grouping

## Important Notes

### Backward Compatibility
- Existing goals default to "long-term" with 0% wants allocation
- They continue to work as before
- No breaking changes to existing endpoints

### Data Migration
If needed, migrate existing goals:
```javascript
// Add to a migration script
db.goals.updateMany(
  { timePeriod: { $exists: false } },
  { $set: { timePeriod: "long-term", wantsIncomeAllocation: 0 } }
);
```

### Performance Considerations
- MarketplaceIncome entries created on payment confirmation (async recommended)
- GoalAllocationPreference indexed by userId for fast lookups
- Allocation history can grow large - consider archival strategy

### Future Enhancements
1. Goal funding notifications ("You received ₹X from wants allocation")
2. Recurring automatic distribution of wants income
3. Smart allocation based on goal due dates
4. Goal funding predictions
5. Marketplace income analytics dashboard

## Summary

The system now enables:
✅ **Time-based goal prioritization** - Short-term goals get priority funding
✅ **Wants-based income allocation** - Based on 50/30/20 rule, not total income
✅ **Marketplace income integration** - Resale proceeds automatically available for goal funding
✅ **Flexible allocation modes** - Automatic or manual control
✅ **Allocation tracking** - Full audit trail of how goals were funded