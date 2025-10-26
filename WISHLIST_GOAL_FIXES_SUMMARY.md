# Wishlist Goal Integration Fixes

## Issues Fixed

### 1. ❌ Wishlist goals not appearing in Goals page
**Root Cause**: Goals created from wishlist items were missing required fields (`category`, `priority`, `status`, `dueDate`), causing them to not display properly or failing validation.

**Solution**: Updated both `WishlistManager` and `WishlistScraper` to include all required fields when creating goals.

### 2. ❌ Wishlist priority always set to Medium (3)
**Root Cause**: The wishlist priority (string: "low", "medium", "high") was not being mapped to goal priority (number: 1-5).

**Solution**: Created a priority mapping function that correctly converts:
- Wishlist `"high"` → Goal priority `2` (High)
- Wishlist `"medium"` → Goal priority `3` (Medium)
- Wishlist `"low"` → Goal priority `4` (Low)

### 3. ❌ No due date setting for wishlist items
**Root Cause**: The Wishlist model didn't have a `dueDate` field.

**Solution**: Added `dueDate` field to both the database model and UI forms.

---

## Changes Made

### Backend Changes

#### 1. Wishlist Model (`server/src/models/Wishlist.js`)
✅ **Added `dueDate` field**:
```javascript
dueDate: { type: Date }, // When user wants to purchase this item by
```

### Frontend Changes

#### 2. WishlistManager Component (`client/src/sections/WishlistManager.jsx`)

✅ **Added `dueDate` to form state**:
```javascript
const emptyForm = {
  // ... existing fields
  dueDate: "",
};
```

✅ **Created priority mapping function**:
```javascript
const mapWishlistPriorityToGoalPriority = (wishlistPriority) => {
  const priorityMap = {
    high: 2,    // High priority wishlist item → High priority goal
    medium: 3,  // Medium priority wishlist item → Medium priority goal
    low: 4,     // Low priority wishlist item → Low priority goal
  };
  return priorityMap[wishlistPriority] || 3; // Default to medium (3)
};
```

✅ **Updated `createGoalFromWishlist` function** to include all required fields:
```javascript
async function createGoalFromWishlist(item) {
  const payload = {
    title: item.title,
    description: item.description,
    targetAmount: item.price ?? 0,
    currentAmount: 0,
    category: "discretionary", // ✨ NEW: Wishlist items are discretionary wants
    priority: mapWishlistPriorityToGoalPriority(item.priority), // ✨ NEW: Mapped priority
    status: "planned", // ✨ NEW: Initial status
    dueDate: item.dueDate || undefined, // ✨ NEW: Target purchase date
    sourceWishlistId: item._id || item.id, // Link to source wishlist item
  };

  return api.post("/goals", payload);
}
```

✅ **Added "Target Purchase Date" field to UI form**:
```javascript
<div>
  <label className="form-label fw-semibold small">Target Purchase Date</label>
  <input
    className="form-control"
    type="date"
    value={form.dueDate}
    min={new Date().toISOString().split('T')[0]}
    onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
  />
  <small className="text-muted">Optional: When do you want to purchase this?</small>
</div>
```

#### 3. WishlistScraper Component (`client/src/components/WishlistScraper.jsx`)

✅ **Updated goal creation** to include all required fields:
```javascript
await api.post("/goals", {
  title: data.title,
  description: data.description,
  targetAmount: data.price ?? 0,
  currentAmount: 0,
  category: "discretionary", // ✨ NEW: Wishlist items are discretionary wants
  priority: priorityMap[data.priority] || 3, // ✨ NEW: Mapped priority
  status: "planned", // ✨ NEW: Initial status
  dueDate: data.dueDate || undefined, // ✨ NEW: Target purchase date
  sourceWishlistId: data._id // Link to source wishlist item
});
```

✅ **Added Priority and Target Purchase Date fields** to the scraper form:
```javascript
<div className="row g-3">
  <div className="col-md-6">
    <label className="form-label">Priority</label>
    <select
      className="form-control"
      value={editingData.priority || 'medium'}
      onChange={(e) => handleFieldChange('priority', e.target.value)}
    >
      <option value="low">Low</option>
      <option value="medium">Medium</option>
      <option value="high">High</option>
    </select>
    <small className="text-muted">How important is this purchase?</small>
  </div>
  <div className="col-md-6">
    <label className="form-label">Target Purchase Date</label>
    <input
      type="date"
      className="form-control"
      value={editingData.dueDate || ''}
      min={new Date().toISOString().split('T')[0]}
      onChange={(e) => handleFieldChange('dueDate', e.target.value)}
    />
    <small className="text-muted">Optional: When do you want to purchase?</small>
  </div>
</div>
```

---

## How It Works Now

### Creating a Wishlist Item
1. **User adds product** via URL scraping or manual form
2. **Sets priority** (low/medium/high) and optional **target purchase date**
3. **Wishlist item is saved** with all fields including `dueDate`
4. **Goal is automatically created** with:
   - ✅ Category: `"discretionary"` (since wishlist items are wants)
   - ✅ Priority: Correctly mapped from wishlist priority
   - ✅ Status: `"planned"`
   - ✅ Due Date: Copied from wishlist `dueDate`
   - ✅ `sourceWishlistId`: Links back to the wishlist item
5. **Goal now appears in Goals page** with correct priority and due date!

### Priority Mapping
| Wishlist Priority | Goal Priority Number | Goal Priority Label | Description |
|-------------------|---------------------|---------------------|-------------|
| High              | 2                   | High Priority       | Important purchases |
| Medium (default)  | 3                   | Medium Priority     | Moderate importance |
| Low               | 4                   | Low Priority        | Can wait |

### Goal Categories for Wishlist Items
All wishlist-based goals are marked as **"discretionary"** category because:
- They represent "wants" not "needs"
- This aligns with the goal prioritization system
- Users are warned if they create discretionary goals before completing critical goals (emergency fund, debt repayment)

---

## Benefits

### ✅ Wishlist Goals Now Visible
Goals created from wishlist items now appear in the Goals page with all their details.

### ✅ Proper Priority Display
Wishlist priority is correctly reflected in the goal's priority level, making it easy to see which items are most important.

### ✅ Due Date Tracking
Users can set a target purchase date for wishlist items, which becomes the goal's due date, helping with financial planning.

### ✅ Better Financial Planning
The system now properly categorizes wishlist items as "discretionary" goals, ensuring users prioritize critical financial goals first.

### ✅ Consistent Data Flow
Both manual wishlist creation and URL scraping now create complete, valid goals.

---

## Testing Checklist

- [✅] Add wishlist item manually with priority "high" → Goal created with priority 2
- [✅] Add wishlist item manually with priority "medium" → Goal created with priority 3
- [✅] Add wishlist item manually with priority "low" → Goal created with priority 4
- [✅] Set target purchase date → Goal gets the same due date
- [✅] Add product via URL scraper → Goal created with all fields
- [✅] Goal appears in Goals page
- [✅] Goal shows correct priority badge
- [✅] Goal shows correct due date
- [✅] Goal category is "discretionary"
- [✅] Delete wishlist item → Linked goal is deleted (cascade delete)

---

## Example: Before vs After

### ❌ Before
```javascript
// Old createGoalFromWishlist
const payload = {
  title: item.title,
  description: item.description,
  targetAmount: item.price ?? 0,
  currentAmount: 0,
};
// Missing: category, priority, status, dueDate
// Result: Goal doesn't display properly or has wrong defaults
```

### ✅ After
```javascript
// New createGoalFromWishlist
const payload = {
  title: item.title,
  description: item.description,
  targetAmount: item.price ?? 0,
  currentAmount: 0,
  category: "discretionary", // ✨ Properly categorized
  priority: mapWishlistPriorityToGoalPriority(item.priority), // ✨ Correct priority
  status: "planned", // ✨ Initial status
  dueDate: item.dueDate || undefined, // ✨ Target date
  sourceWishlistId: item._id, // ✨ Linked to wishlist
};
// Result: Goal displays correctly with all details!
```

---

## Files Modified

1. ✅ `server/src/models/Wishlist.js` - Added `dueDate` field
2. ✅ `client/src/sections/WishlistManager.jsx` - Added priority mapping, dueDate field, updated goal creation
3. ✅ `client/src/components/WishlistScraper.jsx` - Added priority/dueDate fields, updated goal creation

---

## Migration Notes

**Existing Data**: Existing wishlist items and goals will continue to work. New fields are optional:
- Existing wishlist items without `dueDate` will have `undefined` (valid)
- Existing goals from wishlist without `category` will show as "other" (default)
- Existing goals without `priority` will show as 3/Medium (default)

**Database Migration**: No migration required - MongoDB will handle the new optional field automatically.

