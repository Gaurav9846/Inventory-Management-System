// src/utils/emailTemplates.js

// ✅ WELCOME EMAIL TEMPLATE - For new users
export const welcomeUserTemplate = (name, email, password, role) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Fusion IMS</title>
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
      font-size: 28px; 
    }
    .header p { 
      color: rgba(255,255,255,0.8); 
      margin: 8px 0 0; 
      font-size: 16px; 
    }
    .content { 
      padding: 30px; 
    }
    .greeting { 
      font-size: 20px; 
      font-weight: 600; 
      color: #1a1a2e; 
      margin-bottom: 10px; 
    }
    .message { 
      color: #4a4a6a; 
      margin-bottom: 20px; 
      font-size: 15px; 
    }
    .details { 
      background: #f8fafc; 
      padding: 20px; 
      border-radius: 8px; 
      border-left: 4px solid #4F46E5; 
      margin: 15px 0; 
    }
    .details table { 
      width: 100%; 
      border-collapse: collapse; 
    }
    .details td { 
      padding: 8px 0; 
      border-bottom: 1px solid #e2e8f0; 
    }
    .details td:first-child { 
      font-weight: 600; 
      color: #64748b; 
      width: 40%; 
    }
    .details tr:last-child td { 
      border-bottom: none; 
    }
    .password-box { 
      background: #1e293b; 
      color: #e2e8f0; 
      padding: 12px 16px; 
      border-radius: 6px; 
      font-family: 'Courier New', monospace; 
      font-size: 18px; 
      letter-spacing: 1px; 
      margin: 10px 0; 
      text-align: center; 
    }
    .warning { 
      background: #fef3c7; 
      padding: 12px 16px; 
      border-radius: 8px; 
      border-left: 4px solid #f59e0b; 
      margin: 15px 0; 
    }
    .warning p { 
      margin: 0; 
      color: #92400e; 
      font-size: 14px; 
    }
    .button-container { 
      text-align: center; 
      margin: 20px 0; 
    }
    .button { 
      display: inline-block; 
      background: #4F46E5; 
      color: white !important; 
      padding: 14px 40px; 
      text-decoration: none; 
      border-radius: 8px; 
      font-weight: 600; 
      font-size: 16px; 
    }
    .button:hover { 
      background: #4338CA; 
    }
    .footer { 
      text-align: center; 
      padding: 20px; 
      border-top: 1px solid #e2e8f0; 
      color: #94a3b8; 
      font-size: 13px; 
    }
    .footer a { 
      color: #4F46E5; 
      text-decoration: none; 
    }
    @media only screen and (max-width: 480px) {
      body { padding: 10px; }
      .content { padding: 20px; }
      .header h1 { font-size: 22px; }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <h1>🎉 Welcome to Fusion IMS</h1>
      <p>Inventory Management System</p>
    </div>
    
    <!-- Content -->
    <div class="content">
      <p class="greeting">Hello ${name},</p>
      <p class="message">
        Your account has been created successfully. You can now access the 
        Inventory Management System with the credentials below.
      </p>
      
      <!-- Account Details -->
      <div class="details">
        <table>
          <tr>
            <td>📧 Email</td>
            <td><strong>${email}</strong></td>
          </tr>
          <tr>
            <td>👤 Role</td>
            <td><strong>${role}</strong></td>
          </tr>
          <tr>
            <td>✅ Status</td>
            <td><span style="color: #16a34a; font-weight: 600;">Active</span></td>
          </tr>
        </table>
      </div>
      
      <!-- Password -->
      <p style="font-weight: 600; margin: 15px 0 5px;">🔑 Temporary Password:</p>
      <div class="password-box">${password}</div>
      
      <!-- Warning -->
      <div class="warning">
        <p>⚠️ <strong>Important:</strong> Please change your password immediately after your first login for security reasons.</p>
      </div>
      
      <!-- Login Button -->
      <div class="button-container">
        <a href="${process.env.FRONTEND_URL || 'https://inventory-management-system-one-peach.vercel.app'}/login" class="button">
          🚀 Login to Your Account
        </a>
      </div>
      
      <p style="color: #64748b; font-size: 14px; text-align: center; margin-top: 10px;">
        If the button doesn't work, copy and paste this link into your browser:<br>
        <span style="color: #4F46E5; font-size: 12px; word-break: break-all;">
          ${process.env.FRONTEND_URL || 'https://inventory-management-system-one-peach.vercel.app'}/login
        </span>
      </p>
    </div>
    
    <!-- Footer -->
    <div class="footer">
      <p>
        <strong>Fusion I.T. Solutions</strong> &bull; Inventory Management System<br>
        &copy; ${new Date().getFullYear()} All Rights Reserved
      </p>
      <p style="margin-top: 6px; font-size: 12px; color: #b0b0b0;">
        This is an automated email. Please do not reply to this message.
      </p>
    </div>
  </div>
</body>
</html>`;

// ✅ LOW STOCK ALERT TEMPLATE
export const lowStockAlertTemplate = (productName, currentStock, reorderLevel) => `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;border:1px solid #e0e0e0;border-radius:8px;overflow:hidden;">
  <div style="background:#dc2626;padding:20px;text-align:center;">
    <h1 style="color:#fff;margin:0;font-size:22px;">⚠️ Low Stock Alert</h1>
  </div>
  <div style="padding:24px;">
    <p style="font-size:16px;color:#333;">The following product has dropped to or below its reorder level:</p>
    <table style="width:100%;border-collapse:collapse;margin-top:16px;">
      <tr style="background:#f5f5f5;">
        <td style="padding:10px;font-weight:bold;">Product</td>
        <td style="padding:10px;">${productName}</td>
      </tr>
      <tr>
        <td style="padding:10px;font-weight:bold;">Current Stock</td>
        <td style="padding:10px;color:#dc2626;font-weight:bold;">${currentStock}</td>
      </tr>
      <tr style="background:#f5f5f5;">
        <td style="padding:10px;font-weight:bold;">Reorder Level</td>
        <td style="padding:10px;">${reorderLevel}</td>
      </tr>
    </table>
    <p style="margin-top:20px;color:#555;">Please create a purchase order to replenish stock.</p>
  </div>
  <div style="background:#f5f5f5;padding:12px;text-align:center;font-size:12px;color:#999;">
    Fusion I.T. Solutions – IMS
  </div>
</div>`;

// ✅ PURCHASE ORDER TEMPLATE
export const purchaseOrderTemplate = (order) => `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;border:1px solid #e0e0e0;border-radius:8px;overflow:hidden;">
  <div style="background:#2563eb;padding:20px;text-align:center;">
    <h1 style="color:#fff;margin:0;font-size:22px;">Purchase Order – ${order.orderNumber}</h1>
  </div>
  <div style="padding:24px;">
    <p>Dear <strong>${order.supplier.name}</strong>,</p>
    <p>Please find our purchase order below:</p>
    <table style="width:100%;border-collapse:collapse;margin-top:16px;">
      <thead>
        <tr style="background:#2563eb;color:#fff;">
          <th style="padding:10px;text-align:left;">Product</th>
          <th style="padding:10px;text-align:center;">Qty</th>
          <th style="padding:10px;text-align:right;">Unit Price (NPR)</th>
        </tr>
      </thead>
      <tbody>
        ${order.items.map((item, i) => `
          <tr style="background:${i % 2 === 0 ? "#f5f5f5" : "#fff"};">
            <td style="padding:10px;">${item.product.name}</td>
            <td style="padding:10px;text-align:center;">${item.quantity}</td>
            <td style="padding:10px;text-align:right;">${item.unitPrice ?? "–"}</td>
          </tr>`).join("")}
      </tbody>
    </table>
    <p style="margin-top:16px;"><strong>Total: NPR ${order.totalAmount ?? "–"}</strong></p>
  </div>
  <div style="background:#f5f5f5;padding:12px;text-align:center;font-size:12px;color:#999;">
    Fusion I.T. Solutions – IMS
  </div>
</div>`;

// ✅ PAYMENT SUCCESS TEMPLATE
export const paymentSuccessTemplate = (orderNumber, amount, transactionId) => `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;border:1px solid #e0e0e0;border-radius:8px;overflow:hidden;">
  <div style="background:#16a34a;padding:20px;text-align:center;">
    <h1 style="color:#fff;margin:0;font-size:22px;">✅ Payment Successful</h1>
  </div>
  <div style="padding:24px;">
    <p>Your payment has been received and confirmed.</p>
    <table style="width:100%;border-collapse:collapse;margin-top:16px;">
      <tr style="background:#f5f5f5;">
        <td style="padding:10px;font-weight:bold;">Order No.</td>
        <td style="padding:10px;">${orderNumber}</td>
      </tr>
      <tr>
        <td style="padding:10px;font-weight:bold;">Amount Paid</td>
        <td style="padding:10px;color:#16a34a;font-weight:bold;">NPR ${(amount / 100).toFixed(2)}</td>
      </tr>
      <tr style="background:#f5f5f5;">
        <td style="padding:10px;font-weight:bold;">Transaction ID</td>
        <td style="padding:10px;">${transactionId}</td>
      </tr>
    </table>
  </div>
  <div style="background:#f5f5f5;padding:12px;text-align:center;font-size:12px;color:#999;">
    Fusion I.T. Solutions – IMS
  </div>
</div>`;

// ✅ PASSWORD RESET TEMPLATE
export const passwordResetTemplate = (name, resetLink) => `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;border:1px solid #e0e0e0;border-radius:8px;overflow:hidden;">
  <div style="background:#f59e0b;padding:20px;text-align:center;">
    <h1 style="color:#fff;margin:0;font-size:22px;">🔑 Password Reset Request</h1>
  </div>
  <div style="padding:24px;">
    <p>Hello <strong>${name}</strong>,</p>
    <p>We received a request to reset your password. Click the button below to create a new password:</p>
    <div style="text-align:center;margin:20px 0;">
      <a href="${resetLink}" style="display:inline-block;background:#f59e0b;color:#fff;padding:12px 30px;text-decoration:none;border-radius:6px;font-weight:bold;">
        Reset Password
      </a>
    </div>
    <p style="color:#666;font-size:14px;">This link will expire in 1 hour.</p>
    <p style="color:#666;font-size:14px;">If you didn't request this, please ignore this email.</p>
  </div>
  <div style="background:#f5f5f5;padding:12px;text-align:center;font-size:12px;color:#999;">
    Fusion I.T. Solutions – IMS
  </div>
</div>`;