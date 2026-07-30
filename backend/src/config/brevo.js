// src/config/brevo.js
import { BrevoClient } from '@getbrevo/brevo';

// Initialize Brevo API client
const client = new BrevoClient({
  apiKey: process.env.BREVO_API_KEY,
});

export const sendEmail = async (to, subject, html) => {
  if (!to) {
    console.warn('⚠️ No recipient email provided');
    return null;
  }

  try {
    console.log(`📧 Sending email via Brevo API to: ${to}`);
    console.log(`   Subject: ${subject}`);

    const data = await client.transactionalEmails.sendTransacEmail({
      subject,
      htmlContent: html,
      sender: { 
        name: 'Fusion IMS', 
        email: process.env.EMAIL_FROM_EMAIL || 'gurunggaurav1611@gmail.com' 
      },
      to: [{ email: to }],
    });
    
    console.log(`✅ Email sent → ${data.messageId}`);
    return { messageId: data.messageId, success: true };
  } catch (error) {
    console.error('❌ Brevo API error:', error.message);
    return null;
  }
};

export const verifyEmailConfig = async () => {
  return {
    brevo: {
      configured: !!process.env.BREVO_API_KEY,
      fromEmail: process.env.EMAIL_FROM_EMAIL || 'gurunggaurav1611@gmail.com'
    },
    from: process.env.EMAIL_FROM || 'Fusion IMS <gurunggaurav1611@gmail.com>',
  };
};

export default { sendEmail, verifyEmailConfig };