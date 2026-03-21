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

module.exports = {
  sendMail,
  sendPasswordResetEmail,
};
