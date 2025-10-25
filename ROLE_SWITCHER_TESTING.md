# 🧪 Role Switcher - Testing Guide

## Prerequisites

### 1. Setup Test User with Multiple Roles

Before testing, you need a user account with multiple roles (goal_setter + buyer).

**Option A: Create during registration**
1. Register a new account at `/register`
2. Choose "Goal Setter" as role
3. After registration, manually add "Buyer" role via MongoDB

**Option B: Update existing user in MongoDB**
```javascript
// MongoDB Connection
use smartgoal_db;

// Add buyer role to goal_setter user
db.users.updateOne(
  { email: "your-email@example.com" },
  { $addToSet: { roles: ["buyer"] } }
);

// Verify the change
db.users.findOne({ email: "your-email@example.com" });
```

**Option C: Direct MongoDB Update (if no buyer role)**
```javascript
// Find the user
db.users.find({ email: "test@example.com" })

// Update to have both roles
db.users.updateOne(
  { _id: ObjectId("...") },
  { 
    $set: { 
      roles: ["goal_setter", "buyer"],
      role: "goal_setter"  // Set current role
    }
  }
);
```

### 2. Start Backend & Frontend
```powershell
# Terminal 1: Backend
cd c:\Users\anton\OneDrive\Desktop\ppr\smartgoal\smartgoal\server
npm run dev
# Should show: "Server running on http://localhost:5000"

# Terminal 2: Frontend  
cd c:\Users\anton\OneDrive\Desktop\ppr\smartgoal\smartgoal\client
npm run dev
# Should show: "Local: http://localhost:5173"
```

### 3. Verify Connectivity
- Open browser: http://localhost:5173
- Should see login page
- Backend and frontend should communicate without errors

## Test Cases

## 1️⃣ Initial Verification

### Test 1.1: Login with Multi-Role User
**Steps:**
1. Go to http://localhost:5173/login
2. Enter email and password for test user
3. Click "Sign In"

**Expected:**
- ✅ Successfully logged in
- ✅ Redirected to `/dashboard`
- ✅ Role badge shows current role in header

**Verification:**
- Check browser console (F12) - no errors
- Check Network tab - API calls successful
- localStorage contains `sg_auth` token

---

### Test 1.2: Verify Current Role Badge
**Steps:**
1. Logged in as Goal Setter
2. Look at header top-left

**Expected:**
```
[SmartGoal Logo] [🔵 Goal Setter]
```

**Verify:**
- Badge color is blue
- Badge text says "Goal Setter"
- Badge is next to logo
- No errors in console

---

## 2️⃣ Role Switcher Button Visibility

### Test 2.1: Multi-Role User Sees Button
**Steps:**
1. Logged in as user with 2+ roles
2. Look at header right section

**Expected:**
```
User Name  [↻ Switch Role]  [Logout]
```

**Verify:**
- "Switch Role" button exists
- Button has circular arrows icon
- Button is before "Logout" button
- Button is clickable

---

### Test 2.2: Single-Role User Doesn't See Button
**Steps:**
1. Create/use single-role user
2. Login
3. Look at header right section

**Expected:**
```
User Name  [Logout]
```

**Verify:**
- "Switch Role" button is NOT visible
- Only "Logout" button shows
- No errors in console

---

### Test 2.3: Admin User Doesn't See Button
**Steps:**
1. Login as admin user
2. Look at header right section

**Expected:**
```
Admin Dashboard  [User Name]  [Logout]
```

**Verify:**
- "Switch Role" button is NOT visible
- No "Switch Role" option available
- Admin stays on admin dashboard

---

## 3️⃣ Dropdown Functionality

### Test 3.1: Open Dropdown
**Steps:**
1. Logged in as multi-role user
2. Click "Switch Role" button

**Expected:**
```
┌─────────────────────┐
│ 🔵 Goal Setter      │
│    [Current]        │
│                     │
│ 🟢 Buyer            │
└─────────────────────┘
```

**Verify:**
- ✅ Dropdown appears below button
- ✅ Current role highlighted (light gray)
- ✅ "Current" badge shows on current role
- ✅ All available roles listed
- ✅ No JavaScript errors

---

### Test 3.2: Close Dropdown
**Steps:**
1. Dropdown is open
2. Click outside dropdown (e.g., on page content)

**Expected:**
- Dropdown closes instantly
- Can reopen by clicking button again

**Verify:**
- ✅ Click document outside → dropdown closes
- ✅ Click on logo area → dropdown closes
- ✅ Click on navigation → dropdown closes

---

### Test 3.3: Click Same Role (Current)
**Steps:**
1. Dropdown is open
2. Click current role button (Goal Setter if already Goal Setter)

**Expected:**
- Dropdown closes
- No modal appears
- Page stays the same
- No API call made

**Verify:**
- ✅ Dropdown closes smoothly
- ✅ Network tab shows no new requests
- ✅ Toast notification doesn't appear

---

## 4️⃣ Confirmation Modal

### Test 4.1: Open Warning Modal
**Steps:**
1. Dropdown is open
2. Click a different role (e.g., "Buyer")

**Expected:**
```
╔══════════════════════════════════╗
║  ⚠️ Confirm Role Switch          ║
╠══════════════════════════════════╣
║  You're about to switch from     ║
║  [Goal Setter] to [Buyer]        ║
║                                  ║
║  ❌ You will lose access to:     ║
║  • Create and manage goals       ║
║  • Track financial progress      ║
║  • Connect with buyers           ║
║  • Access analytics              ║
║                                  ║
║  ✅ You will gain access to:     ║
║  • Browse goal-linked items      ║
║  • Make purchases                ║
║  • Manage shopping cart          ║
║  • Track orders                  ║
║                                  ║
║  Note: You can switch back       ║
║                                  ║
║  [Cancel] [Switch to Buyer]      ║
╚══════════════════════════════════╝
```

**Verify:**
- ✅ Modal appears with overlay
- ✅ Shows correct "from" role
- ✅ Shows correct "to" role
- ✅ Lists features in red (lose)
- ✅ Lists features in green (gain)
- ✅ Buttons are visible and clickable

---

### Test 4.2: Modal Content Accuracy
**Steps:**
1. Switch from Goal Setter → Buyer
2. Check modal content

**Expected:**
- Red section shows Goal Setter features:
  - Create and manage savings goals ✓
  - Track financial progress ✓
  - Connect with buyers ✓
  - Access analytics ✓
- Green section shows Buyer features:
  - Browse goal-linked items ✓
  - Make purchases for goal setters ✓
  - Manage shopping cart ✓
  - Track orders ✓

**Verify:**
- ✅ All features listed correctly
- ✅ Colors are correct (red/green)
- ✅ Text is readable

---

### Test 4.3: Cancel Switch
**Steps:**
1. Modal is open
2. Click "Cancel" button

**Expected:**
- Modal closes
- Dropdown also closes
- Page doesn't change
- No API call made
- User still on same role dashboard

**Verify:**
- ✅ Modal disappears smoothly
- ✅ Network shows no new requests
- ✅ Header badge unchanged
- ✅ No errors in console

---

## 5️⃣ Successful Role Switch

### Test 5.1: Complete Role Switch
**Steps:**
1. Modal is open for Goal Setter → Buyer switch
2. Click "Switch to Buyer" button

**Expected:**
- Modal closes
- Toast notification: "Switched to Buyer"
- Page redirects to `/buyer-dashboard`
- Header badge updates to [🟢 Buyer]
- Sidebar updates with Buyer menu

**Verify:**
- ✅ Modal closes
- ✅ Toast appears (top-right corner)
- ✅ URL changes to /buyer-dashboard
- ✅ Navigation reloads correctly
- ✅ Header badge is green
- ✅ Buyer features visible in sidebar

---

### Test 5.2: Persistence After Refresh
**Steps:**
1. Switched to Buyer role
2. Press F5 to refresh page

**Expected:**
- Still on Buyer dashboard
- Still logged in
- Header badge still shows Buyer
- Role persists across refresh

**Verify:**
- ✅ localStorage contains updated user data
- ✅ JWT token is valid
- ✅ Dashboard loads correctly
- ✅ No re-login required

---

### Test 5.3: Backend Update
**Steps:**
1. Switched to Buyer
2. Open MongoDB or check API

**Expected:**
- User.role updated to "buyer"
- User.roles array still contains ["goal_setter", "buyer"]
- New JWT token issued

**Verification:**
```javascript
// Check MongoDB
db.users.findOne({ email: "test@example.com" });
// Should show:
// { role: "buyer", roles: ["goal_setter", "buyer"], ... }
```

---

## 6️⃣ Round-Trip Switching

### Test 6.1: Switch Back to Original Role
**Steps:**
1. Currently on Buyer dashboard
2. Click "Switch Role"
3. Select "Goal Setter"
4. Confirm in modal

**Expected:**
- Modal shows Goal Setter on right side (green)
- Modal shows Buyer features in red (lose)
- Modal shows Goal Setter features in green (gain)
- After confirmation:
  - Redirects to `/dashboard`
  - Header updates to [🔵 Goal Setter]
  - Sidebar shows Goal Setter features

**Verify:**
- ✅ Modal shows correct information
- ✅ Navigation correct
- ✅ Header badge updates
- ✅ Dashboard loads correctly

---

### Test 6.2: Multiple Switches
**Steps:**
1. Start: Goal Setter
2. Switch → Buyer → Goal Setter → Buyer → Goal Setter
3. Check final state

**Expected:**
- All switches work
- Each switch shows correct confirmation
- Final role is Goal Setter
- No errors or data loss

**Verify:**
- ✅ No console errors
- ✅ Network requests all successful
- ✅ UI updates correctly each time
- ✅ Database reflects correct final role

---

## 7️⃣ Error Handling

### Test 7.1: Network Error During Switch
**Steps:**
1. Open DevTools → Network tab
2. Offline mode (DevTools → Settings → Offline)
3. Try to switch role

**Expected:**
- Modal appears but switch fails
- Error toast: "Failed to switch role" or similar
- Modal closes without navigation
- User stays on current dashboard

**Verify:**
- ✅ Error message displays
- ✅ No navigation occurs
- ✅ Role unchanged in database
- ✅ No broken state

---

### Test 7.2: Backend Error
**Steps:**
1. Stop backend server
2. Try to switch role

**Expected:**
- Modal confirms switch
- Click "Switch to [Role]"
- Error appears (backend unreachable)
- Modal closes
- User stays on current dashboard

**Verify:**
- ✅ Error shown to user
- ✅ No redirect happens
- ✅ User can try again when backend is back

---

### Test 7.3: Invalid Role
**Steps:**
1. Modify browser request (DevTools → Network → XHR)
2. Try to send invalid role like "superuser"

**Expected:**
- Backend rejects request
- Error message appears
- User stays on current role

**Verify:**
- ✅ Backend validation works
- ✅ Frontend handles error gracefully

---

## 8️⃣ UI/UX Tests

### Test 8.1: Button Styling
**Steps:**
1. Look at "Switch Role" button
2. Hover over it
3. Click it

**Expected:**
- Button looks like other buttons (outline style)
- Hover state shows visual feedback
- Click shows active state
- Icon is visible and aligned

**Verify:**
- ✅ Button styling consistent
- ✅ Hover effects work
- ✅ Icon renders properly

---

### Test 8.2: Modal Styling
**Steps:**
1. Open modal
2. Check visual elements

**Expected:**
- Modal centered on screen
- Overlay visible behind modal
- Text readable
- Buttons aligned
- No layout issues

**Verify:**
- ✅ Modal positioned correctly
- ✅ All text visible
- ✅ Buttons clickable
- ✅ No overflow/cutoff

---

### Test 8.3: Toast Notification
**Steps:**
1. Complete a role switch
2. Watch for toast

**Expected:**
- Toast appears top-right corner
- Shows "Switched to [Role]"
- Auto-dismisses after ~2 seconds
- Doesn't block page

**Verify:**
- ✅ Toast positioning correct
- ✅ Message accurate
- ✅ Auto-dismiss works
- ✅ Doesn't interfere with interaction

---

## 9️⃣ Browser Compatibility

### Test 9.1: Chrome/Edge
**Steps:**
1. Use Chrome or Edge browser
2. Test all scenarios above

**Expected:**
- All features work
- No console errors
- No layout issues

---

### Test 9.2: Firefox
**Steps:**
1. Use Firefox browser
2. Test role switching

**Expected:**
- Works identically to Chrome
- No browser-specific issues

---

### Test 9.3: Safari
**Steps:**
1. Use Safari browser
2. Test role switching

**Expected:**
- Works identically to Chrome
- SVG icons render correctly

---

## 🔟 Mobile/Responsive

### Test 10.1: Mobile (< 768px)
**Steps:**
1. Open DevTools
2. Set viewport to 375x667 (iPhone)
3. Test role switching

**Expected:**
- Button visible and tappable
- Dropdown fits on screen
- Modal responsive
- No horizontal scroll

**Verify:**
- ✅ Touch targets large enough (44px+)
- ✅ Dropdown doesn't overflow
- ✅ Modal readable on small screen

---

### Test 10.2: Tablet (768px - 1024px)
**Steps:**
1. Set viewport to 768x1024
2. Test role switching

**Expected:**
- Layout correct
- Buttons accessible
- Modal properly sized

---

## 🔗 Quick Checklist

```
[ ] Test setup completed
[ ] Test user has multiple roles
[ ] Backend running (port 5000)
[ ] Frontend running (port 5173)

BASIC FUNCTIONALITY:
[ ] Role badge displays correctly
[ ] Switch Role button visible for multi-role users
[ ] Switch Role button hidden for single/admin users
[ ] Dropdown opens/closes correctly
[ ] Modal shows correct role change info
[ ] Role switch succeeds
[ ] New dashboard loads after switch
[ ] Role persists after refresh

EDGE CASES:
[ ] Clicking current role does nothing
[ ] Cancel modal doesn't switch
[ ] Network error handled gracefully
[ ] Multiple rapid switches work
[ ] Mobile responsive works
[ ] All browsers tested

VISUAL:
[ ] Colors correct (blue/green/red)
[ ] Icons render properly
[ ] Text readable
[ ] Buttons accessible
[ ] Layout not broken

BROWSER SUPPORT:
[ ] Chrome ✓
[ ] Firefox ✓
[ ] Safari ✓
[ ] Edge ✓
```

## 📊 Testing Report Template

Use this template to document your testing:

```
═══════════════════════════════════════════════════════════
       ROLE SWITCHER - TESTING REPORT
═══════════════════════════════════════════════════════════

Test Date: [DATE]
Tester: [NAME]
Environment: [DEV/STAGING/PROD]
Browsers Tested: [LIST]

───────────────────────────────────────────────────────────
BASIC FUNCTIONALITY
───────────────────────────────────────────────────────────
[ ] Role badge displays: ✓ / ✗
[ ] Switch button visible: ✓ / ✗
[ ] Dropdown works: ✓ / ✗
[ ] Modal appears: ✓ / ✗
[ ] Switch succeeds: ✓ / ✗
[ ] Navigation works: ✓ / ✗
[ ] Persistence works: ✓ / ✗

───────────────────────────────────────────────────────────
ERROR HANDLING
───────────────────────────────────────────────────────────
[ ] Network errors: ✓ / ✗
[ ] Backend errors: ✓ / ✗
[ ] Invalid inputs: ✓ / ✗

───────────────────────────────────────────────────────────
BROWSER COMPATIBILITY
───────────────────────────────────────────────────────────
Chrome: ✓ / ✗ / N/A
Firefox: ✓ / ✗ / N/A
Safari: ✓ / ✗ / N/A
Edge: ✓ / ✗ / N/A
Mobile: ✓ / ✗ / N/A

───────────────────────────────────────────────────────────
ISSUES FOUND
───────────────────────────────────────────────────────────
1. [Description]
   Severity: [High/Medium/Low]
   Status: [New/Fixed/Accepted]

───────────────────────────────────────────────────────────
NOTES
───────────────────────────────────────────────────────────
[Any additional notes or observations]

───────────────────────────────────────────────────────────
SIGN-OFF
───────────────────────────────────────────────────────────
Tested By: ________________     Date: ________
Status: [PASS / FAIL / CONDITIONAL PASS]
═══════════════════════════════════════════════════════════
```

---

**Testing Guide Created:** January 2024  
**Component:** DashboardHeader.jsx  
**Last Updated:** January 2024