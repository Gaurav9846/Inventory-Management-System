// src/routes/test.routes.js
import { Router } from "express";
import { sendEmail, verifyEmailConfig } from "../config/nodemailer.js";
import { testResendConnection } from "../config/resend.js";
import { protect } from "../middleware/auth.middleware.js";
import { restrictTo } from "../middleware/role.middleware.js";

const router = Router();

// ============================================================
// ✅ TEST EMAIL - Send a test email
// ============================================================
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
    
    const testHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Email Test</title>
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
          .details p { margin: 4px 0; }
          .footer { text-align: center; padding: 20px; border-top: 1px solid #e2e8f0; color: #94a3b8; font-size: 12px; }
          .badge { display: inline-block; background: #22c55e; color: white; padding: 2px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📧 Email Test</h1>
            <p style="color: rgba(255,255,255,0.8); margin: 5px 0 0;">Email Configuration Test</p>
          </div>
          <div class="content">
            <div class="success-box">
              <h2>✅ Test Email Sent Successfully!</h2>
              <p>Your email configuration is working correctly.</p>
            </div>
            
            <p style="margin: 5px 0 10px;">
              <span class="badge">${process.env.RESEND_API_KEY ? 'Resend API' : 'SMTP'}</span> 
              Connection successful
            </p>
            
            <div class="details">
              <p><strong>Method:</strong> ${process.env.RESEND_API_KEY ? 'Resend API' : 'SMTP'}</p>
              ${process.env.RESEND_API_KEY ? `<p><strong>API Key:</strong> ${process.env.RESEND_API_KEY.slice(0, 10)}...${process.env.RESEND_API_KEY.slice(-4)}</p>` : ''}
              <p><strong>From:</strong> ${process.env.EMAIL_FROM}</p>
              <p><strong>Sent To:</strong> ${email}</p>
              <p><strong>Time:</strong> ${new Date().toISOString()}</p>
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
          </div>
        </div>
      </body>
      </html>
    `;

    const result = await sendEmail(
      email,
      subject || "✅ Email Test - Configuration Working",
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

// ============================================================
// ✅ TEST RESEND API - Direct Resend API test
// ============================================================
router.post("/test-resend", protect, restrictTo("ADMIN"), async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email address is required"
      });
    }

    console.log(`🧪 Testing Resend API connection to: ${email}`);
    const result = await testResendConnection(email);

    res.json({
      success: result.success,
      message: result.message,
      data: result.success ? { messageId: result.messageId } : null,
    });
  } catch (error) {
    console.error("❌ Resend API test failed:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ============================================================
// ✅ CHECK CONFIGURATION - View email config status
// ============================================================
router.get("/test-config", protect, restrictTo("ADMIN"), async (req, res) => {
  try {
    const configStatus = await verifyEmailConfig();

    res.json({
      success: true,
      config: {
        emailFrom: process.env.EMAIL_FROM || 'Not set',
        resend: {
          configured: !!process.env.RESEND_API_KEY,
          apiKey: process.env.RESEND_API_KEY ? 
            `${process.env.RESEND_API_KEY.slice(0, 10)}...${process.env.RESEND_API_KEY.slice(-4)}` : 
            'Not set',
          working: configStatus.resend?.working || false,
        },
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("❌ Config check failed:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ============================================================
// ✅ HEALTH CHECK
// ============================================================
router.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  });
});

export default router;