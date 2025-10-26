# 🚀 Quick Start - SmartGoal Selenium Tests

Get up and running in 5 minutes!

## Step 1: Prerequisites Check ✅

Make sure you have:
- [ ] Node.js installed (v16+)
- [ ] Chrome browser installed
- [ ] SmartGoal app running:
  - [ ] Client on http://localhost:5173
  - [ ] Server on http://localhost:5000

## Step 2: Install (1 minute) 📦

```bash
cd testing/selenium
npm install
```

## Step 3: Configure (2 minutes) ⚙️

Edit `config.js`:

```javascript
testUser: {
  email: 'your-test-user@example.com',  // ← Change this
  password: 'YourPassword123',           // ← Change this
  name: 'Test User'
}
```

**Important**: Create this user in your app first!

## Step 4: Run Tests (2 minutes) 🧪

```bash
npm test
```

That's it! 🎉

## View Results 📊

Open `./reports/test-report.html` in your browser.

## What Just Happened?

The tests:
1. ✅ Logged in to your app
2. ✅ Created a wishlist item
3. ✅ Verified goal was created automatically
4. ✅ Tested goal features
5. ✅ Generated a beautiful HTML report

## Next Steps

- Review the HTML report
- Check screenshots in `./screenshots/`
- Read full `README.md` for advanced usage

## Common Issues

**Tests failing immediately?**
- Make sure both client and server are running
- Check if test user exists in your app
- Verify URLs in `config.js` are correct

**Browser not opening?**
- Install/update Chrome
- Run: `npm install chromedriver@latest`

**Timeout errors?**
- Increase timeouts in `config.js`
- Check if app is slow to load

## Need Help?

Check `README.md` for detailed troubleshooting!

