# Wishlist Cascade Delete Implementation

## Overview
When a user deletes a wishlist item, all related goals that were created from that wishlist item are now automatically deleted.

## Changes Made

### 1. Backend - Goal Model (`server/src/models/Goal.js`)
**Added field to track wishlist source:**
```javascript
sourceWishlistId: { 
  type: mongoose.Schema.Types.ObjectId, 
  ref: "Wishlist", 
  default: null 
}
```

This field links a goal to its source wishlist item (if created from wishlist).

### 2. Backend - Wishlist Routes (`server/src/routes/wishlist.js`)
**Updated DELETE endpoint to cascade delete goals:**
- Now imports Goal model
- When deleting a wishlist item, also deletes all goals with matching `sourceWishlistId`
- Returns success message indicating how many goals were deleted
- Console logs the deletion activity for debugging

**Key changes:**
```javascript
// Cascade delete: Delete all goals that were created from this wishlist item
const deletedGoals = await Goal.deleteMany({
  userId: req.user.id,
  sourceWishlistId: wishlistItemId
});
```

### 3. Backend - Goals Route (`server/src/routes/goals.js`)
**Updated POST endpoint validation:**
- Added `sourceWishlistId` to the validation rules
- Uses `isMongoId()` to ensure valid MongoDB ObjectId
- Made optional so existing goals without wishlist source work fine

### 4. Frontend - WishlistScraper Component (`client/src/components/WishlistScraper.jsx`)
**Updated goal creation to include wishlist ID:**
```javascript
await api.post("/goals", {
  title: data.title,
  description: data.description,
  targetAmount: data.price ?? 0,
  currentAmount: 0,
  sourceWishlistId: data._id // ← NEW: Link the goal to this wishlist item
});
```

## How It Works

### Creating a Wishlist Item with Goal
1. User adds product URL via WishlistScraper
2. Wishlist item is created and receives ID (e.g., `wishlistId_123`)
3. Goal is created with `sourceWishlistId: wishlistId_123`

### Deleting a Wishlist Item
1. User clicks delete on wishlist item
2. Backend receives DELETE request for `wishlistId_123`
3. Wishlist item is deleted
4. All goals with `sourceWishlistId: wishlistId_123` are deleted
5. Response confirms: "Wishlist item deleted and 1 associated goal(s) removed"

### Dashboard Impact
- Goal Progress card updates automatically (goal count decreases)
- Finance summary updates (target amount decreases if goal had pending amount)
- "Your Goals" section refreshes (goal no longer visible)

## Data Consistency

### For Existing Goals (Before This Update)
- Goals created before this feature don't have `sourceWishlistId`
- They remain untouched when deleting wishlist items
- `sourceWishlistId` defaults to `null`, so deletion query won't match them
- Gradual migration as users create new goals from wishlist

### For New Goals
- All goals created from wishlist after this update include `sourceWishlistId`
- These will be automatically deleted when their source wishlist item is deleted

## Testing Checklist

✅ **Add Wishlist Item & Create Goal**
- [ ] Scrape product (e.g., Nykaa, Myntra)
- [ ] Click "Add to Wishlist & Create Savings Goal"
- [ ] Verify goal appears in "Your Goals" section
- [ ] Verify goal appears in Dashboard

✅ **Delete Wishlist Item**
- [ ] Go to Wishlist section
- [ ] Click delete on wishlist item
- [ ] Verify success message includes goal count
- [ ] Refresh dashboard - goal should be gone
- [ ] Check "Your Goals" - goal should be removed
- [ ] Check Goal Progress card - count should decrease

✅ **Manual Goals Remain Unaffected**
- [ ] Create goal manually (not from wishlist)
- [ ] Add wishlist item (without goal)
- [ ] Delete the wishlist item
- [ ] Verify manual goal still exists

## API Changes

### POST /goals
**New optional field:**
```json
{
  "title": "New Laptop",
  "targetAmount": 50000,
  "sourceWishlistId": "66abc123def456789xyz0001"
}
```

### DELETE /wishlist/:id
**Updated response:**
```json
{
  "ok": true,
  "message": "Wishlist item deleted and 2 associated goal(s) removed"
}
```

## Backward Compatibility
✅ Fully backward compatible:
- Existing goals without `sourceWishlistId` are unaffected
- Existing API calls work without `sourceWishlistId`
- Optional field with default null value

## Future Enhancements
- Add UI confirmation: "Delete goal created from this wishlist item?"
- Add recovery option: "Undo" for deleted goals (soft delete)
- Show which wishlist items have goals in UI
- Add reverse link from goal to wishlist item display