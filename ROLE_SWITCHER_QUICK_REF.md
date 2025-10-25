# 🚀 Role Switcher - Quick Reference Card

## Location in Code
```
File: client/src/components/DashboardHeader.jsx
Lines: 1-253
Import: AuthContext, useNavigate, useState, useRef, useEffect
```

## User Flow
```
1. User sees role badge in header: [SmartGoal] [🔵 Goal Setter]
2. Multi-role user sees "Switch Role" button
3. Click button → dropdown shows available roles
4. Select role → confirmation modal appears
5. See what you'll lose/gain
6. Click "Switch" → API call → redirects to new dashboard
```

## Feature Requirements Met

| Requirement | Status | Details |
|---|---|---|
| Display current role clearly | ✅ | Badge in header top-left, color-coded |
| One-click switch in header | ✅ | Button right-side, not in profile |
| Warn about changes | ✅ | Modal shows features lost/gained |

## Component Props & State

```javascript
// Props
{ variant = "user" }  // admin, buyer, or user

// State
- showRoleSwitcher: boolean (dropdown open/close)
- showWarning: boolean (modal open/close)  
- pendingRole: string (which role user is switching to)
- dropdownRef: ref (for outside click detection)

// Data
- roles: array of available roles (filtered, no admin)
- currentRole: current active role
- hasMultipleRoles: boolean (show button only if true)
- roleInfo: object (metadata for each role)
```

## Key Functions

```javascript
handleRoleChange(newRole)
  → Set pending role
  → Show warning modal
  → Close dropdown

confirmRoleSwitch()
  → Call switchRole(pendingRole)
  → Navigate to dashboard
  → Clear states

getRoleLabel(role)
  → Return human-readable role name

getRoleBadgeClass(role)
  → Return Bootstrap badge color class
```

## HTML Structure

```html
<header class="site-header">
  <div class="header-brand">
    <Brand />
    <span class="badge">Current Role</span>
  </div>
  
  <div class="header-actions">
    <span>User Name</span>
    
    <!-- Role Switcher -->
    <div class="position-relative">
      <button>↻ Switch Role</button>
      
      <!-- Dropdown -->
      <div class="position-absolute">
        <button>Role 1 [Current]</button>
        <button>Role 2</button>
      </div>
    </div>
    
    <!-- Modal -->
    <div class="modal d-block">
      <div class="modal-content">
        <!-- Warning content -->
      </div>
    </div>
    
    <button>Logout</button>
  </div>
</header>
```

## Visibility Rules

```
Multi-role user
├─ 2+ roles: Show "Switch Role" button ✓
├─ Can switch between: goal_setter ↔ buyer
└─ Cannot switch: admin (no button shown)

Admin user
├─ Single role: admin
└─ Show "Switch Role"? NO ✗

Single-role user  
├─ Only has: goal_setter or buyer
└─ Show "Switch Role"? NO ✗
```

## API Integration

```javascript
// Uses AuthContext's switchRole function
const result = await switchRole(newRole);

// Endpoint called
PUT /profile/role
Body: { role: "buyer" }

// Response
{
  message: "Role updated",
  token: "new-jwt-token",
  user: { role: "buyer", roles: [...], ... }
}
```

## CSS Classes Used

```
Bootstrap Classes:
- badge bg-primary / bg-success / bg-danger
- btn btn-outline-secondary
- position-relative / position-absolute
- d-flex / d-block
- gap-2 / p-3 / m-2
- modal / modal-dialog-centered
- text-danger / text-success

Custom:
- site-header is-scrolled
- header-content / header-brand / header-actions
```

## Error Handling

```javascript
if (!roles || roles.length < 2) {
  // Don't show button
}

if (newRole === currentRole) {
  // Close dropdown, do nothing
}

if (!switchRole(role).ok) {
  // Toast error, close modal
  // User stays on current role
}
```

## Mobile Responsive

```
Mobile (<768px):
- Header stacks vertically
- Button fits but may wrap
- Dropdown positioned to fit
- Modal full width with padding

Tablet (768px-1024px):
- Header horizontal layout
- Button visible
- Dropdown right-aligned

Desktop (>1024px):
- Full layout as designed
- Dropdown below button
- Modal centered
```

## Testing Quick Checks

```bash
# ✅ Test these scenarios
□ Login as multi-role user
□ See role badge in header
□ See "Switch Role" button
□ Click button → dropdown opens
□ Click role → modal shows
□ Modal shows correct features
□ Click Switch → redirect happens
□ Refresh page → role persists
□ Try clicking current role → no change
□ Try network error → error handled

# 🔍 Verify in browser
F12 → Console: No errors
F12 → Network: API calls successful
localStorage: sg_auth updated
```

## Database Query (MongoDB)

```javascript
// Add role to user
db.users.updateOne(
  { email: "user@example.com" },
  { $addToSet: { roles: ["buyer"] } }
);

// Verify
db.users.findOne({ email: "user@example.com" });
// Should have: { roles: ["goal_setter", "buyer"], role: "goal_setter" }
```

## Common Issues & Fixes

| Issue | Cause | Fix |
|---|---|---|
| Button not showing | Single role | Add role: `db.users.updateOne(..., { $addToSet: { roles: [...] } })` |
| Switch doesn't work | Backend error | Check server logs for `/profile/role` errors |
| Stays on old role | JWT not updated | Verify JWT_SECRET in .env matches |
| Dropdown doesn't close | JS error | F12 → Console, look for errors |
| Wrong dashboard | Navigation error | Check route mappings in code |

## Environment Setup

```powershell
# .env (server side)
JWT_SECRET=your-secret-key
MONGODB_URI=mongodb+srv://...

# Backend run
cd server
npm install
npm run dev

# Frontend run
cd client
npm install
npm run dev
```

## Color Coding Reference

| Role | Color | Hex | Bootstrap |
|---|---|---|---|
| Goal Setter | 🔵 Blue | #0d6efd | bg-primary |
| Buyer | 🟢 Green | #198754 | bg-success |
| Admin | 🔴 Red | #dc3545 | bg-danger |
| Features Lose | 🔴 Red | #dc3545 | text-danger |
| Features Gain | 🟢 Green | #198754 | text-success |

## Navigation Mapping

```javascript
const dashboardMap = {
  goal_setter: "/dashboard",
  buyer: "/buyer-dashboard",
  admin: "/admin-dashboard"
};
```

## Feature Comparison Data

```javascript
const roleInfo = {
  goal_setter: {
    label: "Goal Setter",
    features: [
      "Create and manage savings goals",
      "Track financial progress",
      "Connect with buyers",
      "Access analytics"
    ]
  },
  buyer: {
    label: "Buyer",
    features: [
      "Browse goal-linked items",
      "Make purchases for goal setters",
      "Manage shopping cart",
      "Track orders"
    ]
  },
  admin: { /* ... */ }
};
```

## Keyboard Shortcuts

```
Tab → Navigate to Switch Role button
Space/Enter → Open dropdown
Arrow Up/Down → Navigate dropdown items (if implemented)
Escape → Close dropdown/modal
```

## Authentication Flow

```
1. Login → JWT created → Role in token
2. Token stored → localStorage
3. Every request → Token sent in header
4. Switch role → New token generated
5. New token → localStorage updated
6. Continue requests with new token
```

## Next Steps After Implementation

- [ ] Test all scenarios from ROLE_SWITCHER_TESTING.md
- [ ] Verify on multiple browsers
- [ ] Test mobile responsiveness
- [ ] Check accessibility (screen readers)
- [ ] Deploy to staging
- [ ] Get user feedback
- [ ] Deploy to production

## Quick Debug Tips

```javascript
// Check in browser console
console.log(user?.profile?.roles);  // See available roles
console.log(user?.profile?.role);   // See current role

// Check localStorage
localStorage.getItem('sg_auth');  // See auth data

// Check network
DevTools → Network → Look for PUT /profile/role
```

## Important Notes

- ⚠️ **Admin cannot switch** - backend prevents it
- ⚠️ **Only goal_setter/buyer can switch** - backend enforces
- ⚠️ **New JWT each switch** - ensure JWT_SECRET is consistent
- ✅ **Changes persist** - saved to MongoDB
- ✅ **Graceful errors** - handled in frontend

---

**Quick Ref Created:** January 2024  
**Component:** DashboardHeader.jsx  
**Print Friendly:** Yes