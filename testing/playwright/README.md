# SmartGoal Playwright Tests

Automated end-to-end testing using Playwright - **Works immediately on Windows!**

## 🎯 Test Coverage

### ✅ Tests Included

1. **Authentication (4 tests)**
   - User Registration
   - Goal Setter Login
   - Buyer Login
   - Invalid Login Handling

2. **Goal Setter - Goals (3 tests)**
   - Navigate to Goals Page
   - Create New Goal
   - Verify Goal in List

3. **Goal Setter - Wishlist (3 tests)**
   - Navigate to Wishlist Page
   - Create Wishlist Item
   - Verify Wishlist Item

4. **Marketplace (3 tests)**
   - Goal Setter: List Item
   - Buyer: Browse Marketplace
   - Buyer: View Product Details

5. **Buyer - Shopping Cart (4 tests)**
   - Add Item to Cart
   - Navigate to Cart
   - View Cart Contents
   - Verify Checkout Button

**Total: 17 Tests**

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd testing/playwright
npm install
```

### 2. Install Browser

```bash
npm run install-browsers
```

### 3. Configure Test Users

Edit `config.js` and update with your test user credentials:

```javascript
users: {
  goalSetter: {
    email: 'goalsetter@test.com',  // ← Update if needed
    password: 'Test@123',
    role: 'goal_setter'
  },
  buyer: {
    email: 'buyer@test.com',       // ← Update if needed
    password: 'Test@123',
    role: 'buyer'
  }
}
```

**Make sure these users exist in your app!**

### 4. Run Tests

```bash
# Make sure your app is running:
# Terminal 1: cd client && npm run dev (port 5173)
# Terminal 2: cd server && npm start (port 5000)

# Run all tests
npm test

# Run with UI (recommended for first time)
npm run test:ui

# Run specific test file
npm run test:auth
npm run test:goals
npm run test:wishlist
npm run test:marketplace
npm run test:cart
```

## 📊 View Results

### HTML Report

```bash
npm run report
```

Opens beautiful HTML report with:
- ✅ Pass/fail for each test
- 📸 Screenshots
- 🎥 Videos (on failure)
- ⏱️ Execution time
- 📝 Detailed logs

### Screenshots

All screenshots saved in: `playwright-report/`

## ⚙️ Configuration

### Test Settings

Edit `playwright.config.js`:

```javascript
{
  timeout: 30000,        // 30 second timeout
  retries: 0,           // No retries (set to 2 for CI)
  workers: 1,           // Run tests sequentially
  screenshot: 'only-on-failure',
  video: 'retain-on-failure'
}
```

### Base URLs

Edit `config.js`:

```javascript
{
  baseUrl: 'http://localhost:5173',
  apiUrl: 'http://localhost:5000'
}
```

## 🧪 Running Modes

### Headless Mode (Default)
```bash
npm test
```
Browser runs in background, faster execution.

### Headed Mode
```bash
npm run test:headed
```
See the browser while tests run.

### UI Mode (Interactive)
```bash
npm run test:ui
```
Best for development! Interactive test runner with:
- ✅ Pick which tests to run
- ✅ See browser in real-time
- ✅ Time-travel debugging
- ✅ Step through tests

### Debug Mode
```bash
npm run test:debug
```
Opens Playwright Inspector for step-by-step debugging.

## 📝 Test Structure

```
tests/
├── auth.spec.js         # Login, Registration
├── goals.spec.js        # Goal creation, viewing
├── wishlist.spec.js     # Wishlist management
├── marketplace.spec.js  # Listing & browsing
└── cart.spec.js         # Shopping cart
```

## 🔧 Troubleshooting

### Tests Fail Immediately

**Check:**
1. Are both servers running?
   - Client: http://localhost:5173
   - Server: http://localhost:5000
2. Do test users exist in your database?
3. Are the credentials in `config.js` correct?

### "Element not found" Errors

**Solutions:**
- Your UI structure might be different
- Update selectors in test files
- Run with `npm run test:ui` to inspect

### Tests Pass But Features Not Working

**This means:**
- ✅ Page loads correctly
- ✅ Elements are present
- ⚠️ But may need manual verification

**Check screenshots in `playwright-report/`**

## 💡 Tips

1. **Start with UI mode**: `npm run test:ui`
2. **Check screenshots**: They show exactly what happened
3. **Run one test at a time**: `npm run test:auth`
4. **Update selectors**: If your UI changes, update test files
5. **Add wait times**: If tests run too fast, add `await page.waitForTimeout(1000)`

## 📸 Screenshots Generated

- `goals-list.png` - Goals page with items
- `wishlist-page.png` - Wishlist interface
- `wishlist-items.png` - Wishlist items
- `marketplace-seller.png` - Seller marketplace view
- `marketplace-buyer.png` - Buyer marketplace view
- `product-details.png` - Product detail page
- `add-to-cart.png` - After adding to cart
- `cart-page.png` - Shopping cart page
- `cart-contents.png` - Cart with items
- `checkout-button.png` - Checkout interface

## 🎯 What Gets Tested

✅ **Pages Load** - All pages accessible
✅ **Forms Work** - Can submit data
✅ **Navigation** - Can move between pages
✅ **Authentication** - Login/Register work
✅ **Data Creation** - Can create goals, wishlist, listings
✅ **Role Separation** - Goal Setter vs Buyer features
✅ **Shopping Flow** - Browse → Add to Cart → Checkout

## ❓ FAQ

**Q: Do I need ChromeDriver?**
A: No! Playwright manages browsers automatically.

**Q: Do I need admin rights?**
A: No! Works without administrator privileges.

**Q: Which browser does it use?**
A: Chromium (Chrome) by default. Can configure others.

**Q: How long do tests take?**
A: ~2-3 minutes for all 17 tests.

**Q: Can I run in CI/CD?**
A: Yes! Works great in GitHub Actions, Jenkins, etc.

## 🚀 Next Steps

1. Run tests: `npm test`
2. View report: `npm run report`
3. Check screenshots
4. Share results!

## 📧 Support

If tests fail:
1. Check screenshots in `playwright-report/`
2. Run `npm run test:ui` to see what's happening
3. Verify both servers are running
4. Check test user credentials

---

**That's it!** These tests will work immediately - no ChromeDriver issues! 🎉

