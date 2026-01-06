# Automated Cron Jobs - Complete Guide

## 🎯 Overview

SmartGoal now includes **4 automated cron jobs** that run on scheduled intervals to maintain data quality, notify users, and generate reports.

## ✅ Implemented Cron Jobs

### 1. 📊 Weekly Financial Health Summary
- **Schedule:** Every Monday at 9:00 AM IST
- **Cron Expression:** `0 9 * * 1`
- **What it does:**
  - Calculates weekly income, expenses, and net savings
  - Shows active goals progress
  - Displays marketplace activity
  - Sends personalized HTML email to each user
- **Email includes:**
  - Total income & expenses for the week
  - Net savings calculation
  - Goals progress with percentage completion
  - Marketplace listings created
  - Financial tips based on user's performance

### 2. 🧹 Expired Resale Items Cleanup
- **Schedule:** Daily at 2:00 AM IST
- **Cron Expression:** `0 2 * * *`
- **What it does:**
  - Finds marketplace items listed > 90 days ago
  - Marks them as "expired"
  - Groups items by seller
  - Sends notification email to each seller
- **Notification includes:**
  - List of expired items with title, price, and listing date
  - Suggestion to update or remove listings

### 3. 🎯 Expired Goals Cleanup
- **Schedule:** Daily at 3:00 AM IST
- **Cron Expression:** `0 3 * * *`
- **What it does:**
  - Finds active goals past their target date
  - Marks them as "expired"
  - Groups goals by user
  - Sends notification email to each user
- **Notification includes:**
  - List of expired goals with target date and progress
  - Suggestion to review and update target dates

### 4. 📄 Monthly PDF Reports
- **Schedule:** 1st of every month at 10:00 AM IST
- **Cron Expression:** `0 10 1 * *`
- **What it does:**
  - Generates comprehensive PDF report for previous month
  - Includes financial summary, goals progress, marketplace stats
  - Emails PDF as attachment to each user
- **PDF Report contains:**
  - **Financial Summary:** Total income, expenses, net savings
  - **Goals Summary:** Active/completed goals, overall progress
  - **Marketplace Summary:** Listings, sales, revenue
  - **Top Income Sources:** Ranked by amount
  - **Top Expense Categories:** Ranked by amount
  - **Active Goals Details:** Individual progress for each goal

## 📁 Files Structure

```
server/src/
├── utils/
│   ├── cronJobs.js              # Main cron scheduler
│   ├── emailService.js          # Email sending functions
│   ├── resaleCleanup.js         # Expired resale items logic
│   ├── goalCleanup.js           # Expired goals logic
│   └── pdfReportGenerator.js   # PDF generation logic
├── routes/
│   └── cron.js                  # API endpoints for cron management
└── server.js                    # Cron initialization
```

## 🚀 Setup & Configuration

### 1. Environment Variables

Add these to your `.env` file:

```env
# SMTP Configuration for emails
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# JWT Secret (existing)
JWT_SECRET=your-secret-key

# MongoDB URI (existing)
MONGO_URI=your-mongodb-connection-string
```

### 2. Gmail App Password Setup

1. Go to Google Account Settings
2. Navigate to Security → 2-Step Verification
3. Scroll to "App passwords"
4. Generate new app password for "Mail"
5. Use this password in `SMTP_PASS`

### 3. Start the Server

```bash
cd server
npm install
npm run dev
```

You should see:
```
✅ API listening on http://localhost:5000
🕐 Initializing automated cron jobs...
✅ All cron jobs initialized successfully
📅 Schedules:
   - Weekly Financial Summary: Every Monday at 9 AM
   - Expired Resale Cleanup: Daily at 2 AM
   - Expired Goals Cleanup: Daily at 3 AM
   - Monthly PDF Reports: 1st of month at 10 AM
```

## 🔧 API Endpoints (Admin Only)

### Get Cron Jobs Status
```http
GET /api/cron/status
Authorization: Bearer <admin-token>
```

**Response:**
```json
{
  "success": true,
  "schedules": {
    "weeklyFinancialSummary": {
      "schedule": "Every Monday at 9 AM IST",
      "cron": "0 9 * * 1"
    }
    // ... other schedules
  },
  "statistics": {
    "expiredItems": {
      "pendingCleanup": 5,
      "alreadyExpired": 12
    },
    "expiredGoals": {
      "pendingCleanup": 3,
      "alreadyExpired": 8
    }
  }
}
```

### Manually Trigger a Job
```http
POST /api/cron/trigger/weekly-summary
Authorization: Bearer <admin-token>
```

**Valid job names:**
- `weekly-summary` - Financial health summary
- `resale-cleanup` - Expired resale items
- `goals-cleanup` - Expired goals
- `monthly-reports` - PDF reports

### Get Goals Expiring Soon
```http
GET /api/cron/goals/expiring
Authorization: Bearer <admin-token>
```

Returns goals expiring within 7 days.

### Get Expired Items Stats
```http
GET /api/cron/items/expired
Authorization: Bearer <admin-token>
```

## 📧 Email Templates

### Weekly Financial Summary
- Professional HTML design with gradient header
- Color-coded statistics (green for savings, red for losses)
- Progress bars for goal completion
- Financial tips based on performance

### Expired Items Notification
- Red theme for urgency
- List of expired items with details
- Call-to-action to update listings

### Expired Goals Notification
- Orange/amber theme
- List of expired goals with progress
- Suggestion to review and update

### Monthly PDF Report Email
- Gradient header design
- Bullet points of report contents
- PDF attachment with comprehensive data

## 🧪 Testing Cron Jobs

### Manual Testing

```javascript
// In Node.js REPL or test script
import { triggerCronJob } from './server/src/utils/cronJobs.js';

// Test weekly summary
await triggerCronJob('weekly-summary');

// Test resale cleanup
await triggerCronJob('resale-cleanup');

// Test goals cleanup
await triggerCronJob('goals-cleanup');

// Test monthly reports
await triggerCronJob('monthly-reports');
```

### Using API (Postman/cURL)

```bash
# Get admin token first (login as admin)
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123"}'

# Trigger weekly summary
curl -X POST http://localhost:5000/api/cron/trigger/weekly-summary \
  -H "Authorization: Bearer <token>"
```

## 📊 Monitoring & Logs

Cron jobs log their execution:

```
📊 Running Weekly Financial Health Summary...
📊 Weekly Summary: 45 sent, 2 failed out of 47 users
✅ Weekly Financial Health Summary completed

🧹 Running Expired Resale Items Cleanup...
🧹 Resale Cleanup: 5 items cleaned, 3 users notified
✅ Expired Resale Items Cleanup completed
```

## 🔍 Troubleshooting

### Emails Not Sending
**Problem:** SMTP errors in logs
**Solution:**
1. Verify `SMTP_USER` and `SMTP_PASS` are correct
2. Use Gmail App Password, not regular password
3. Check if "Less secure app access" is enabled (if not using 2FA)
4. Test with: `telnet smtp.gmail.com 587`

### Cron Jobs Not Running
**Problem:** Scheduled tasks not executing
**Solution:**
1. Check server timezone: `echo $TZ` (should be Asia/Kolkata)
2. Verify server is running continuously
3. Check logs for initialization messages
4. Manually trigger jobs to test functionality

### PDF Generation Fails
**Problem:** PDF reports not generating
**Solution:**
1. Ensure `reports/` directory exists or can be created
2. Check write permissions on server
3. Verify `pdfkit` package is installed
4. Check logs for specific errors

### Database Query Timeouts
**Problem:** Cleanup jobs timeout with large datasets
**Solution:**
1. Add indexes to MongoDB collections
2. Implement batching for large user bases
3. Increase MongoDB timeout settings
4. Consider running jobs during off-peak hours

## 🎯 Best Practices

1. **Monitor Email Deliverability**
   - Check spam folders initially
   - Add SPF/DKIM records for production
   - Use a dedicated transactional email service (SendGrid, SES) for production

2. **Database Performance**
   - Add indexes on `createdAt`, `targetDate`, `status` fields
   - Use `.lean()` for read-only queries
   - Implement pagination for large result sets

3. **Error Handling**
   - Jobs continue even if individual users fail
   - Errors are logged but don't stop entire process
   - Failed emails don't prevent other notifications

4. **Scalability**
   - For >1000 users, implement queue system (Bull, Agenda)
   - Use worker processes for heavy operations
   - Consider serverless crons (AWS EventBridge, Vercel Cron)

5. **Testing**
   - Test with small user base first
   - Use manual triggers before relying on schedules
   - Monitor logs for first 24-48 hours

## 🚀 Production Deployment

### Using PM2
```bash
npm install -g pm2
pm2 start server/src/server.js --name "smartgoal-api"
pm2 logs smartgoal-api
```

### Using Docker
```dockerfile
FROM node:18
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
ENV TZ=Asia/Kolkata
CMD ["node", "server/src/server.js"]
```

### Environment Variables Checklist
- [ ] `SMTP_HOST` configured
- [ ] `SMTP_PORT` configured
- [ ] `SMTP_USER` configured
- [ ] `SMTP_PASS` configured (App Password)
- [ ] `JWT_SECRET` set
- [ ] `MONGO_URI` set
- [ ] Timezone set to Asia/Kolkata

## 📈 Metrics & Analytics

Track these metrics:
- Email delivery rate
- Cleanup job efficiency (items/goals processed)
- PDF generation success rate
- Job execution time
- User engagement with emails

## 🔐 Security Considerations

1. **Admin-Only Routes:** Cron management endpoints require admin authentication
2. **Email Privacy:** Don't log email contents
3. **Rate Limiting:** Implement rate limits on manual triggers
4. **Secure Credentials:** Never commit SMTP credentials to version control
5. **Data Access:** Jobs only access user's own data

## ✅ Success Metrics

Your cron jobs are working correctly if:
- ✅ Users receive weekly summaries every Monday
- ✅ Expired items are marked and sellers notified daily
- ✅ Expired goals are archived and users notified daily
- ✅ Monthly PDF reports arrive on 1st of each month
- ✅ Logs show successful execution counts
- ✅ No critical errors in server logs

---

**🎉 Congratulations! Your automated cron jobs are now active!**

For support or questions, check the logs or use the admin API endpoints to monitor job status.
