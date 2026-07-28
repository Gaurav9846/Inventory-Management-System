// src/config/nodemailer.js
import nodemailer from 'nodemailer';

// ✅ Brevo SMTP Configuration (No domain needed)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: false, // Port 587 requires secure: false
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: {
    rejectUnauthorized: false,
  },
});

export const sendEmail = async (to, subject, html) => {
  if (!to) {
    console.warn('⚠️ No recipient email provided');
    return null;
  }

  try {
    console.log(`📧 Sending email via Brevo SMTP to: ${to}`);
    console.log(`   Subject: ${subject}`);

    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to,
      subject,
      html,
    });

    console.log(`✅ Email sent → ${info.messageId}`);
    return { messageId: info.messageId, success: true };
  } catch (error) {
    console.error('❌ Email error:', error.message);
    return null;
  }
};

export const verifyEmailConfig = async () => {
  return {
    smtp: {
      configured: !!process.env.SMTP_HOST,
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      user: process.env.SMTP_USER,
    },
    from: process.env.EMAIL_FROM || 'Not set',
  };
};

export default { sendEmail, verifyEmailConfig };