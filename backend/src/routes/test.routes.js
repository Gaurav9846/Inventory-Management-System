// src/routes/test.routes.js
import { Router } from "express";
import { sendEmail } from "../config/nodemailer.js";
import { protect } from "../middleware/auth.middleware.js";
import { restrictTo } from "../middleware/role.middleware.js";

const router = Router();

// ✅ Test email endpoint - Requires authentication
router.post("/test-email", protect, async (req, res) => {
  try {
    const { email, subject, message } = req.body;
    
    if (!email) {
      return res.status(400).json({ 
        success: false, 
        message: "Email address is required" 
      });
    }

    console.log(`📧 Test email requested for: ${email}`);
    console.log(`   SMTP Host: ${process.env.SMTP_HOST}`);
    console.log(`   SMTP Port: ${process.env.SMTP_PORT}`);
    console.log(`   SMTP User: ${process.env.SMTP_USER}`);
    
    const testHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>SMTP Test</title>
        <style>
          body { 
            font-family: 'Segoe UI', Arial, sans-serif; 
            line-height: 1.6; 
            color: #333; 
            max-width: 600px; 
            margin: 0 auto; 
            padding: 20px; 
            background: #f5f7fa; 
          }
          .container { 
            background: white; 
            border-radius: 12px; 
            overflow: hidden; 
            box-shadow: 0 4px 6px rgba(0,0,0,0.1); 
          }
          .header { 
            background: linear-gradient(135deg, #4F46E5, #7C3AED); 
            padding: 30px 20px; 
            text-align: center; 
          }
          .header h1 { 
            color: white; 
            margin: 0; 
            font-size: 24px; 
          }
          .content { 
            padding: 30px; 
          }
          .success-box { 
            background: #dcfce7; 
            padding: 20px; 
            border-radius: 8px; 
            border-left: 4px solid #22c55e; 
            margin: 15px 0; 
          }
          .success-box h2 { 
            color: #166534; 
            margin: 0 0 8px 0; 
          }
          .success-box p { 
            color: #14532d; 
            margin: 0; 
          }
          .details-box { 
            background: #f8fafc; 
            padding: 20px; 
            border-radius: 8px; 
            margin: 15px 0; 
            border: 1px solid #e2e8f0; 
          }
          .details-box table { 
            width: 100%; 
            border-collapse: collapse; 
          }
          .details-box td { 
            padding: 8px 0; 
            border-bottom: 1px solid #e2e8f0; 
          }
          .details-box td:first-child { 
            font-weight: 600; 
            color: #64748b; 
            width: 40%; 
          }
          .details-box tr:last-child td { 
            border-bottom: none; 
          }
          .footer { 
            text-align: center; 
            padding: 20px; 
            border-top: 1px solid #e2e8f0; 
            color: #94a3b8; 
            font-size: 12px; 
          }
          .badge { 
            display: inline-block; 
            background: #22c55e; 
            color: white; 
            padding: 2px 12px; 
            border-radius: 12px; 
            font-size: 12px; 
            font-weight: 600; 
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📧 SMTP Test</h1>
            <p style="color: rgba(255,255,255,0.8); margin: 5px 0 0;">
              Email Configuration Test
            </p>
          </div>
          <div class="content">
            <div class="success-box">
              <h2>✅ Test Email Sent Successfully!</h2>
              <p>Your Brevo SMTP configuration is working correctly.</p>
            </div>
            
            <p style="color: #64748b; margin: 5px 0 10px;">
              <span class="badge">SMTP</span> Connection successful
            </p>
            
            <div class="details-box">
              <table>
                <tr>
                  <td>SMTP Host</td>
                  <td><strong>${process.env.SMTP_HOST}</strong></td>
                </tr>
                <tr>
                  <td>SMTP Port</td>
                  <td><strong>${process.env.SMTP_PORT}</strong></td>
                </tr>
                <tr>
                  <td>SMTP User</td>
                  <td><strong>${process.env.SMTP_USER}</strong></td>
                </tr>
                <tr>
                  <td>From Email</td>
                  <td><strong>${process.env.EMAIL_FROM}</strong></td>
                </tr>
                <tr>
                  <td>Sent To</td>
                  <td><strong>${email}</strong></td>
                </tr>
                <tr>
                  <td>Timestamp</td>
                  <td><strong>${new Date().toISOString()}</strong></td>
                </tr>
              </table>
            </div>
            
            ${message ? `<div style="background: #fef3c7; padding: 12px; border-radius: 8px; margin: 10px 0;">
              <p style="margin: 0; color: #92400e;"><strong>📝 Message:</strong> ${message}</p>
            </div>` : ''}
            
            <p style="color: #64748b; text-align: center; margin-top: 15px;">
              This is a test email from your Inventory Management System.<br>
              Your email configuration is working perfectly! 🎉
            </p>
          </div>
          <div class="footer">
            <p>Fusion IMS &bull; ${new Date().getFullYear()}</p>
            <p style="margin-top: 4px; font-size: 11px; color: #b0b0b0;">
              This is an automated test email.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    const result = await sendEmail(
      email,
      subject || "✅ SMTP Test - Brevo Configuration Working",
      testHtml
    );

    if (result) {
      res.json({
        success: true,
        message: "Test email sent successfully!",
        data: {
          messageId: result.messageId,
          to: email,
          sentAt: new Date().toISOString(),
        },
      });
    } else {
      res.status(500).json({
        success: false,
        message: "Email sending failed. Check server logs for details.",
      });
    }
  } catch (error) {
    console.error("❌ Test email failed:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send test email",
      error: error.message,
    });
  }
});

// ✅ Test SMTP connection only (no email send)
router.get("/test-smtp", protect, restrictTo("ADMIN"), async (req, res) => {
  try {
    const transporter = (await import("../config/nodemailer.js")).default;
    
    // Verify connection
    const verified = await new Promise((resolve) => {
      transporter.verify((error, success) => {
        if (error) {
          resolve({ success: false, error: error.message });
        } else {
          resolve({ success: true });
        }
      });
    });

    res.json({
      success: verified.success,
      message: verified.success 
        ? "SMTP connection successful" 
        : `SMTP connection failed: ${verified.error}`,
      config: {
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        user: process.env.SMTP_USER,
        from: process.env.EMAIL_FROM,
        secure: false,
      },
    });
  } catch (error) {
    console.error("❌ SMTP test failed:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

export default router;