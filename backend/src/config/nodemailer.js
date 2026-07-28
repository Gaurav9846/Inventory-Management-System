// src/config/nodemailer.js
import { sendEmail as sendBrevoEmail } from './brevo.js';

/**
 * Main email sending function
 * Uses Brevo API first, falls back to SMTP if API fails
 */
export const sendEmail = async (to, subject, html) => {
  if (!to) {
    console.warn('⚠️ No recipient email provided');
    return null;
  }

  // ✅ Try Brevo API first
  console.log(`📧 Attempting to send email via Brevo API to: ${to}`);
  const result = await sendBrevoEmail(to, subject, html);
  
  if (result) {
    console.log(`✅ Email sent via Brevo API`);
    return result;
  }

  // ⚠️ Fallback to SMTP if API fails
  console.warn('⚠️ Brevo API failed, falling back to SMTP...');
  return await sendSMTPEmail(to, subject, html);
};

// ============================================================
// SMTP FALLBACK (Keep for backup)
// ============================================================

let smtpTransporter = null;

const getSMTPTransporter = async () => {
  if (!smtpTransporter) {
    try {
      const nodemailer = await import('nodemailer');
      smtpTransporter = nodemailer.default.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT),
        secure: false, // Port 587 requires secure: false
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
        tls: {
          rejectUnauthorized: false, // Required for Brevo SMTP
        },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 15000,
      });

      // ✅ Verify SMTP connection
      await new Promise((resolve, reject) => {
        smtpTransporter.verify((error, success) => {
          if (error) {
            console.error('❌ SMTP Connection Failed:', error.message);
            reject(error);
          } else {
            console.log('✅ SMTP Connection Successful (fallback ready)');
            resolve(success);
          }
        });
      });
    } catch (error) {
      console.error('❌ Failed to initialize SMTP transporter:', error.message);
      smtpTransporter = null;
    }
  }
  return smtpTransporter;
};

const sendSMTPEmail = async (to, subject, html) => {
  try {
    const transporter = await getSMTPTransporter();
    if (!transporter) {
      throw new Error('SMTP transporter not available');
    }

    console.log(`📧 Sending via SMTP fallback to: ${to}`);
    
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to,
      subject,
      html,
    });

    console.log(`✅ SMTP email sent → ${info.messageId}`);
    return { messageId: info.messageId, success: true };
  } catch (error) {
    console.error('❌ SMTP fallback failed:', error.message);
    return null;
  }
};

// ============================================================
// TEST FUNCTION - Verify email configuration
// ============================================================

export const verifyEmailConfig = async () => {
  const results = {
    brevo: { configured: false, working: false },
    smtp: { configured: false, working: false },
    from: process.env.EMAIL_FROM || 'Not set',
  };

  // Check Brevo
  if (process.env.BREVO_API_KEY) {
    results.brevo.configured = true;
    try {
      const testResult = await sendBrevoEmail(
        process.env.EMAIL_FROM || 'test@example.com',
        'Brevo API Test',
        '<h1>Brevo API Test</h1><p>If you see this, Brevo API is working!</p>'
      );
      results.brevo.working = !!testResult;
    } catch (error) {
      results.brevo.working = false;
      results.brevo.error = error.message;
    }
  }

  // Check SMTP
  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    results.smtp.configured = true;
    try {
      const transporter = await getSMTPTransporter();
      results.smtp.working = !!transporter;
    } catch (error) {
      results.smtp.working = false;
      results.smtp.error = error.message;
    }
  }

  return results;
};

export default { sendEmail, verifyEmailConfig };