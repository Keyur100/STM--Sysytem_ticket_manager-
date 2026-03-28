const nodemailer = require('nodemailer');

const {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASS,
  FROM_EMAIL,
  FRONTEND_URL,
} = process.env;

let transporter;
function getTransporter() {
  if (transporter) return transporter;
  transporter = nodemailer.createTransport({
    host: SMTP_HOST || 'smtp.example.com',
    port: Number(SMTP_PORT || 587),
    secure: Number(SMTP_PORT || 587) === 465, // true for 465
    auth: SMTP_USER
      ? {
          user: SMTP_USER,
          pass: SMTP_PASS,
        }
      : undefined,
  });
  return transporter;
}

async function sendMail({ to, subject, text, html, from }) {
  const t = getTransporter();
  const fromAddr = from || FROM_EMAIL || `no-reply@${process.env.APP_DOMAIN || 'example.com'}`;
  const info = await t.sendMail({ from: fromAddr, to, subject, text, html });
  return info;
}

async function sendPasswordResetEmail({ to, token }) {
  const base = FRONTEND_URL || process.env.APP_URL || 'http://localhost:3000';
  const resetUrl = `${base.replace(/\/$/, '')}/auth/reset-password?token=${token}`;
  const subject = 'Password reset request';
  const html = `
    <p>We received a request to reset your password.</p>
    <p>Click the link below to reset your password. This link will expire in 1 hour.</p>
    <p><a href="${resetUrl}">Reset your password</a></p>
    <p>If you didn't request this, please ignore this email.</p>
  `;
  return sendMail({ to, subject, html, text: `Reset your password: ${resetUrl}` });
}

/**
 * Send 90% subscription usage reminder email
 */
async function sendSubscriptionReminderEmail({ to, companyName, subscriptionEndDate, planName }) {
  const subject = 'Subscription Usage Reminder – 90% Threshold Reached';
  const html = `
    <h2>Subscription Usage Reminder</h2>
    <p>Hi ${companyName || 'Valued Customer'},</p>
    <p>Your subscription for the <strong>${planName || 'Pro Plan'}</strong> has reached <strong>90%</strong> of its usage cycle.</p>
    <p><strong>Subscription End Date:</strong> ${subscriptionEndDate || 'N/A'}</p>
    <p>To ensure uninterrupted service, please consider renewing or upgrading your subscription.</p>
    <p>
      <a href="${FRONTEND_URL || 'http://localhost:3000'}/companies" 
         style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">
        Manage Subscription
      </a>
    </p>
    <p>If you have any questions, please contact our support team.</p>
    <p>Best regards,<br/>The Team</p>
  `;
  const text = `Your ${planName || 'Pro Plan'} subscription has reached 90% of its usage cycle. Subscription End Date: ${subscriptionEndDate || 'N/A'}. Please consider renewing or upgrading.`;
  return sendMail({ to, subject, html, text });
}

/**
 * Send subscription expiry notification email
 */
async function sendSubscriptionExpiryEmail({ to, companyName, planName, expiryDate }) {
  const subject = 'Subscription Expired – Please Renew';
  const html = `
    <h2>Your Subscription Has Expired</h2>
    <p>Hi ${companyName || 'Valued Customer'},</p>
    <p>Your subscription for the <strong>${planName || 'Pro Plan'}</strong> has expired as of <strong>${expiryDate || 'today'}</strong>.</p>
    <p>To continue using our services without interruption, please renew your subscription immediately.</p>
    <p>
      <a href="${FRONTEND_URL || 'http://localhost:3000'}/companies" 
         style="display: inline-block; padding: 10px 20px; background-color: #dc3545; color: white; text-decoration: none; border-radius: 5px;">
        Renew Subscription Now
      </a>
    </p>
    <p>Your account access may be restricted if not renewed soon.</p>
    <p>Questions? Contact our support team.</p>
    <p>Best regards,<br/>The Team</p>
  `;
  const text = `Your ${planName || 'Pro Plan'} subscription has expired. Please renew your subscription immediately to continue using our services.`;
  return sendMail({ to, subject, html, text });
}

module.exports = {
  sendMail,
  sendPasswordResetEmail,
  sendSubscriptionReminderEmail,
  sendSubscriptionExpiryEmail,
};
