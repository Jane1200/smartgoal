// server/utils/mailer.js
import nodemailer from "nodemailer";

let transporter = null;
let _isTestTransporter = false;

export function isEmailConfigured() {
  return Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS &&
      process.env.SMTP_FROM
  );
}

export function isUsingTestTransporter() {
  return _isTestTransporter;
}

export async function getTransporter() {
  if (transporter) return transporter;

  try {
    // Prefer Resend API if configured (no SMTP required)
    if (process.env.RESEND_API_KEY) {
      // Using Resend via fetch; no transporter object needed
      transporter = { _resend: true };
      console.log("✅ Using Resend API for emails.");
      return transporter;
    }

    if (isEmailConfigured()) {
      transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: process.env.SMTP_SECURE === "true", // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
        // you can optionally add tls: { rejectUnauthorized: false } if testing with self-signed certs
      });

      // verify connection configuration (optional but useful)
      try {
        await transporter.verify();
        console.log("✅ SMTP transporter configured.");
      } catch (verifyErr) {
        console.warn("⚠️ SMTP transporter created but verification failed:", verifyErr.message || verifyErr);
      }

      return transporter;
    }

    // Fallback to Ethereal test in non-production
    if (process.env.NODE_ENV !== "production") {
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
      _isTestTransporter = true;
      console.log("✅ Using Ethereal test SMTP. Login:", testAccount.user, "Preview URLs will be logged.");
      return transporter;
    }

    // No transporter available
    console.warn("⚠️ Email not configured and not in development - no transporter created.");
    return null;
  } catch (err) {
    console.error("Failed to create mail transporter:", err);
    return null;
  }
}

/**
 * sendMail({ to, subject, text, html, from?, replyTo? })
 * Returns { ok: true, messageId, previewUrl? } or { ok: false, reason, error? }
 */
export async function sendMail({ to, subject, text, html, from, replyTo }) {
  try {
    const tx = await getTransporter();
    if (!tx) return { ok: false, reason: "Email not configured" };

    // Resend path (no SMTP)
    if (tx._resend) {
      const apiKey = process.env.RESEND_API_KEY;
      const resendFrom = from || process.env.RESEND_FROM || "onboarding@resend.dev";
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: resendFrom,
          to,
          subject,
          html: html || text || "",
          reply_to: replyTo,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        console.error("Resend API error:", data);
        return { ok: false, reason: data?.message || "Resend API failed", error: data };
      }
      return { ok: true, messageId: data?.id };
    }

    const info = await tx.sendMail({
      from: from || process.env.SMTP_FROM,
      to,
      subject,
      text,
      html,
      replyTo,
    });

    let previewUrl = null;
    if (_isTestTransporter) {
      previewUrl = nodemailer.getTestMessageUrl(info) || null;
      if (previewUrl) console.log("🔗 Email preview URL:", previewUrl);
    }

    return { ok: true, messageId: info.messageId, previewUrl };
  } catch (err) {
    console.error("sendMail error:", err);
    return { ok: false, reason: err?.message || "sendMail failed", error: err };
  }
}
