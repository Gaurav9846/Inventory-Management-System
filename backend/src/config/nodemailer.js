// src/config/nodemailer.js
import nodemailer from "nodemailer";

// ✅ CORRECT Brevo Configuration
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,      // smtp-relay.brevo.com
  port: Number(process.env.SMTP_PORT), // 587
  secure: false,                    // ❗ MUST be false for port 587
  auth: {
    user: process.env.SMTP_USER,    // b2b9ec001@smtp-brevo.com
    pass: process.env.SMTP_PASS,    // Your Brevo SMTP key
  },
  tls: {
    rejectUnauthorized: false,      // ✅ Required for Brevo
  },
  // ✅ Add connection timeout
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 15000,
});

// ✅ Verify connection on startup
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ SMTP Connection Failed:');
    console.error('   Error:', error.message);
    console.error('   Host:', process.env.SMTP_HOST);
    console.error('   Port:', process.env.SMTP_PORT);
    console.error('   User:', process.env.SMTP_USER);
  } else {
    console.log('✅ SMTP Connection Successful - Ready to send emails!');
  }
});

export const sendEmail = async (to, subject, html) => {
  if (!to) {
    console.warn('⚠️ No recipient email provided');
    return null;
  }

  try {
    console.log(`📧 Sending email to: ${to}`);
    console.log(`   Subject: ${subject}`);
    
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to,
      subject,
      html,
    });
    
    console.log(`✅ Email sent → ${info.messageId}`);
    return info;
  } catch (err) {
    console.error("❌ Email error:", err.message);
    console.error("   Code:", err.code);
    console.error("   Command:", err.command);
    return null;
  }
};

export default transporter;