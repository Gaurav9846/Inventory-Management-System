// src/utils/emailTemplates.js

export const lowStockAlertTemplate = (productName, currentStock, reorderLevel) => `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;border:1px solid #e0e0e0;border-radius:8px;overflow:hidden;">
  <div style="background:#1a73e8;padding:20px;text-align:center;">
    <h1 style="color:#fff;margin:0;font-size:22px;">⚠️ Low Stock Alert</h1>
  </div>
  <div style="padding:24px;">
    <p style="font-size:16px;color:#333;">The following product has dropped to or below its reorder level:</p>
    <table style="width:100%;border-collapse:collapse;margin-top:16px;">
      <tr style="background:#f5f5f5;"><td style="padding:10px;font-weight:bold;">Product</td><td style="padding:10px;">${productName}</td></tr>
      <tr><td style="padding:10px;font-weight:bold;">Current Stock</td><td style="padding:10px;color:#e53935;font-weight:bold;">${currentStock}</td></tr>
      <tr style="background:#f5f5f5;"><td style="padding:10px;font-weight:bold;">Reorder Level</td><td style="padding:10px;">${reorderLevel}</td></tr>
    </table>
    <p style="margin-top:20px;color:#555;">Please create a purchase order to replenish stock.</p>
  </div>
  <div style="background:#f5f5f5;padding:12px;text-align:center;font-size:12px;color:#999;">Fusion I.T. Solutions – IMS</div>
</div>`;

export const welcomeUserTemplate = (name, email, password, role) => `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;border:1px solid #e0e0e0;border-radius:8px;overflow:hidden;">
  <div style="background:#1a73e8;padding:20px;text-align:center;">
    <h1 style="color:#fff;margin:0;font-size:22px;">Welcome to Fusion IMS</h1>
  </div>
  <div style="padding:24px;">
    <p>Hello <strong>${name}</strong>, your account has been created.</p>
    <table style="width:100%;border-collapse:collapse;margin-top:16px;">
      <tr style="background:#f5f5f5;"><td style="padding:10px;font-weight:bold;">Email</td><td style="padding:10px;">${email}</td></tr>
      <tr><td style="padding:10px;font-weight:bold;">Temporary Password</td><td style="padding:10px;">${password}</td></tr>
      <tr style="background:#f5f5f5;"><td style="padding:10px;font-weight:bold;">Role</td><td style="padding:10px;">${role}</td></tr>
    </table>
    <p style="margin-top:20px;color:#e53935;">Please change your password after first login.</p>
  </div>
  <div style="background:#f5f5f5;padding:12px;text-align:center;font-size:12px;color:#999;">Fusion I.T. Solutions – IMS</div>
</div>`;

export const purchaseOrderTemplate = (order) => `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;border:1px solid #e0e0e0;border-radius:8px;overflow:hidden;">
  <div style="background:#1a73e8;padding:20px;text-align:center;">
    <h1 style="color:#fff;margin:0;font-size:22px;">Purchase Order – ${order.orderNumber}</h1>
  </div>
  <div style="padding:24px;">
    <p>Dear <strong>${order.supplier.name}</strong>,</p>
    <p>Please find our purchase order below:</p>
    <table style="width:100%;border-collapse:collapse;margin-top:16px;">
      <thead><tr style="background:#1a73e8;color:#fff;">
        <th style="padding:10px;text-align:left;">Product</th>
        <th style="padding:10px;text-align:center;">Qty</th>
        <th style="padding:10px;text-align:right;">Unit Price (NPR)</th>
      </tr></thead>
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
  <div style="background:#f5f5f5;padding:12px;text-align:center;font-size:12px;color:#999;">Fusion I.T. Solutions – IMS</div>
</div>`;

export const paymentSuccessTemplate = (orderNumber, amount, transactionId) => `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;border:1px solid #e0e0e0;border-radius:8px;overflow:hidden;">
  <div style="background:#34a853;padding:20px;text-align:center;">
    <h1 style="color:#fff;margin:0;font-size:22px;">✅ Payment Successful</h1>
  </div>
  <div style="padding:24px;">
    <p>Your payment has been received and confirmed.</p>
    <table style="width:100%;border-collapse:collapse;margin-top:16px;">
      <tr style="background:#f5f5f5;"><td style="padding:10px;font-weight:bold;">Order No.</td><td style="padding:10px;">${orderNumber}</td></tr>
      <tr><td style="padding:10px;font-weight:bold;">Amount Paid</td><td style="padding:10px;color:#34a853;font-weight:bold;">NPR ${(amount / 100).toFixed(2)}</td></tr>
      <tr style="background:#f5f5f5;"><td style="padding:10px;font-weight:bold;">Transaction ID</td><td style="padding:10px;">${transactionId}</td></tr>
    </table>
  </div>
  <div style="background:#f5f5f5;padding:12px;text-align:center;font-size:12px;color:#999;">Fusion I.T. Solutions – IMS</div>
</div>`;
