# Database Migration Scripts

## User Roles Migration & Admin Initialization

This directory contains scripts to migrate the User model from single `role` field to multi-role `roles` array, and to initialize the admin account.

---

## 📋 Scripts

### 0. **initAdmin.js** ⭐ (Run this first!)
Initializes or verifies the single admin account.

**Admin Credentials:**
- Email: `smartgoaladmin12@gmail.com`
- Password: `Admin@SmartGoal`

**What it does:**
- Creates the admin account if it doesn't exist
- Updates existing admin to ensure correct roles
- Verifies there's only one admin account
- Shows admin account details

**How to run:**
```bash
# From the server directory
node src/scripts/initAdmin.js
```

**Or use npm script:**
```bash
npm run init:admin
```

**When to run:**
- Before first deployment
- After database reset
- If admin account is missing or corrupted

---

## 📋 Migration Scripts

### 1. **migrateUserRoles.js**
Migrates all existing users to use the new `roles` array field.

**What it does:**
- Finds all users without a `roles` array
- Creates a `roles` array from their existing `role` field
- Maintains backward compatibility by keeping the `role` field
- Provides detailed progress and statistics

**How to run:**
```bash
# From the server directory
node src/scripts/migrateUserRoles.js
```

**Or add to package.json:**
```json
{
  "scripts": {
    "migrate:roles": "node src/scripts/migrateUserRoles.js"
  }
}
```

Then run:
```bash
npm run migrate:roles
```

---

### 2. **rollbackUserRoles.js**
Rolls back the migration (removes `roles` array, keeps only `role` field).

**What it does:**
- Finds all users with a `roles` array
- Sets their `role` field to `roles[0]`
- Removes the `roles` array

**How to run:**
```bash
# From the server directory
node src/scripts/rollbackUserRoles.js
```

**Or add to package.json:**
```json
{
  "scripts": {
    "rollback:roles": "node src/scripts/rollbackUserRoles.js"
  }
}
```

Then run:
```bash
npm run rollback:roles
```

---

## 🚀 Recommended Migration Process

### **Option A: Immediate Migration (Recommended for Production)**

1. **Backup your database first!**
   ```bash
   # MongoDB Atlas: Use the backup feature in the UI
   # Local MongoDB:
   mongodump --uri="your-mongodb-uri" --out=./backup
   ```

2. **Initialize the admin account:**
   ```bash
   npm run init:admin
   ```

3. **Run the migration script:**
   ```bash
   npm run migrate:roles
   ```

4. **Verify the results:**
   - Check the console output for success/error counts
   - Verify role distribution looks correct
   - Test your application thoroughly

5. **Deploy your updated code**

---

### **Option B: Lazy Migration (Safer, Gradual)**

1. **Deploy the updated code** (with the new User model)
2. **Don't run the migration script**
3. Users will be automatically migrated when they:
   - Log in
   - Update their profile
   - Are modified by admin

**Pros:**
- No downtime
- Gradual migration
- Lower risk

**Cons:**
- Queries using `roles` field won't find unmigrated users
- Takes longer to complete

---

## 🔍 Verification Queries

After migration, you can verify in MongoDB:

```javascript
// Check users without roles array
db.users.countDocuments({
  $or: [
    { roles: { $exists: false } },
    { roles: { $size: 0 } },
    { roles: null }
  ]
})

// Check role distribution
db.users.aggregate([
  { $unwind: '$roles' },
  { $group: { _id: '$roles', count: { $sum: 1 } } },
  { $sort: { count: -1 } }
])

// Find users with multiple roles
db.users.find({ 
  $expr: { $gt: [{ $size: "$roles" }, 1] } 
}).count()
```

---

## ⚠️ Important Notes

1. **Always backup your database before running migrations!**
2. **Test in a development/staging environment first**
3. The migration is idempotent (safe to run multiple times)
4. The rollback script is provided for emergency use only
5. After migration, all new users will automatically have the `roles` array

---

## 🐛 Troubleshooting

### Migration fails with "Cannot read property 'role' of undefined"
- Check your MongoDB connection string in `.env`
- Ensure the User model is correctly imported

### Some users still don't have roles array after migration
- Check the error messages in the console output
- Manually inspect those users in MongoDB
- They may have validation issues

### Application errors after migration
- Ensure all code changes are deployed
- Check that populate statements include both `role` and `roles`
- Verify middleware is using the updated role checking logic

---

## 📞 Support

If you encounter issues:
1. Check the console output for detailed error messages
2. Verify your MongoDB connection
3. Ensure all code changes are deployed
4. Test with a single user first before migrating all users