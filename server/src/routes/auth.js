import { Router } from "express";
import { body, validationResult } from "express-validator";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import User from "../models/User.js";
import admin from "../firebaseAdmin.js";
import { isEmailConfigured, isUsingTestTransporter, getTransporter, sendMail } from "../utils/mailer.js";
import { buildAuthPayload, buildUserResponse, ensureUserRoleArray } from "../utils/roles.js";

const router = Router();

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";

// helper: sign a short-lived verification token for email links
function signVerificationToken(userId, expiresIn = "24h") {
  return jwt.sign({ uid: String(userId) }, JWT_SECRET, { expiresIn });
}

// helper: verify a token and return payload or null
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (e) {
    return null;
  }
}

/**
 * POST /auth/register
 * - Creates user with isVerified: false
 * - Sends verification email (if mailer available)
 * - Returns token + user (includes isVerified flag)
 */
router.post(
  "/register",
  [
    body("name").isString().isLength({ min: 2 }),
    body("email").isEmail(),
    body("password").isLength({ min: 6 }),
    body("role").optional().isIn(["goal_setter", "buyer"]),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: "Invalid data", errors: errors.array() });

    const { name, email, password, role = "goal_setter" } = req.body;
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: "Email already registered" });

    const passwordHash = await bcrypt.hash(password, 10);

    // create user as NOT verified — we will email a verification link
    const user = await User.create({
      name,
      email,
      passwordHash,
      role: role || "goal_setter",
      roles: role ? [role] : undefined,
      provider: "local",
      isVerified: false,
    });

    await ensureUserRoleArray(user);

    const authPayload = buildAuthPayload(user);
    const token = jwt.sign(authPayload, JWT_SECRET, { expiresIn: "7d" });

    const responseUser = buildUserResponse(user);

    // send verification email (attempt; falls back to Ethereal in dev)
    try {
      const vtoken = signVerificationToken(user._id, "48h");
      const verifyUrl = `${FRONTEND_URL}/verify-email?token=${encodeURIComponent(vtoken)}`;
      const result = await sendMail({
        to: user.email,
        subject: "Verify your SmartGoal account",
        html: `
          <p>Hello ${user.name},</p>
          <p>Thanks for creating an account. Click the link below to verify your email address:</p>
          <p><a href="${verifyUrl}">Verify my email</a></p>
          <p>If you didn't create this account, you can ignore this message.</p>
        `,
      });
      if (!result.ok) console.warn("Verification email not sent:", result.reason);
    } catch (e) {
      console.error("Failed to send verification email:", e);
      // Not fatal — user can request a resend later
    }

    return res.json({
      token,
      user: responseUser,
    });
  }
);

/**
 * POST /auth/login
 * - Basic credential check
 * - For admin: Returns token immediately
 * - For non-admin: Sends OTP and requires verification
 */
router.post(
  "/login",
  [body("email").isEmail(), body("password").isString().isLength({ min: 6 })],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log("Login validation errors:", errors.array());
      return res.status(400).json({ message: "Invalid credentials", details: errors.array() });
    }

    const { email, password, role } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    // if user was created via google and has no password, block password login
    if (!user.passwordHash) {
      return res.status(400).json({ message: "Please sign in with Google or set a password for this account" });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(400).json({ message: "Invalid credentials" });

    // Validate role match only if a role was explicitly provided by client
    if (role) {
      const userRoles = user.roles || [user.role];
      if (!userRoles.includes(role)) {
        const primaryRole = user.role || userRoles[0];
        return res.status(403).json({
          message: `Invalid role. This account does not have the ${role} role. Available roles: ${userRoles.join(', ')}`,
        });
      }
    }

    await ensureUserRoleArray(user);

    // Check if user is admin - admins skip OTP verification
    const userRoles = user.roles || [user.role];
    const isAdmin = userRoles.includes('admin');

    if (isAdmin) {
      // Admin users get immediate access without OTP
      const authPayload = buildAuthPayload(user);
      const token = jwt.sign(authPayload, JWT_SECRET, { expiresIn: "7d" });
      const responseUser = buildUserResponse(user);
      return res.json({ token, user: responseUser });
    }

    // Non-admin users: Generate and send OTP
    try {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      user.loginOTP = otp;
      user.loginOTPExpires = otpExpires;
      user.loginOTPAttempts = 0;
      await user.save();

      const result = await sendMail({
        to: user.email,
        subject: "Your SmartGoal Login OTP",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #0d6efd;">SmartGoal Login Verification</h2>
            <p>Hello ${user.name},</p>
            <p>Your One-Time Password (OTP) for login is:</p>
            <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
              <h1 style="color: #0d6efd; font-size: 36px; letter-spacing: 8px; margin: 0;">${otp}</h1>
            </div>
            <p><strong>This OTP will expire in 10 minutes.</strong></p>
            <p>If you didn't request this login, please ignore this email and ensure your account is secure.</p>
            <hr style="border: none; border-top: 1px solid #dee2e6; margin: 30px 0;">
            <p style="color: #6c757d; font-size: 12px;">This is an automated message from SmartGoal. Please do not reply to this email.</p>
          </div>
        `,
      });

      if (!result.ok) {
        console.warn("Login OTP email not sent:", result.reason);
      }

      return res.json({
        requiresOTP: true,
        message: "OTP has been sent to your email. Please verify to continue.",
        email: user.email,
        previewUrl: result.previewUrl // For development
      });
    } catch (e) {
      console.error("Login OTP generation error:", e);
      return res.status(500).json({ message: "Failed to send OTP. Please try again." });
    }
  }
);

/**
 * GET /auth/verify
 * - Accepts a verification token (query param `token`) and marks the user verified
 * - Use this URL in verification emails to point to the frontend, which can then call this endpoint (or you can point the email directly here)
 */
router.get("/verify", async (req, res) => {
  const token = req.query.token;
  if (!token) return res.status(400).send("Missing token");

  const payload = verifyToken(token);
  if (!payload || !payload.uid) return res.status(400).send("Invalid or expired token");

  const userId = payload.uid;
  const user = await User.findById(userId);
  if (!user) return res.status(404).send("User not found");

  if (user.isVerified) return res.send("Account already verified");

  user.isVerified = true;
  await user.save();

  // You may want to redirect back to frontend with a message
  const redirectUrl = `${FRONTEND_URL}/login?verified=1`;
  return res.redirect(302, redirectUrl);
});

/**
 * POST /auth/verify/resend
 * - Accepts { email }
 * - If user exists and is not verified, sends a new verification email
 * - Always returns 200 to avoid email enumeration
 */
router.post("/verify/resend", [body("email").isEmail()], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      // still return 200 to avoid enumeration
      return res.json({ ok: true, message: "If the email exists, a verification link has been sent" });
    }

    const { email } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.json({ ok: true, message: "If the email exists, a verification link has been sent" });
    }

    if (user.isVerified) {
      return res.json({ ok: true, alreadyVerified: true, message: "Account already verified" });
    }

    try {
      const vtoken = signVerificationToken(user._id, "48h");
      const verifyUrl = `${FRONTEND_URL}/verify-email?token=${encodeURIComponent(vtoken)}`;
      const result = await sendMail({
        to: user.email,
        subject: "Verify your SmartGoal account",
        html: `
          <p>Hello ${user.name || "there"},</p>
          <p>Click the link below to verify your email address:</p>
          <p><a href="${verifyUrl}">Verify my email</a></p>
        `,
      });
      if (!result.ok) {
        console.warn("Resend verification email not sent:", result.reason);
      }
    } catch (e) {
      console.error("Failed to resend verification email:", e);
      // do not leak errors
    }

    return res.json({ ok: true, message: "If the email exists, a verification link has been sent" });
  } catch (e) {
    console.error("/auth/verify/resend error", e);
    return res.json({ ok: true, message: "If the email exists, a verification link has been sent" });
  }
});

/**
 * POST /auth/create-admin
 * unchanged semantics — still creates a verified admin
 */
router.post(
  "/create-admin",
  [
    body("name").isString().isLength({ min: 2 }),
    body("email").isEmail(),
    body("password").isLength({ min: 6 }),
    body("adminKey").equals(process.env.ADMIN_CREATION_KEY || "admin123"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: "Invalid data", errors: errors.array() });

    const { name, email, password, adminKey } = req.body;

    // Check if admin already exists
    const existingAdmin = await User.findOne({ roles: "admin" });
    if (existingAdmin) {
      return res.status(400).json({ message: "Admin user already exists. Only one admin is allowed." });
    }

    // Check if email is already registered
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      passwordHash,
      role: "admin",
      roles: ["admin"],
      provider: "local",
      isVerified: true,
    });

    await ensureUserRoleArray(user);

    const authPayload = buildAuthPayload(user);
    const token = jwt.sign(authPayload, JWT_SECRET, { expiresIn: "7d" });
    const responseUser = buildUserResponse(user);

    return res.json({
      message: "Admin user created successfully",
      token,
      user: responseUser,
    });
  }
);

/**
 * POST /auth/google
 * - Verifies Google idToken with Firebase Admin
 * - Creates or finds local user record
 * - Returns app JWT + user (no OTP required)
 */
router.post("/google", async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) return res.status(400).json({ message: "Missing idToken" });

    const decoded = await admin.auth().verifyIdToken(idToken);
    const { uid, email, name, picture, email_verified } = decoded;
    if (!email) return res.status(400).json({ message: "No email in Google token" });

    let user = await User.findOne({ email });
    if (!user) {
      // create user: passwordHash null indicates passwordless account (Google)
      user = await User.create({
        name: name || email.split("@")[0],
        email,
        passwordHash: null,
        role: "goal_setter",
        roles: ["goal_setter"],
        isVerified: !!email_verified,
        provider: "google",
        firebaseUid: uid,
        avatar: picture,
      });
    } else {
      // If user exists, update firebaseUid and verified flag if necessary
      let changed = false;
      if (!user.firebaseUid && uid) {
        user.firebaseUid = uid;
        changed = true;
      }
      if (email_verified && !user.isVerified) {
        user.isVerified = true;
        changed = true;
      }
      if (changed) await user.save();
    }

    await ensureUserRoleArray(user);

    // Google sign-in: Direct login for all users (no OTP)
    const authPayload = buildAuthPayload(user);
    const token = jwt.sign(authPayload, JWT_SECRET, { expiresIn: "7d" });
    const responseUser = buildUserResponse(user);
    return res.json({ token, user: responseUser });
  } catch (e) {
    console.error("/auth/google error", e);
    return res.status(400).json({ message: e?.message || "Google auth failed" });
  }
});

export default router;

// --- OTP Login Flow ---
/**
 * POST /auth/login-otp
 * - Request OTP for email login
 * - Sends 6-digit OTP to user's email
 * - OTP valid for 10 minutes
 */
router.post(
  "/login-otp",
  [body("email").isEmail()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: "Invalid email" });
    }

    const { email } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() });
    
    // Always respond with success to prevent email enumeration
    if (!user) {
      return res.json({ 
        message: "If the email exists, an OTP has been sent to your email",
        ok: true 
      });
    }

    try {
      // Generate 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Save OTP to user record
      user.loginOTP = otp;
      user.loginOTPExpires = otpExpires;
      user.loginOTPAttempts = 0; // Reset attempts
      await user.save();

      // Send OTP via email
      const result = await sendMail({
        to: user.email,
        subject: "Your SmartGoal Login OTP",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #0d6efd;">SmartGoal Login Verification</h2>
            <p>Hello ${user.name},</p>
            <p>Your One-Time Password (OTP) for login is:</p>
            <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
              <h1 style="color: #0d6efd; font-size: 36px; letter-spacing: 8px; margin: 0;">${otp}</h1>
            </div>
            <p><strong>This OTP will expire in 10 minutes.</strong></p>
            <p>If you didn't request this OTP, please ignore this email and ensure your account is secure.</p>
            <hr style="border: none; border-top: 1px solid #dee2e6; margin: 30px 0;">
            <p style="color: #6c757d; font-size: 12px;">This is an automated message from SmartGoal. Please do not reply to this email.</p>
          </div>
        `,
      });

      if (!result.ok) {
        console.warn("OTP email not sent:", result.reason);
        return res.status(500).json({ 
          message: "Failed to send OTP. Please try again.",
          ok: false 
        });
      }

      return res.json({ 
        message: "OTP has been sent to your email",
        ok: true,
        previewUrl: result.previewUrl // For development/testing
      });
    } catch (e) {
      console.error("login-otp error:", e);
      return res.status(500).json({ 
        message: "Failed to send OTP. Please try again.",
        ok: false 
      });
    }
  }
);

/**
 * POST /auth/verify-otp
 * - Verify OTP and complete login
 * - Returns JWT token and user data
 */
router.post(
  "/verify-otp",
  [
    body("email").isEmail(),
    body("otp").isString().isLength({ min: 6, max: 6 })
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: "Invalid email or OTP format",
        errors: errors.array() 
      });
    }

    const { email, otp } = req.body;
    
    try {
      const user = await User.findOne({ email: email.toLowerCase() });
      
      if (!user) {
        return res.status(400).json({ message: "Invalid credentials" });
      }

      // Check if OTP exists
      if (!user.loginOTP || !user.loginOTPExpires) {
        return res.status(400).json({ 
          message: "No OTP found. Please request a new OTP." 
        });
      }

      // Check if OTP has expired
      if (new Date() > user.loginOTPExpires) {
        user.loginOTP = undefined;
        user.loginOTPExpires = undefined;
        user.loginOTPAttempts = 0;
        await user.save();
        return res.status(400).json({ 
          message: "OTP has expired. Please request a new OTP." 
        });
      }

      // Check attempt limit (max 5 attempts)
      if (user.loginOTPAttempts >= 5) {
        user.loginOTP = undefined;
        user.loginOTPExpires = undefined;
        user.loginOTPAttempts = 0;
        await user.save();
        return res.status(429).json({ 
          message: "Too many failed attempts. Please request a new OTP." 
        });
      }

      // Verify OTP
      if (user.loginOTP !== otp) {
        user.loginOTPAttempts += 1;
        await user.save();
        return res.status(400).json({ 
          message: `Invalid OTP. ${5 - user.loginOTPAttempts} attempts remaining.` 
        });
      }

      // OTP is valid - clear OTP data and log user in
      user.loginOTP = undefined;
      user.loginOTPExpires = undefined;
      user.loginOTPAttempts = 0;
      user.isVerified = true; // Mark as verified since they accessed their email
      await user.save();

      // Ensure user has roles array
      await ensureUserRoleArray(user);

      // Generate JWT token
      const authPayload = buildAuthPayload(user);
      const token = jwt.sign(authPayload, JWT_SECRET, { expiresIn: "7d" });
      const responseUser = buildUserResponse(user);

      return res.json({ 
        message: "Login successful",
        token, 
        user: responseUser 
      });
    } catch (e) {
      console.error("verify-otp error:", e);
      return res.status(500).json({ 
        message: "Failed to verify OTP. Please try again." 
      });
    }
  }
);

// --- Password Reset Flow ---
// Request reset link
router.post(
  "/forgot-password",
  [body("email").isEmail()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: "Invalid email" });

    const { email } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() });
    // Always respond 200 to avoid email enumeration
    if (!user) return res.json({ message: "If the email exists, a reset link has been sent" });

    try {
      const token = crypto.randomBytes(32).toString("hex");
      const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      user.resetPasswordToken = token;
      user.resetPasswordExpires = expires;
      await user.save();

      const resetUrl = `${FRONTEND_URL}/reset?token=${encodeURIComponent(token)}`;

      const result = await sendMail({
        to: user.email,
        subject: "Reset your SmartGoal password",
        html: `
          <p>Hello ${user.name || "there"},</p>
          <p>We received a request to reset your password. Click the link below to set a new password. This link expires in 1 hour.</p>
          <p><a href="${resetUrl}">Reset my password</a></p>
          <p>If you didn't request this, you can safely ignore this email.</p>
        `,
      });
      if (!result.ok) console.warn("Password reset email not sent:", result.reason);

      return res.json({ message: "If the email exists, a reset link has been sent", previewUrl: result.previewUrl });
    } catch (e) {
      console.error("forgot-password error", e);
      return res.status(500).json({ message: "Failed to initiate password reset" });
    }
  }
);

// Verify reset token
router.get("/reset-password/verify", async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).json({ ok: false, message: "Missing token" });
    const user = await User.findOne({ resetPasswordToken: token, resetPasswordExpires: { $gt: new Date() } });
    if (!user) return res.status(400).json({ ok: false, message: "Invalid or expired token" });
    return res.json({ ok: true });
  } catch (e) {
    console.error("verify reset token error", e);
    return res.status(500).json({ ok: false, message: "Server error" });
  }
});

// Reset password
router.post(
  "/reset-password",
  [body("token").isString().isLength({ min: 10 }), body("password").isString().isLength({ min: 6 })],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: "Invalid data" });

    const { token, password } = req.body;
    try {
      const user = await User.findOne({ resetPasswordToken: token, resetPasswordExpires: { $gt: new Date() } });
      if (!user) return res.status(400).json({ message: "Invalid or expired token" });

      // Ensure passwordHash field exists and update it
      user.passwordHash = await bcrypt.hash(password, 10);
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      user.isVerified = true; // Mark as verified since they accessed their email
      user.provider = "local"; // Ensure provider is set to local
      await user.save();

      return res.json({ 
        message: "Password reset successful",
        email: user.email // Return email for auto-login
      });
    } catch (e) {
      console.error("reset-password error", e);
      return res.status(500).json({ message: "Failed to reset password" });
    }
  }
);

// SMTP diagnostics (GET /api/auth/email-diagnostics)
router.get("/email-diagnostics", async (_req, res) => {
  try {
    const configured = isEmailConfigured();
    const tx = await getTransporter();
    const usingTest = isUsingTestTransporter();
    const summary = {
      configured,
      usingTestTransporter: usingTest,
      env: {
        HOST: process.env.SMTP_HOST || null,
        PORT: process.env.SMTP_PORT || null,
        SECURE: process.env.SMTP_SECURE || null,
        FROM: process.env.SMTP_FROM || null,
      },
    };
    if (!tx) return res.status(500).json({ ok: false, ...summary, message: "No transporter available" });

    // try a noop email to the FROM address just to verify send
    try {
      const to = process.env.SMTP_FROM?.match(/<(.+?)>/)?.[1] || process.env.SMTP_FROM;
      const info = await tx.sendMail({
        from: process.env.SMTP_FROM,
        to,
        subject: "SmartGoal SMTP Diagnostic",
        text: "This is a diagnostic email to confirm SMTP send works.",
      });
      return res.json({ ok: true, ...summary, messageId: info.messageId });
    } catch (sendErr) {
      console.error("SMTP diagnostic send failed:", sendErr);
      return res.status(500).json({ ok: false, ...summary, error: sendErr?.message || String(sendErr) });
    }
  } catch (e) {
    return res.status(500).json({ ok: false, message: e?.message || "Diagnostics failed" });
  }
});
