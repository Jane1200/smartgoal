# SmartGoal Design System - Quick Reference
## Copy-Paste Ready Code Snippets

---

## 🎨 Color Tokens

### Primary Colors
```scss
$color-primary:         #161da3;  // Main brand blue
$color-primary-hover:   #1e40af;  // Hover state
$color-primary-light:   #6366f1;  // Light variant
```

### Semantic Colors
```scss
$color-success:  #16a34a;  // Green (success, completed)
$color-warning:  #ea580c;  // Orange (warnings)
$color-danger:   #dc2626;  // Red (errors, delete)
$color-info:     #0891b2;  // Cyan (information)
```

### Neutral Colors (Use for text, borders, backgrounds)
```scss
$color-neutral-50:   #f8fafc;   // Lightest (page background)
$color-neutral-100:  #f1f5f9;   // Light (hover states)
$color-neutral-200:  #e2e8f0;   // Borders
$color-neutral-300:  #cbd5e1;   // Secondary borders
$color-neutral-400:  #94a3b8;   // Placeholder text
$color-neutral-500:  #64748b;   // Secondary text
$color-neutral-600:  #475569;   // Tertiary text
$color-neutral-700:  #334155;   // Body text
$color-neutral-800:  #1e293b;   // Strong text
$color-neutral-900:  #0f172a;   // Darkest (primary text)
```

### Quick Color Usage
```scss
// Text colors
.text-primary { color: $color-primary; }
.text-muted { color: $color-neutral-500; }

// Background colors
.bg-light { background-color: $color-neutral-50; }
.bg-lighter { background-color: $color-neutral-100; }

// Borders
.border { border-color: $color-neutral-200; }
```

---

## 📐 Spacing Scale

Use these instead of hardcoded pixel values:

```scss
$space-xs:   0.25rem;   /* 4px   - Micro spacing */
$space-sm:   0.5rem;    /* 8px   - Small spacing */
$space-md:   1rem;      /* 16px  - Default spacing */
$space-lg:   1.5rem;    /* 24px  - Large spacing */
$space-xl:   2rem;      /* 32px  - Extra large */
$space-2xl:  3rem;      /* 48px  - 2X large */
$space-3xl:  4rem;      /* 64px  - 3X large */
```

### Spacing Examples
```scss
// Padding
.card {
  padding: $space-lg;        // 24px all around
  padding-top: $space-xl;    // 32px top
  padding: $space-md $space-lg;  // 16px vertical, 24px horizontal
}

// Margin
.section {
  margin-bottom: $space-xl;  // 32px bottom
  margin: 0 auto;            // Center (responsive)
}

// Gap (flexbox/grid)
.row {
  gap: $space-lg;            // 24px gap between items
}

// Utility classes (Bootstrap-style)
.p-3 { padding: $space-lg; }
.mb-4 { margin-bottom: $space-xl; }
.gap-lg { gap: $space-lg; }
```

---

## 📝 Typography

### Font Families
```scss
$font-family-base:     "Wix Madefor Text", system-ui, sans-serif;
$font-family-display:  "Poppins", $font-family-base;
```

### Font Sizes
```scss
$font-size-sm:   0.875rem;   /* 14px - small text */
$font-size-base: 1rem;       /* 16px - body text */
$font-size-lg:   1.125rem;   /* 18px - larger text */
$font-size-xl:   1.25rem;    /* 20px - headings */
$font-size-2xl:  1.5rem;     /* 24px - h5/h4 */
$font-size-3xl:  1.875rem;   /* 30px - h3 */
$font-size-4xl:  2.25rem;    /* 36px - h1 */
```

### Font Weights
```scss
$font-weight-normal:     400;  // Body text
$font-weight-medium:     500;  // Slightly bold
$font-weight-semibold:   600;  // Buttons, labels
$font-weight-bold:       700;  // Headings
$font-weight-extrabold:  800;  // Large headings
```

### Typography Examples
```scss
// Heading styles
h1 {
  font-size: $font-size-4xl;
  font-weight: $font-weight-extrabold;
  font-family: $font-family-display;
  line-height: 1.2;
  color: $color-neutral-900;
}

// Body text
p {
  font-size: $font-size-base;
  font-weight: $font-weight-normal;
  line-height: 1.6;
  color: $color-neutral-700;
}

// Secondary text
.small {
  font-size: $font-size-sm;
  color: $color-neutral-500;
}
```

---

## 🎭 Shadows (Depth)

```scss
$shadow-xs:   0 1px 2px 0 rgba(0, 0, 0, 0.05);
$shadow-sm:   0 1px 3px 0 rgba(0, 0, 0, 0.1), 
              0 1px 2px 0 rgba(0, 0, 0, 0.06);
$shadow-md:   0 4px 6px -1px rgba(0, 0, 0, 0.1),
              0 2px 4px -1px rgba(0, 0, 0, 0.06);
$shadow-lg:   0 10px 15px -3px rgba(0, 0, 0, 0.1),
              0 4px 6px -2px rgba(0, 0, 0, 0.05);
$shadow-xl:   0 20px 25px -5px rgba(0, 0, 0, 0.1),
              0 10px 10px -5px rgba(0, 0, 0, 0.04);
$shadow-2xl:  0 25px 50px -12px rgba(0, 0, 0, 0.25);
```

### Shadow Usage
```scss
// Default card
.card {
  box-shadow: $shadow-sm;  // Subtle
}

// Card hover
.card:hover {
  box-shadow: $shadow-md;  // More depth
}

// Modal overlay
.modal {
  box-shadow: $shadow-xl;  // Deep shadow
}

// Floating element
.floating-btn {
  box-shadow: $shadow-lg;  // Stands out
}
```

---

## 📏 Border Radius

```scss
$radius-sm:   0.375rem;   /* 6px   - small elements */
$radius-md:   0.5rem;     /* 8px   - inputs */
$radius-lg:   1rem;       /* 16px  - cards, buttons */
$radius-xl:   1.5rem;     /* 24px  - modals */
$radius-full: 9999px;     /* Full  - pills, avatars */
```

### Radius Usage
```scss
// Small elements (badges, tags)
.badge {
  border-radius: $radius-sm;
}

// Form inputs
.form-control {
  border-radius: $radius-lg;
}

// Cards and containers
.card {
  border-radius: $radius-lg;
}

// Pills (button-like)
.btn-pill {
  border-radius: $radius-full;
  padding: 0.5rem 1rem;
}

// Avatar circles
.avatar {
  border-radius: $radius-full;
  width: 40px;
  height: 40px;
}
```

---

## ⏱️ Transitions

```scss
$transition-fast:  150ms ease;   // Micro-interactions (hover effects)
$transition-base:  300ms ease;   // Normal interactions (fades, slides)
$transition-slow:  500ms ease;   // Entrance animations (page loads)
```

### Transition Examples
```scss
// Fast: Button hover, icon hover
.icon-btn {
  transition: transform $transition-fast;
  
  &:hover {
    transform: scale(1.1);
  }
}

// Base: Color change, fade in, dropdown
.card {
  transition: all $transition-base;
  
  &:hover {
    box-shadow: $shadow-md;
    border-color: $color-primary;
  }
}

// Slow: Page entrance, slide-in animations
.modal {
  animation: slideUp $transition-slow ease-out;
}
```

---

## 🔘 Component Quick Builds

### Card Component
```scss
.card {
  border: 1px solid $color-neutral-200;
  border-radius: $radius-lg;
  box-shadow: $shadow-sm;
  background: white;
  overflow: hidden;
  transition: all $transition-base;

  &:hover {
    box-shadow: $shadow-md;
    border-color: $color-neutral-300;
  }

  .card-header {
    padding: $space-lg;
    border-bottom: 1px solid $color-neutral-200;
    background: $color-neutral-50;
  }

  .card-body {
    padding: $space-lg;
  }
}
```

### Button Component
```scss
.btn {
  border-radius: $radius-lg;
  padding: $space-md $space-lg;
  font-weight: $font-weight-semibold;
  transition: all $transition-base;
  border: none;
  cursor: pointer;
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;

  // Primary variant
  &.btn-primary {
    background: linear-gradient(135deg, $color-primary 0%, $color-primary-light 100%);
    color: white;
    box-shadow: 0 4px 15px rgba($color-primary, 0.3);

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba($color-primary, 0.4);
    }
  }

  // Secondary variant
  &.btn-secondary {
    background: white;
    border: 2px solid $color-neutral-200;
    color: $color-neutral-700;

    &:hover {
      border-color: $color-primary;
      color: $color-primary;
      background: rgba($color-primary, 0.05);
    }
  }

  // Disabled state
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}
```

### Input/Form Component
```scss
.form-control,
.form-select {
  border: 1px solid $color-neutral-200;
  border-radius: $radius-lg;
  padding: $space-md;
  font-size: $font-size-base;
  transition: all $transition-base;
  background: white;

  &:focus {
    border-color: $color-primary;
    box-shadow: 0 0 0 3px rgba($color-primary, 0.1);
    outline: none;
  }

  &::placeholder {
    color: $color-neutral-400;
  }
}
```

### Badge Component
```scss
.badge {
  border-radius: $radius-full;
  padding: 0.375rem 0.75rem;
  font-size: $font-size-sm;
  font-weight: $font-weight-semibold;
  letter-spacing: 0.5px;
  display: inline-block;

  // Variants
  &.bg-primary {
    background: $color-primary;
    color: white;
  }

  &.bg-success {
    background: $color-success;
    color: white;
  }

  &.bg-warning {
    background: $color-warning;
    color: white;
  }
}
```

---

## 📱 Responsive Breakpoints

```scss
$breakpoint-xs:   0;     /* Mobile */
$breakpoint-sm:   576px; /* Small tablet */
$breakpoint-md:   768px; /* Tablet */
$breakpoint-lg:   992px; /* Desktop */
$breakpoint-xl:   1200px;/* Large desktop */
$breakpoint-2xl:  1400px;/* Extra large */
```

### Responsive Examples
```scss
// Hide on mobile, show on desktop
.desktop-only {
  display: none;
  
  @media (min-width: $breakpoint-lg) {
    display: block;
  }
}

// Stack on mobile, side-by-side on desktop
.responsive-grid {
  display: grid;
  grid-template-columns: 1fr;  // Mobile: single column
  gap: $space-md;

  @media (min-width: $breakpoint-md) {
    grid-template-columns: 1fr 1fr;  // Tablet: 2 columns
  }

  @media (min-width: $breakpoint-lg) {
    grid-template-columns: 1fr 1fr 1fr;  // Desktop: 3 columns
  }
}

// Different spacing on mobile vs desktop
.container {
  padding: $space-md;
  
  @media (min-width: $breakpoint-lg) {
    padding: $space-xl;
  }
}
```

---

## 🎯 Common Patterns

### Center Content
```scss
.container-centered {
  display: flex;
  align-items: center;
  justify-content: center;
}
```

### Flex Row with Gap
```scss
.flex-row {
  display: flex;
  gap: $space-lg;
  align-items: center;
}
```

### Grid Layout
```scss
.grid-3 {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: $space-lg;
}
```

### Hover Lift Effect
```scss
.card-hover {
  transition: all $transition-base;
  
  &:hover {
    transform: translateY(-4px);
    box-shadow: $shadow-lg;
  }
}
```

### Fade In Animation
```scss
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.fade-in {
  animation: fadeIn $transition-base ease-out;
}
```

---

## 💡 Pro Tips

1. **Always use variables** - Never hardcode colors or spacing
2. **Mobile first** - Start with mobile styles, add desktop with @media
3. **Consistent spacing** - Use multiples of base spacing (8px)
4. **Shadow for depth** - Use shadows to indicate elevation, not just borders
5. **Transitions for feel** - Use $transition-base for smooth, professional look
6. **Color accessibility** - Maintain contrast ratios (4.5:1 for normal text)
7. **Touch targets** - Min 44px for mobile buttons
8. **Reduce motion** - Respect `prefers-reduced-motion` for animations

---

## ✅ Quick Checklist

When styling new components:
- [ ] Use design tokens (no hardcoded values)
- [ ] Add smooth transitions
- [ ] Include hover/focus states
- [ ] Test on mobile (responsive)
- [ ] Check color contrast
- [ ] Minimum 44px tap targets on mobile
- [ ] Consistent spacing (use $space-* scale)
- [ ] Documentation comments

---

**File**: `client/src/assets/scss/config/_design-system.scss`  
**Last Updated**: 2024  
**Version**: 1.0