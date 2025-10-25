# 🔄 Role Switcher Implementation

## Overview
Implemented a complete role switching system that allows multi-role users to switch between **Goal Setter** and **Buyer** roles directly from the header. Admins cannot switch roles (by backend design).

## ✅ Features Implemented

### 1. **Display Current Role in Header** (Top-Left, Next to Brand)
- Current active role badge is prominently displayed next to the brand logo
- Color-coded badge:
  - 🔵 **Blue** = Goal Setter
  - 🟢 **Green** = Buyer
  - 🔴 **Red** = Admin
- Example: `[SmartGoal] [Goal Setter]`

### 2. **One-Click Role Switcher** (Header, Right Side)
- **"Switch Role"** button appears only for users with multiple roles
- Located in the header next to logout button (not in profile page)
- Icon: Circular arrow to indicate role switching
- Clicking opens dropdown with available roles
- Shows current role highlighted with "Current" badge
- Clicking outside closes the dropdown

### 3. **Warning Modal Before Switching**
Displays a detailed confirmation dialog showing:
- **Current role → New role** comparison
- ❌ **Features you will lose** (in red)
- ✅ **Features you will gain** (in green)
- Reassuring note: "You can switch back at any time"

### Role-Specific Features

#### Goal Setter
- Create and manage savings goals
- Track financial progress
- Connect with buyers
- Access analytics

#### Buyer
- Browse goal-linked items
- Make purchases for goal setters
- Manage shopping cart
- Track orders

#### Admin
- Manage all users
- View system analytics
- Control marketplace
- Access financial reports

## 📁 Files Modified

### Frontend
**File:** `client/src/components/DashboardHeader.jsx`
- Added role switcher dropdown
- Added confirmation modal
- Integrated with AuthContext's existing `switchRole` function
- Auto-navigates to correct dashboard after role switch

### Backend (Pre-existing)
**File:** `server/src/routes/profile.js` - Lines 340-398
- Endpoint: `PUT /profile/role`
- Returns new JWT token with updated role
- Prevents admin role switching (by design)
- Only allows switching between goal_setter and buyer

## 🎯 How It Works

### Step 1: User Sees Role in Header
```
Header: [🏠 SmartGoal] [🔵 Goal Setter]  ...  [Switch Role] [Logout]
```

### Step 2: Click "Switch Role"
Dropdown appears showing available roles:
```
├─ 🔵 Goal Setter [Current]
└─ 🟢 Buyer
```

### Step 3: Click New Role
Confirmation modal shows:
```
⚠️ Confirm Role Switch

You're about to switch from [Goal Setter] to [Buyer]

❌ You will lose access to:
  • Create and manage savings goals
  • Track financial progress
  • Connect with buyers
  • Access analytics

✅ You will gain access to:
  • Browse goal-linked items
  • Make purchases for goal setters
  • Manage shopping cart
  • Track orders

Note: You can switch back at any time.

[Cancel] [Switch to Buyer]
```

### Step 4: Confirm
- Backend updates user's role
- Returns new JWT token
- Frontend automatically navigates to new dashboard
- Toast notification shows success

## 🔐 Security & Constraints

- ✅ Requires authentication (uses `requireAuth` middleware)
- ✅ Admin role cannot be switched (backend enforced)
- ✅ Only users with multiple roles see the switcher
- ✅ Only goal_setter and buyer roles can be switched
- ✅ New JWT token issued with each switch
- ✅ Session updated in localStorage

## 🧪 Testing Checklist

### Prerequisites
1. Create/login as a user with multiple roles (goal_setter + buyer)
2. Restart backend: `npm run dev` in server folder
3. Restart frontend: `npm run dev` in client folder

### Test Cases

- [ ] **Role Badge Display**
  - Go to any dashboard page
  - Verify current role badge shows in header (next to logo)
  - Verify badge color matches role

- [ ] **Role Switcher Visibility**
  - Multi-role user sees "Switch Role" button
  - Single-role user does NOT see "Switch Role" button
  - Admin user does NOT see "Switch Role" button

- [ ] **Dropdown Functionality**
  - Click "Switch Role" button
  - Dropdown appears with available roles
  - Current role shows "Current" badge
  - Click outside dropdown closes it
  - Click "Switch Role" again opens it

- [ ] **Role Switch Warning Modal**
  - Select a new role
  - Modal appears with warning
  - Shows correct current role (red)
  - Shows correct new role (green)
  - Lists features you'll lose (red text)
  - Lists features you'll gain (green text)
  - Click "Cancel" closes modal without switching
  - Modal shows again if you select a role

- [ ] **Successful Role Switch**
  - Click "Switch to [Role]"
  - Modal closes
  - Page automatically navigates to new dashboard
  - Toast shows "Switched to [Role]" success message
  - Refresh page - still logged in with new role
  - Header badge updated to new role
  - Sidebar/navigation shows new role's features

- [ ] **Round-trip Switching**
  - Switch from Goal Setter → Buyer ✓
  - Verify on Buyer dashboard
  - Switch back from Buyer → Goal Setter ✓
  - Verify on Goal Setter dashboard

- [ ] **Cross-Browser/Mobile**
  - Test dropdown closes on outside click
  - Test modal displays correctly on mobile
  - Test "Switch Role" button is accessible

## 🐛 Common Issues & Solutions

### Issue: "Switch Role" button not appearing
**Cause:** User only has one role
**Solution:** Create a test user with multiple roles, or update existing user in MongoDB

```bash
# Add a role to a user in MongoDB
db.users.updateOne(
  { email: "test@example.com" },
  { $addToSet: { roles: ["buyer"] } }
)
```

### Issue: Role doesn't switch after clicking "Switch to [Role]"
**Cause:** Backend error or JWT not updated
**Solution:** 
1. Check browser console for errors
2. Check server logs for `/profile/role` endpoint errors
3. Verify JWT_SECRET in .env matches

### Issue: Page doesn't navigate to new dashboard
**Cause:** Navigation function issue
**Solution:** 
1. Check that `useNavigate()` is working
2. Verify dashboard routes exist and are accessible

## 📊 User Experience Flow

```
┌─────────────────────────────────────────────────────┐
│         User on Goal Setter Dashboard               │
│                                                     │
│  [SmartGoal] [Goal Setter]  ...  [Switch Role]    │
└─────────────────────────────────────────────────────┘
                      ↓
                 Click Switch Role
                      ↓
┌─────────────────────────────────────────────────────┐
│         Dropdown Menu Opens                         │
│  ├─ Goal Setter [Current]                          │
│  └─ Buyer                                           │
└─────────────────────────────────────────────────────┘
                      ↓
                 Select Buyer
                      ↓
┌─────────────────────────────────────────────────────┐
│       Confirmation Modal with Warning               │
│   ❌ Lose access to goals/analytics                │
│   ✅ Gain access to shopping/cart                  │
│   [Cancel] [Switch to Buyer]                       │
└─────────────────────────────────────────────────────┘
                      ↓
           Click "Switch to Buyer"
                      ↓
┌─────────────────────────────────────────────────────┐
│         User on Buyer Dashboard                     │
│                                                     │
│  [SmartGoal] [Buyer]  ...  [Switch Role]          │
│  ✓ Toast: "Switched to Buyer"                      │
└─────────────────────────────────────────────────────┘
```

## 🔗 Related Documentation

- **Auth System:** See `AUTOMATION_500_ERROR_FIX.md` for JWT token structure
- **Profile Routes:** `server/src/routes/profile.js` (PUT /profile/role)
- **Role Utils:** `server/src/utils/roles.js` (buildAuthPayload, buildUserResponse)
- **Auth Middleware:** `server/src/middleware/auth.js`

## 📝 Code Reference

### Key Component Logic

**Get available roles (filtering admin):**
```javascript
const allRoles = user?.profile?.roles || [];
const roles = allRoles.filter(r => r !== "admin");
const hasMultipleRoles = roles.length > 1 && currentRole !== "admin";
```

**Handle role change:**
```javascript
const handleRoleChange = (newRole) => {
  if (newRole === currentRole) return;
  setPendingRole(newRole);
  setShowWarning(true);
  setShowRoleSwitcher(false);
};
```

**Confirm and switch:**
```javascript
const result = await switchRole(pendingRole);
if (result.ok) {
  navigate(dashboardMap[pendingRole]); // Auto-navigate
}
```

## 🚀 Next Steps / Future Enhancements

1. **Add role switching permissions**
   - Only certain roles can switch to certain roles
   - Require admin approval for role changes

2. **Add role switch history**
   - Track when/why users switch roles
   - Log for audit purposes

3. **Add role-specific settings**
   - Save preferences per role
   - Auto-apply theme/layout per role

4. **Notification system**
   - Notify when switching to role with pending items
   - Alert if switching away from role with unfinished tasks

## ✅ Status

**Implementation:** ✅ COMPLETE
**Testing:** Ready for testing
**Deployment:** Ready to deploy

---

**Created:** January 2024  
**Component:** `DashboardHeader.jsx`  
**Status:** Production-ready