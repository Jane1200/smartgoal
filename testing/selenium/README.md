# SmartGoal Selenium Test Suite

Automated end-to-end testing for the SmartGoal application using Selenium WebDriver.

## 📋 Table of Contents

- [Features](#features)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running Tests](#running-tests)
- [Test Coverage](#test-coverage)
- [Reports](#reports)
- [Troubleshooting](#troubleshooting)

## ✨ Features

- ✅ **Automated Browser Testing** - Tests run in real Chrome browser
- ✅ **Comprehensive Coverage** - Wishlist, Goals, Authentication
- ✅ **Beautiful HTML Reports** - Visual test results with pass/fail status
- ✅ **Screenshots** - Automatic screenshots on test failure
- ✅ **No Modifications Required** - Doesn't touch your env files or database

## 📦 Prerequisites

Before running the tests, make sure you have:

1. **Node.js** (v16 or higher)
2. **Chrome Browser** (latest version)
3. **SmartGoal App Running**:
   - Client server on `http://localhost:5173` (Vite)
   - API server on `http://localhost:5000` (Express)

## 🚀 Installation

### Step 1: Navigate to Test Directory

```bash
cd testing/selenium
```

### Step 2: Install Dependencies

```bash
npm install
```

This will install:
- `selenium-webdriver` - Browser automation
- `chromedriver` - Chrome WebDriver
- `colors` - Colored console output

### Step 3: Configure Test Settings

Edit `config.js` to match your setup:

```javascript
export const config = {
  // Your application URLs
  baseUrl: 'http://localhost:5173',
  apiUrl: 'http://localhost:5000',
  
  // Test user credentials
  testUser: {
    email: 'test@example.com',  // ← Change this
    password: 'Test@123',         // ← Change this
    name: 'Test User'
  },
  
  // ... other settings
};
```

**Important**: Create a test user in your app with these credentials before running tests!

## ⚙️ Configuration

### Browser Settings

```javascript
browser: {
  name: 'chrome',
  headless: false,  // Set to true to run in background
  windowSize: { width: 1920, height: 1080 }
}
```

- `headless: false` - You'll see the browser
- `headless: true` - Runs in background (faster, good for CI/CD)

### Timeouts

```javascript
timeouts: {
  implicit: 10000,   // Wait for elements
  pageLoad: 30000,   // Page load timeout
  script: 30000,     // Script execution
  element: 10000     // Element wait timeout
}
```

### Screenshots

```javascript
screenshots: {
  onFailure: true,   // Screenshot on test failure
  onSuccess: false,  // Screenshot on success
  directory: './screenshots'
}
```

## 🧪 Running Tests

### Run All Tests

```bash
npm test
```

This runs the complete test suite:
- Wishlist tests
- Goals tests
- Generates HTML report

### Run Specific Test Suite

```bash
# Run only wishlist tests
npm run test:wishlist

# Run only goals tests
npm run test:goals
```

### View Test Report

```bash
npm run report
```

Opens the latest HTML report in your browser.

## 📊 Test Coverage

### Wishlist Tests

1. ✅ Navigate to Wishlist Page
2. ✅ Add Wishlist Item Manually
3. ✅ Verify Goal Created from Wishlist
4. ✅ Edit Wishlist Item
5. ✅ Delete Wishlist Item

### Goals Tests

1. ✅ Navigate to Goals Page
2. ✅ Create New Goal
3. ✅ Verify Goal in List
4. ✅ Edit Goal
5. ✅ Check Goal Priority Display
6. ✅ Delete Goal

### Authentication Tests (Optional)

1. ✅ User Login
2. ✅ Role Selection
3. ✅ User Logout

## 📈 Reports

After running tests, you'll find:

### HTML Report

Location: `./reports/test-report.html`

Features:
- ✅ Visual pass/fail indicators
- ✅ Test duration
- ✅ Pass rate percentage
- ✅ Error messages for failed tests
- ✅ Beautiful, responsive design

### JSON Report

Location: `./reports/test-report.json`

Machine-readable test results for CI/CD integration.

### Screenshots

Location: `./screenshots/`

- `goal-created.png`
- `wishlist-item-added.png`
- `test-failed.png` (on failures)

## 🎯 What Tests Check

### Wishlist → Goal Integration

- ✅ Wishlist item creates a goal automatically
- ✅ Goal has correct category ("Discretionary")
- ✅ Goal has correct priority (mapped from wishlist)
- ✅ Goal has correct due date
- ✅ Goal has correct target amount (from price)
- ✅ Goal appears on Goals page

### Goal Validation

- ✅ Title validation (meaningful text)
- ✅ Amount validation (100-100,000)
- ✅ Category selection
- ✅ Priority display
- ✅ Due date setting

### UI Elements

- ✅ Navigation works
- ✅ Forms submit correctly
- ✅ Toast notifications appear
- ✅ Lists update in real-time

## 🔧 Troubleshooting

### Issue: "ChromeDriver version mismatch"

**Solution**: Update chromedriver

```bash
npm install chromedriver@latest
```

### Issue: "Connection refused" errors

**Solution**: Make sure both servers are running:

```bash
# Terminal 1 - Client
cd client
npm run dev

# Terminal 2 - Server
cd server
npm start

# Terminal 3 - Tests
cd testing/selenium
npm test
```

### Issue: "Test user login failed"

**Solutions**:
1. Create test user in the app first
2. Update credentials in `config.js`
3. Make sure user has `goal_setter` role

### Issue: Tests timing out

**Solutions**:
1. Increase timeouts in `config.js`
2. Check if app is responding slowly
3. Run with `headless: false` to see what's happening

### Issue: Element not found

**Solutions**:
1. Check if UI has changed
2. Update selectors in test files
3. Increase `timeouts.element` in config

### Issue: Screenshots not saving

**Solution**: Create screenshots directory manually

```bash
mkdir screenshots
```

## 📝 Customizing Tests

### Adding New Tests

Create a new test file in `tests/` directory:

```javascript
// tests/my-feature.test.js
import { createDriver, clickElement, typeText } from '../utils/driver.js';
import { login } from '../utils/auth.js';

export async function runMyFeatureTests() {
  const results = [];
  let driver;
  
  try {
    driver = await createDriver();
    await login(driver);
    
    // Your tests here
    results.push(await testSomething(driver));
    
  } finally {
    if (driver) await driver.quit();
  }
  
  return results;
}

async function testSomething(driver) {
  const testName = 'Test Something';
  
  try {
    // Test logic
    return { name: testName, status: 'PASSED' };
  } catch (error) {
    return { name: testName, status: 'FAILED', error: error.message };
  }
}
```

### Updating Selectors

If UI changes, update selectors in test files:

```javascript
// Old
await clickElement(driver, '.old-selector');

// New
await clickElement(driver, '.new-selector');
```

## 🚀 CI/CD Integration

### GitHub Actions Example

```yaml
name: Selenium Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v2
      
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: |
          cd testing/selenium
          npm install
      
      - name: Start application
        run: |
          cd client && npm install && npm run dev &
          cd server && npm install && npm start &
          sleep 10
      
      - name: Run tests
        run: |
          cd testing/selenium
          npm test
      
      - name: Upload test report
        uses: actions/upload-artifact@v2
        with:
          name: test-report
          path: testing/selenium/reports/
```

## 📚 Helper Functions

### Available in `utils/driver.js`

- `createDriver()` - Create WebDriver instance
- `waitForElement(driver, selector)` - Wait for element
- `clickElement(driver, selector)` - Click element
- `typeText(driver, selector, text)` - Type text
- `getElementText(driver, selector)` - Get text content
- `elementExists(driver, selector)` - Check if element exists
- `takeScreenshot(driver, filename)` - Take screenshot

### Available in `utils/auth.js`

- `login(driver, email, password)` - Login user
- `logout(driver)` - Logout user
- `isLoggedIn(driver)` - Check login status

## 🎨 Sample Test Output

```
🧪 Running SmartGoal Selenium Test Suite

📋 Running Wishlist Tests...
──────────────────────────────────────────────────

🔐 Logging in...
✓ Login successful

📋 Running: Navigate to Wishlist Page
✓ Navigate to Wishlist Page - PASSED

📋 Running: Add Wishlist Item Manually
✓ Add Wishlist Item Manually - PASSED

📋 Running: Verify Goal Created from Wishlist
  ✓ Found goal: "Test Product"
✓ Verify Goal Created from Wishlist - PASSED

╔════════════════════════════════════════╗
║         Test Summary                   ║
╚════════════════════════════════════════╝

  Total Tests:    10
  ✓ Passed:       8
  ✗ Failed:       0
  ⚠ Skipped:      2
  Duration:       45.3s

📊 Generating test report...
✓ Test report generated: ./reports/test-report.html
```

## 💡 Tips

1. **Run tests in headless mode for speed** - Set `headless: true` in config
2. **Use specific selectors** - data-testid attributes work best
3. **Add waits for dynamic content** - Use `waitForElement` helpers
4. **Take screenshots on key steps** - Helps with debugging
5. **Run tests regularly** - Catch regressions early

## 📧 Support

If you encounter issues:

1. Check the troubleshooting section
2. Review screenshots in `./screenshots/`
3. Check console output for error details
4. Review HTML report for specific test failures

## 📄 License

Part of the SmartGoal project.

