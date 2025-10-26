# Create Test Users

## 🔧 Quick Fix: Create Test Users in Your App

The login tests are failing because the test users don't exist or have wrong credentials.

### Option 1: Register Users Manually (Recommended)

1. **Start your app** (both client and server)
2. **Go to:** http://localhost:5173/register
3. **Register Goal Setter:**
   - Name: `Goal Setter Test`
   - Email: `goalsetter@test.com`
   - Password: `Test@123`
   - Role: **Goal Setter** ✓
   - Click Register

4. **Register Buyer:**
   - Name: `Buyer Test`
   - Email: `buyer@test.com`
   - Password: `Test@123`
   - Role: **Buyer** ✓
   - Click Register

### Option 2: Check Existing Users

If you already have test users, update `testing/playwright/config.js` with their emails:

```javascript
goalSetter: {
  email: 'your.actual.goalsetter@email.com',  // ← Use real email
  password: 'YourActualPassword',              // ← Use real password
  role: 'goal_setter'
},
buyer: {
  email: 'your.actual.buyer@email.com',        // ← Use real email
  password: 'YourActualPassword',              // ← Use real password
  role: 'buyer'
}
```

### Option 3: Use MongoDB to Check/Create Users

If you have MongoDB Compass or mongo shell:

1. **Check if users exist:**
```javascript
db.users.find({ email: 'goalsetter@test.com' })
db.users.find({ email: 'buyer@test.com' })
```

2. **Check their roles:**
```javascript
db.users.findOne({ email: 'goalsetter@test.com' }, { role: 1 })
```

The role should be exactly `"goal_setter"` (with underscore) or `"buyer"`.

## 🎯 After Creating Users

Run tests again:

```powershell
cd testing\playwright
npm run test:ui
```

You should see more tests passing!

## 📸 Check What Happened

Look at the screenshot to see the exact error:

```
testing/playwright/playwright-report/goalsetter-login-result.png
```

This shows what the login page looked like when the test failed.

## 🔍 Debug Login Issues

If login still fails after creating users, check:

1. **Email format** - Must be exact (case-sensitive)
2. **Password** - Must match exactly
3. **Role** - Must be `goal_setter` or `buyer` (with underscore)
4. **Email verification** - Make sure your app doesn't require email verification for test users

## 💡 Quick Test

Try logging in manually with the test credentials:
1. Go to: http://localhost:5173/login
2. Email: `goalsetter@test.com`
3. Password: `Test@123`
4. If it works ✅ - Tests should work
5. If it fails ❌ - Create the user or update config.js

