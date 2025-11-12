# 🎭 SmartGoal Playwright Tests

Comprehensive automated testing suite for SmartGoal application using Playwright.

## 📋 Test Coverage

### 🔐 Authentication Tests (`auth.spec.js`)
- User registration flow
- Goal Setter login
- Buyer login  
- Invalid credentials handling

### 🎯 Goals Tests (`goals.spec.js`)
- Navigate to goals page
- Create new goal
- Verify goals list display

### ❤️ Wishlist Tests (`wishlist.spec.js`)
- Navigate to wishlist page
- Create wishlist items
- Verify wishlist display

### 🛒 Marketplace Tests (`marketplace.spec.js`)
- Goal Setter marketplace listing
- Buyer marketplace browsing
- Product detail viewing

### 🛍️ Cart Tests (`cart.spec.js`)
- Add items to cart
- Navigate to cart page
- View cart contents
- Checkout button verification

## 🚀 Quick Start

### Prerequisites

1. **Servers must be running:**
   ```bash
   # Terminal 1 - Start client
   cd client
   npm run dev
   
   # Terminal 2 - Start server
   cd server
   node src/server.js
   ```

2. **Test users configured** in `config.js`:
   - Goal Setter user credentials
   - Buyer user credentials

### Installation

```bash
cd testing/playwright
npm install
npx playwright install chromium
```

## 🎮 Running Tests

### Run All Tests (Recommended)
```bash
npm run test:all
```
This will:
- Run all test suites sequentially
- Generate HTML screenshot viewer
- Create markdown report
- Display comprehensive summary

### Run Individual Test Suites
```bash
npm run test:auth        # Authentication tests only
npm run test:goals       # Goals tests only
npm run test:wishlist    # Wishlist tests only
npm run test:marketplace # Marketplace tests only
npm run test:cart        # Cart tests only
```

### Run with UI Mode (Interactive)
```bash
npm run test:ui
```

### Run in Headed Mode (See Browser)
```bash
npm run test:headed
```

### Debug Mode
```bash
npm run test:debug
```

## 📊 View Reports

### HTML Screenshot Viewer
```bash
# After running tests, open in browser:
playwright-report/screenshots.html
```
Beautiful, categorized view of all test screenshots with:
- Interactive navigation
- Full-screen image viewer
- Categorized by test type
- Modern responsive design

### Playwright HTML Report
```bash
npm run report
```
Opens official Playwright HTML report with:
- Test results timeline
- Trace viewer
- Network logs
- Console output

### Markdown Report
```bash
# Read the markdown file:
TEST_REPORT.md
```
Comprehensive text report with:
- Test statistics
- Pass/fail status
- Screenshots embedded
- Execution times

## 📁 Generated Files

After running tests, you'll find:

```
testing/playwright/
├── playwright-report/
│   ├── screenshots.html      ← HTML screenshot viewer (Open this!)
│   ├── index.html            ← Playwright report
│   ├── *.png                 ← Test screenshots
│   └── traces/               ← Execution traces
├── test-results.json         ← JSON test results
└── TEST_REPORT.md           ← Markdown report
```

## ⚙️ Configuration

### Update Test Users (`config.js`)

```javascript
users: {
  goalSetter: {
    email: 'your-goalsetter@test.com',
    password: 'YourPassword123'
  },
  buyer: {
    email: 'your-buyer@test.com',
    password: 'YourPassword123'
  }
}
```

**Important:** These users MUST exist in your database with correct roles!

### Test Data

Modify test data for goals, wishlist items, and marketplace products in `config.js`:

```javascript
testData: {
  goal: { title: '...', targetAmount: '50000', ... },
  wishlist: { title: '...', price: '129900', ... },
  marketplace: { title: '...', price: '95000', ... }
}
```

## 🎯 Test Features

### Robust & Resilient
- Handles various application states
- Graceful error handling
- Detailed console logging
- Screenshots at key points
- Automatic retry on CI

### Comprehensive Screenshots
Every test captures screenshots showing:
- Page state after actions
- Success confirmations
- Error messages
- Final results

### Clear Logging
Console output shows:
- ✓ Success messages (green)
- ⚠️  Warnings (yellow)
- ❌ Errors (red)
- Current URLs
- Test progress

## 📝 Understanding Results

### Test Outcomes

**✅ PASSED**: Test completed successfully
- User logged in
- Page loaded
- Action completed
- Expected state reached

**⚠️  SKIPPED/GRACEFUL**: Test handled edge case
- Form not available (may require setup)
- Insufficient savings (business rule working correctly)
- Empty state (expected if no data)

**❌ FAILED**: Test encountered error
- Login failed (check credentials)
- Page didn't load
- Timeout occurred
- Unexpected error

### Common Issues & Solutions

#### "Still on login page"
- ❌ **Cause**: Incorrect credentials
- ✅ **Fix**: Update `config.js` with correct user emails/passwords

#### "Form not visible"
- ⚠️  **Cause**: Different app state or navigation required
- ✅ **Fix**: Check if user needs to navigate differently

#### "Insufficient savings"
- ✅ **Expected**: Business rule validation working!
- ℹ️  **Note**: Add savings to test user to test goal creation

#### "Servers not running"
- ❌ **Cause**: Client or API server not started
- ✅ **Fix**: Start both servers before running tests

## 🔧 Advanced Usage

### Custom Playwright Commands

```bash
# Run specific test
npx playwright test tests/auth.spec.js -g "Goal Setter Login"

# Run with trace
npx playwright test --trace on

# Generate report only
npm run generate-report
```

### Environment Variables

```bash
# Set base URL
BASE_URL=http://localhost:3000 npm test

# CI mode (more retries, parallel)
CI=true npm test
```

## 📸 Screenshot Naming Convention

Screenshots are automatically named descriptively:
- `registration-result.png` - Registration page result
- `goalsetter-login-result.png` - Goal setter login
- `buyer-login-result.png` - Buyer login
- `goals-page.png` - Goals page view
- `wishlist-items.png` - Wishlist items
- `marketplace-seller.png` - Marketplace seller view
- `cart-contents.png` - Shopping cart contents

## 🎨 Screenshot Viewer Features

The HTML screenshot viewer (`screenshots.html`) includes:
- **Beautiful UI**: Gradient design, modern cards
- **Categories**: Filter by test type
- **Modal View**: Click any screenshot for full-size view
- **Responsive**: Works on all screen sizes
- **Statistics**: View test counts and dates
- **Navigation**: Easy category switching

## 🤝 Contributing

When adding new tests:
1. Follow existing test structure
2. Add descriptive console logs
3. Capture screenshots at key points
4. Handle errors gracefully
5. Update this README

## 📚 Resources

- [Playwright Documentation](https://playwright.dev)
- [SmartGoal Project](../..)
- [Test Configuration](config.js)

---

**Made with ❤️ for SmartGoal Testing**








