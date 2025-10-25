# SmartGoal Server Setup Guide

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- MongoDB Atlas account or local MongoDB
- npm or yarn

---

## 📦 Installation

1. **Install dependencies:**
   ```bash
   cd server
   npm install
   ```

2. **Configure environment variables:**
   - Copy `.env.example` to `.env` (if exists)
   - Or ensure `.env` file has the following:
   ```env
   MONGO_URI=your-mongodb-connection-string
   JWT_SECRET=your-super-secret-jwt-key
   PORT=5000
   NODE_ENV=development
   FRONTEND_URL=http://localhost:5173
   
   # Email configuration (optional)
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=465
   SMTP_SECURE=true
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-app-password
   SMTP_FROM=your-email@gmail.com
   ```

---

## 🔧 Database Setup

### Step 1: Initialize Admin Account ⭐

**IMPORTANT:** Run this first to create the admin account!

```bash
npm run init:admin
```

**Admin Credentials:**
- **Email:** `smartgoaladmin12@gmail.com`
- **Password:** `Admin@SmartGoal`

This script will:
- ✅ Create the admin account if it doesn't exist
- ✅ Update existing admin with correct roles
- ✅ Verify there's only one admin

---

### Step 2: Migrate User Roles (If you have existing users)

If you have existing users in your database, run the migration:

```bash
npm run migrate:roles
```

This will:
- ✅ Add `roles` array to all existing users
- ✅ Maintain backward compatibility with `role` field
- ✅ Show migration statistics

**Note:** If this is a fresh database, you can skip this step.

---

## 🏃 Running the Server

### Development Mode
```bash
npm run dev
```

The server will start on `http://localhost:5000`

### Production Mode
```bash
npm start
```

---

## 🧪 Testing the Setup

### 1. Health Check
```bash
curl http://localhost:5000/api/health
```

Expected response: `{"ok":true}`

### 2. Admin Login
Use these credentials to test admin login:
- **Email:** `smartgoaladmin12@gmail.com`
- **Password:** `Admin@SmartGoal`

**Login endpoint:**
```bash
POST http://localhost:5000/api/auth/login
Content-Type: application/json

{
  "email": "smartgoaladmin12@gmail.com",
  "password": "Admin@SmartGoal"
}
```

---

## 📋 Available Scripts

| Script | Command | Description |
|--------|---------|-------------|
| Development | `npm run dev` | Start server with nodemon (auto-reload) |
| Initialize Admin | `npm run init:admin` | Create/verify admin account |
| Migrate Roles | `npm run migrate:roles` | Migrate users to multi-role system |
| Rollback Roles | `npm run rollback:roles` | Rollback role migration (emergency) |

---

## 🔐 Admin Account Details

**There is only ONE admin account:**
- **Email:** `smartgoaladmin12@gmail.com`
- **Password:** `Admin@SmartGoal`
- **Name:** Smart Goal Admin

**Security Notes:**
- ⚠️ Change the password in production!
- ⚠️ Never commit credentials to version control
- ⚠️ Use environment variables for sensitive data in production

---

## 🗂️ Project Structure

```
server/
├── src/
│   ├── config/          # Database configuration
│   ├── middleware/      # Express middleware (auth, admin)
│   ├── models/          # Mongoose models
│   ├── routes/          # API routes
│   ├── scripts/         # Database scripts (migrations, init)
│   ├── utils/           # Utility functions
│   └── server.js        # Main server file
├── uploads/             # Uploaded files (marketplace images)
├── .env                 # Environment variables
└── package.json         # Dependencies and scripts
```

---

## 🔍 Troubleshooting

### Cannot connect to MongoDB
- Check your `MONGO_URI` in `.env`
- Ensure MongoDB Atlas IP whitelist includes your IP
- Verify database user credentials

### Admin login fails
- Run `npm run init:admin` to verify/create admin account
- Check that email and password match exactly
- Verify the user exists in MongoDB

### Migration errors
- Backup your database first
- Check MongoDB connection
- Review error messages in console
- See `src/scripts/README.md` for detailed troubleshooting

---

## 📚 Additional Documentation

- **Migration Scripts:** See `src/scripts/README.md`
- **API Documentation:** (Add link to API docs if available)
- **User Roles System:** See User.js model for role implementation

---

## 🆘 Support

If you encounter issues:
1. Check the console output for error messages
2. Verify all environment variables are set correctly
3. Ensure MongoDB connection is working
4. Review the scripts README for detailed troubleshooting

---

## ✅ Setup Checklist

- [ ] Dependencies installed (`npm install`)
- [ ] `.env` file configured with MongoDB URI
- [ ] Admin account initialized (`npm run init:admin`)
- [ ] Existing users migrated (`npm run migrate:roles`) - if applicable
- [ ] Server starts successfully (`npm run dev`)
- [ ] Health check passes
- [ ] Admin login works
- [ ] Ready for development! 🎉