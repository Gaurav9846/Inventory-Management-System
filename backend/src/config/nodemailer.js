// src/config/nodemailer.js
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST,
  port:   Number(process.env.SMTP_PORT),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * Send an email (non-fatal – won't crash the main flow on failure).
 * @param {string} to
 * @param {string} subject
 * @param {string} html
 */
export const sendEmail = async (to, subject, html) => {
  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to,
      subject,
      html,
    });
    console.log(`📧  Email sent → ${info.messageId}`);
    return info;
  } catch (err) {
    console.error("❌  Email error:", err.message);
  }
};

export default transporter;
