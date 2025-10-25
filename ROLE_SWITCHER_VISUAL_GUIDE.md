# 🎨 Role Switcher - Visual Guide

## Header Layout

### Before (Current)
```
┌─────────────────────────────────────────────────────────────┐
│  🏠 SmartGoal                    User Name        [Logout]  │
└─────────────────────────────────────────────────────────────┘
```

### After (New with Role Switcher)
```
┌──────────────────────────────────────────────────────────────────┐
│  🏠 SmartGoal [🔵 Goal Setter]  ...  User Name  [Switch] [Logout]│
└──────────────────────────────────────────────────────────────────┘
     ↑ Current Role Badge            ↑ New Role Button
```

## Role Badge Colors

```
┌─────────────────────────────────────┐
│ 🟦 Goal Setter (Primary Blue)       │
│ 🟩 Buyer (Success Green)            │
│ 🟥 Admin (Danger Red)               │
└─────────────────────────────────────┘
```

## Role Switcher Dropdown

### Closed State
```
Header: [SmartGoal] [🔵 Goal Setter] ... [↻ Switch Role] [Logout]
```

### Open State (Showing Options)
```
Header: [SmartGoal] [🔵 Goal Setter] ... [↻ Switch Role ▼] [Logout]
                                            ┌─────────────────────┐
                                            │ 🔵 Goal Setter      │
                                            │    [Current]        │
                                            │                     │
                                            │ 🟢 Buyer            │
                                            └─────────────────────┘
```

### After Selecting "Buyer"
Confirmation modal appears (see below).

## Confirmation Modal

```
╔═══════════════════════════════════════════════════════════╗
║                  ⚠️  Confirm Role Switch                  ║  X
╠═══════════════════════════════════════════════════════════╣
║                                                           ║
║  You're about to switch from                             ║
║  [🔵 Goal Setter] to [🟢 Buyer]                          ║
║                                                           ║
║  ❌ You will lose access to:                             ║
║  • Create and manage savings goals                       ║
║  • Track financial progress                              ║
║  • Connect with buyers                                   ║
║  • Access analytics                                      ║
║                                                           ║
║  ✅ You will gain access to:                             ║
║  • Browse goal-linked items                              ║
║  • Make purchases for goal setters                        ║
║  • Manage shopping cart                                   ║
║  • Track orders                                           ║
║                                                           ║
║  ℹ️  Note: You can switch back at any time.              ║
║                                                           ║
╠═══════════════════════════════════════════════════════════╣
║             [Cancel]          [Switch to Buyer]          ║
╚═══════════════════════════════════════════════════════════╝
```

## User Journey

### Scenario: Goal Setter wants to browse the marketplace as Buyer

```
STEP 1: User on Goal Setter Dashboard
┌─────────────────────────────────────┐
│  [SmartGoal] [🔵 Goal Setter]       │
│  - Create Goals                     │
│  - Track Finances                   │
│  - View Analytics                   │
│  - Marketplace (as seller)          │
└─────────────────────────────────────┘
         ↓
   Click "Switch Role"
         ↓

STEP 2: Select New Role
┌─────────────────────────────────────┐
│  Dropdown Shows:                    │
│  ├─ 🔵 Goal Setter [Current]        │
│  └─ 🟢 Buyer                        │
└─────────────────────────────────────┘
         ↓
    Click "Buyer"
         ↓

STEP 3: See Warning Modal
┌─────────────────────────────────────┐
│  ⚠️  Switching from Goal Setter     │
│      to Buyer                       │
│  ❌ Lose: Goals, Analytics, etc.    │
│  ✅ Gain: Shopping, Cart, Orders    │
└─────────────────────────────────────┘
         ↓
  Click "Switch to Buyer"
         ↓

STEP 4: Success & Navigate
┌─────────────────────────────────────┐
│  ✓ Toast: "Switched to Buyer"      │
│  Auto-navigate to /buyer-dashboard  │
│  Badge updates to 🟢 Buyer          │
│  Sidebar updates to Buyer features  │
└─────────────────────────────────────┘

STEP 5: User on Buyer Dashboard
┌─────────────────────────────────────┐
│  [SmartGoal] [🟢 Buyer]             │
│  - Browse Items                     │
│  - Shopping Cart                    │
│  - My Orders                        │
│  - Find Goal Setters                │
└─────────────────────────────────────┘
         ↓
   Can switch back anytime
         ↓

STEP 6: Switch Back
┌─────────────────────────────────────┐
│  Click "Switch Role" → Select Goal  │
│  Setter → Confirm → ✓ Switched back │
│  Back to Goal Setter Dashboard      │
└─────────────────────────────────────┘
```

## Component Structure

```
DashboardHeader
├── Header (Brand + Role Badge)
│   ├── Brand Logo
│   └── Current Role Badge
│       ├── Color: Based on role
│       └── Text: Goal Setter / Buyer / Admin
│
├── Navigation Links
│   └── Dynamic based on role variant
│
└── Header Actions
    ├── User Name Display
    ├── Role Switcher (if hasMultipleRoles)
    │   ├── Button: "Switch Role"
    │   │   └── Icon: Circular Arrows
    │   │
    │   └── Dropdown Menu (if open)
    │       ├── Role Option 1
    │       │   ├── Badge
    │       │   └── "Current" indicator
    │       ├── Role Option 2
    │       │   └── Badge
    │       └── Close on outside click
    │
    ├── Logout Button
    │
    └── Confirmation Modal (if switching)
        ├── Current → New role
        ├── Features to lose (red)
        ├── Features to gain (green)
        ├── Cancel button
        └── Confirm button
```

## Role Availability

### Goal Setter User
```
┌──────────────────────────────────────┐
│ Available Roles:                     │
│  ✓ Goal Setter (current)             │
│  ✓ Buyer (if enabled)                │
│  ✗ Admin (not available)             │
│                                      │
│ Shows: [Switch Role] button          │
└──────────────────────────────────────┘
```

### Buyer User
```
┌──────────────────────────────────────┐
│ Available Roles:                     │
│  ✓ Goal Setter (if enabled)          │
│  ✓ Buyer (current)                   │
│  ✗ Admin (not available)             │
│                                      │
│ Shows: [Switch Role] button          │
└──────────────────────────────────────┘
```

### Admin User
```
┌──────────────────────────────────────┐
│ Available Roles:                     │
│  ✗ Goal Setter (not switchable)      │
│  ✗ Buyer (not switchable)            │
│  ✓ Admin (current)                   │
│                                      │
│ Shows: NO [Switch Role] button       │
│ (Admin role is permanent)            │
└──────────────────────────────────────┘
```

### Single-Role User
```
┌──────────────────────────────────────┐
│ Available Roles:                     │
│  ✓ Goal Setter (only role)           │
│                                      │
│ Shows: NO [Switch Role] button       │
│ (Only one role available)            │
└──────────────────────────────────────┘
```

## Interactive States

### Button States

```
NORMAL STATE:
┌─────────────────────────┐
│  [↻ Switch Role]        │
└─────────────────────────┘

HOVER STATE:
┌─────────────────────────┐
│  [↻ Switch Role]  ← darker background
└─────────────────────────┘

ACTIVE STATE (Dropdown Open):
┌─────────────────────────┐
│  [↻ Switch Role ▼]  ← arrow changes
└─────────────────────────┘
```

### Dropdown Item States

```
CURRENT ROLE (disabled):
┌─────────────────────────────────────┐
│ 🔵 Goal Setter    [Current]  ← gray  │
│ (background: light gray)            │
│ (cursor: default)                   │
└─────────────────────────────────────┘

AVAILABLE ROLE (clickable):
┌─────────────────────────────────────┐
│ 🟢 Buyer                 ← normal   │
│ (background: white)                 │
│ (cursor: pointer)                   │
│ (hover: light gray)                 │
└─────────────────────────────────────┘
```

## Animation Flow

```
Timeline: User clicks "Switch Role"

T=0ms   Dropdown appears
        ├─ Fade in (opacity: 0 → 1)
        └─ Duration: 150ms

T=150ms Dropdown fully visible
        └─ User can click role

T=200ms User clicks "Buyer"
        └─ Dropdown closes

T=250ms Modal appears
        ├─ Fade in overlay (opacity: 0 → 0.5)
        ├─ Modal scales in (scale: 0.5 → 1)
        └─ Duration: 300ms

T=550ms Modal fully visible
        └─ User can click "Cancel" or "Switch"

T=1000ms User clicks "Switch"
        ├─ Modal closes
        ├─ API call to backend
        └─ Loading state active

T=1500ms Backend responds
        ├─ Modal removed
        ├─ Toast notification appears
        ├─ Navigation happens
        └─ Redirect to /buyer-dashboard
```

## Mobile Responsiveness

### Mobile Header (< 768px)
```
┌──────────────────────────────┐
│  🏠 SmartGoal  ↻ ⏚ ☰        │  ← Menu icon
└──────────────────────────────┘
  [🔵 Goal Setter]
  [↻ Switch Role] [⏚ Logout]

Navigation: Collapsed into hamburger
```

### Tablet Header (768px - 1024px)
```
┌────────────────────────────────────────┐
│  🏠 SmartGoal [🔵 GS]  ...  ↻ Logout  │
└────────────────────────────────────────┘
```

### Desktop Header (> 1024px)
```
┌──────────────────────────────────────────────────┐
│  🏠 SmartGoal [🔵 Goal Setter]  Overview Goals  │
│  Marketplace              User [↻ Switch] [⏚]   │
└──────────────────────────────────────────────────┘
```

## Accessibility Features

```
✓ Keyboard Navigation
  ├─ Tab to "Switch Role" button
  ├─ Tab through dropdown items
  ├─ Enter/Space to select
  └─ Escape to close dropdown

✓ Screen Reader Support
  ├─ aria-label on buttons
  ├─ Role descriptions in labels
  └─ Modal announcements

✓ Color Contrast
  ├─ Badges high contrast
  ├─ Text meets WCAG AA
  └─ Icons have fallback text

✓ Touch Targets
  ├─ Buttons: 44px minimum
  ├─ Dropdown items: 36px height
  └─ Easy to tap on mobile
```

---

**Visual Guide Created:** January 2024  
**Component:** DashboardHeader.jsx  
**Status:** Complete