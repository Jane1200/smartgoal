# OTP Login Feature - Implementation Guide

## Overview
A secure email-based One-Time Password (OTP) login system has been added to SmartGoal. Users can now login using a 6-digit code sent to their email instead of using a password.

## Features

### ✅ Backend Implementation
- **Two new API endpoints**:
  - `POST /api/auth/login-otp` - Request OTP
  - `POST /api/auth/verify-otp` - Verify OTP and login

### ✅ Security Features
- 6-digit random OTP generation
- 10-minute expiration time
- Maximum 5 verification attempts per OTP
- OTP is cleared after successful login
- Email enumeration protection
- Automatic account verification on successful OTP login

### ✅ Frontend Implementation
- New OTP Login page at `/login-otp`
- Two-step process:
  1. Enter email to receive OTP
  2. Enter OTP to complete login
- Real-time countdown timer
- Resend OTP functionality (after 1 minute)
- Easy navigation between password and OTP login

## How to Use

### For Users

#### Step 1: Navigate to OTP Login
1. Go to the login page
2. Click on "Login with OTP" link
3. Or directly visit: `http://localhost:5173/login-otp`

#### Step 2: Request OTP
1. Enter your registered email address
2. Click "Send OTP"
3. Check your email inbox for the OTP code

#### Step 3: Verify OTP
1. Enter the 6-digit OTP from your email
2. Click "Verify & Login"
3. You'll be automatically logged in and redirected to your dashboard

### For Developers

#### API Endpoints

##### 1. Request OTP
```bash
POST /api/auth/login-otp
Content-Type: application/json

{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "ok": true,
  "message": "OTP has been sent to your email",
  "previewUrl": "https://ethereal.email/..." // Only in development
}
```

##### 2. Verify OTP
```bash
POST /api/auth/verify-otp
Content-Type: application/json

{
  "email": "user@example.com",
  "otp": "123456"
}
```

**Success Response:**
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "...",
    "name": "John Doe",
    "email": "user@example.com",
    "role": "goal_setter",
    "roles": ["goal_setter"],
    "isVerified": true
  }
}
```

**Error Responses:**
- `400` - Invalid OTP or expired
- `429` - Too many failed attempts
- `500` - Server error

## Database Changes

### User Model Updates
Added three new fields to the User schema:

```javascript
{
  loginOTP: String,           // Stores the current OTP
  loginOTPExpires: Date,      // Expiration timestamp
  loginOTPAttempts: Number    // Failed attempt counter
}
```

## Email Template

The OTP email includes:
- Personalized greeting with user's name
- Large, centered 6-digit OTP code
- Expiration time (10 minutes)
- Security notice
- Professional styling with SmartGoal branding

## Configuration

### Email Settings
Make sure your email configuration is set up in the server `.env` file:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM="SmartGoal <noreply@smartgoal.com>"
```

### JWT Secret
Ensure JWT_SECRET is configured:
```env
JWT_SECRET=your-secret-key-here
```

## Testing

### Development Testing
1. Start the backend server: `cd server && npm run dev`
2. Start the frontend: `cd client && npm run dev`
3. Navigate to `http://localhost:5173/login-otp`
4. Enter a test email
5. Check console logs for the Ethereal email preview URL
6. Click the preview URL to see the OTP
7. Enter the OTP to complete login

### Production Testing
1. Use a real email account
2. Check your email inbox for the OTP
3. Enter the OTP within 10 minutes
4. Verify successful login

## Security Considerations

### ✅ Implemented
- OTP expiration (10 minutes)
- Rate limiting (5 attempts per OTP)
- Secure random OTP generation
- Email enumeration protection
- HTTPS recommended for production
- OTP cleared after use or expiration

### 📝 Recommendations
- Enable rate limiting on the request endpoint (e.g., max 3 OTP requests per hour per email)
- Consider implementing CAPTCHA for OTP requests
- Monitor for suspicious patterns
- Log OTP requests for security auditing
- Use environment-specific SMTP settings

## Troubleshooting

### OTP Not Received
1. Check spam/junk folder
2. Verify SMTP configuration in `.env`
3. Check server logs for email sending errors
4. Test email diagnostics: `GET /api/auth/email-diagnostics`

### OTP Expired
- Request a new OTP
- OTPs are valid for 10 minutes only

### Too Many Attempts
- Wait for the OTP to expire
- Request a new OTP
- Maximum 5 attempts per OTP

### Email Enumeration Concerns
- The API always returns success for OTP requests
- Actual OTP is only sent to registered emails
- This prevents attackers from discovering registered emails

## File Changes Summary

### Backend Files Modified/Created
1. `server/src/models/User.js` - Added OTP fields
2. `server/src/routes/auth.js` - Added OTP endpoints

### Frontend Files Modified/Created
1. `client/src/pages/auth/LoginOTP.jsx` - New OTP login page
2. `client/src/pages/auth/Login.jsx` - Added OTP login link
3. `client/src/App.jsx` - Added OTP route

## Benefits

✅ **Enhanced Security**: No password storage concerns  
✅ **Better UX**: Faster login for users who forget passwords  
✅ **Email Verification**: Automatically verifies email ownership  
✅ **Reduced Support**: Fewer password reset requests  
✅ **Modern Authentication**: Industry-standard OTP flow  

## Future Enhancements

Potential improvements for future versions:
- [ ] SMS OTP option
- [ ] Remember device functionality
- [ ] Biometric authentication
- [ ] OAuth integration
- [ ] Multi-factor authentication (MFA)
- [ ] OTP request rate limiting
- [ ] Account lockout after multiple failed attempts

---

**Note**: This implementation does not modify your existing password-based login. Both login methods work independently and users can choose their preferred method.
