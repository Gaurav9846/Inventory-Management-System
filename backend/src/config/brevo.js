// src/config/brevo.js
import * as brevo from '@getbrevo/brevo';

// ✅ Initialize Brevo API
const apiInstance = new brevo.TransactionalEmailsApi();

// Set API Key
const apiKey = apiInstance.authentications['apiKey'];
apiKey.apiKey = process.env.BREVO_API_KEY;

// Sender configuration
const sender = {
  email: process.env.EMAIL_FROM || 'noreply@example.com',
  name: 'Fusion IMS'
};

/**
 * Send email using Brevo API
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} htmlContent - HTML content of the email
 * @param {string} textContent - Plain text content (optional)
 * @returns {Promise<{messageId: string, success: boolean} | null>}
 */
export const sendEmail = async (to, subject, htmlContent, textContent = null) => {
  if (!to) {
    console.warn('⚠️ No recipient email provided');
    return null;
  }

  if (!process.env.BREVO_API_KEY) {
    console.error('❌ BREVO_API_KEY is not set in environment variables');
    return null;
  }

  try {
    console.log(`📧 Sending email via Brevo API to: ${to}`);
    console.log(`   Subject: ${subject}`);
    console.log(`   From: ${sender.email}`);

    const sendSmtpEmail = new brevo.SendSmtpEmail();
    sendSmtpEmail.subject = subject;
    sendSmtpEmail.htmlContent = htmlContent;
    sendSmtpEmail.sender = sender;
    sendSmtpEmail.to = [{ email: to }];

    if (textContent) {
      sendSmtpEmail.textContent = textContent;
    }

    const response = await apiInstance.sendTransacEmail(sendSmtpEmail);
    
    console.log(`✅ Email sent via Brevo API → ${response.messageId}`);
    return { 
      messageId: response.messageId,
      success: true 
    };
  } catch (error) {
    console.error("❌ Brevo API error:", error.message);
    
    // Log detailed error if available
    if (error.response) {
      console.error("   Status:", error.response.status);
      console.error("   Response:", JSON.stringify(error.response.body, null, 2));
    }
    
    // Common error codes
    if (error.code === 'ENOTFOUND') {
      console.error('   💡 DNS lookup failed. Check internet connection.');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('   💡 Connection refused. Check API endpoint.');
    } else if (error.response?.status === 401) {
      console.error('   💡 Invalid API key. Check BREVO_API_KEY.');
    } else if (error.response?.status === 429) {
      console.error('   💡 Rate limit exceeded. Try again later.');
    } else if (error.response?.status === 400) {
      console.error('   💡 Invalid request. Check email format.');
    }

    return null;
  }
};

/**
 * Test Brevo API connection
 * @param {string} testEmail - Email to send test to
 * @returns {Promise<{success: boolean, message: string}>}
 */
export const testBrevoConnection = async (testEmail = null) => {
  if (!process.env.BREVO_API_KEY) {
    return { 
      success: false, 
      message: 'BREVO_API_KEY is not set in environment variables' 
    };
  }

  if (!testEmail) {
    testEmail = process.env.EMAIL_FROM;
  }

  if (!testEmail) {
    return { 
      success: false, 
      message: 'No test email provided and EMAIL_FROM is not set' 
    };
  }

  try {
    const result = await sendEmail(
      testEmail,
      '✅ Brevo API Test - Connection Successful',
      `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Brevo API Test</title>
          <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background: #f5f7fa; }
            .container { background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #4F46E5, #7C3AED); padding: 30px 20px; text-align: center; }
            .header h1 { color: white; margin: 0; font-size: 24px; }
            .content { padding: 30px; }
            .success-box { background: #dcfce7; padding: 20px; border-radius: 8px; border-left: 4px solid #22c55e; margin: 15px 0; }
            .success-box h2 { color: #166534; margin: 0 0 8px 0; }
            .success-box p { color: #14532d; margin: 0; }
            .details { background: #f8fafc; padding: 15px; border-radius: 8px; margin: 15px 0; border: 1px solid #e2e8f0; }
            .details td { padding: 6px 0; }
            .details td:first-child { font-weight: 600; color: #64748b; }
            .footer { text-align: center; padding: 20px; border-top: 1px solid #e2e8f0; color: #94a3b8; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✅ Brevo API Test</h1>
            </div>
            <div class="content">
              <div class="success-box">
                <h2>Connection Successful!</h2>
                <p>Your Brevo API configuration is working correctly.</p>
              </div>
              <div class="details">
                <table>
                  <tr><td>API Key</td><td>${process.env.BREVO_API_KEY.slice(0, 10)}...${process.env.BREVO_API_KEY.slice(-4)}</td></tr>
                  <tr><td>From Email</td><td>${process.env.EMAIL_FROM}</td></tr>
                  <tr><td>Sent To</td><td>${testEmail}</td></tr>
                  <tr><td>Timestamp</td><td>${new Date().toISOString()}</td></tr>
                </table>
              </div>
              <p style="color: #64748b; text-align: center;">
                If you received this, your Brevo API is working perfectly! 🎉
              </p>
            </div>
            <div class="footer">
              <p>Fusion IMS &bull; ${new Date().getFullYear()}</p>
            </div>
          </div>
        </body>
        </html>
      `
    );

    if (result) {
      return { 
        success: true, 
        message: 'Test email sent successfully!',
        messageId: result.messageId 
      };
    } else {
      return { 
        success: false, 
        message: 'Failed to send test email. Check logs for details.' 
      };
    }
  } catch (error) {
    return { 
      success: false, 
      message: `Error: ${error.message}` 
    };
  }
};

export default { sendEmail, testBrevoConnection };