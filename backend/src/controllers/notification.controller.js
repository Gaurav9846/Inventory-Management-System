// src/controllers/notification.controller.js

import prisma from "../config/prisma.js";
import { sendEmail } from "../config/brevo.js";
import { logAction } from "../utils/auditLog.js";

// ==================== EMAIL TEMPLATES ====================

const getEmailTemplate = (notification, user, actionUrl = null) => {
  const priorityColors = {
    CRITICAL: '#dc2626',
    WARNING: '#f59e0b',
    INFORMATION: '#3b82f6'
  };
  
  const priorityIcons = {
    CRITICAL: '🔴',
    WARNING: '🟠',
    INFORMATION: '🔵'
  };
  
  const typeLabels = {
    LOW_STOCK: '⚠️ Stock Alert',
    OUT_OF_STOCK: '🚫 Out of Stock Alert',
    CREDIT_DUE: '💳 Credit Payment Due',
    ORDER_UPDATE: '📦 Order Update',
    SUPPLIER_DELAY: '⏰ Supplier Delay',
    PAYMENT_RECEIVED: '💰 Payment Received',
    APPROVAL_REQUEST: '📋 Approval Required',
    SYSTEM_WARNING: '⚙️ System Warning',
    STOCK_ADJUSTMENT: '📊 Stock Adjustment',
    DELIVERY_UPDATE: '🚚 Delivery Update',
    NEW_ORDER: '🛒 New Order',
    USER_CREATED: '👤 Account Created',
    USER_STATUS_CHANGE: '🔐 Account Status',
    USER_ROLE_CHANGE: '🔄 Role Update',
    PASSWORD_CHANGE: '🔑 Password Changed',
    PROFILE_CHANGE_REQUEST: '📝 Profile Change Request'
  };
  
  const color = priorityColors[notification.priority] || '#3b82f6';
  const icon = priorityIcons[notification.priority] || '📋';
  const typeLabel = typeLabels[notification.type] || 'Notification';
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${notification.title}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #1f2937; margin: 0; padding: 0; background-color: #f3f4f6; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .card { background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
        .header { background: ${color}; padding: 24px 20px; text-align: center; color: white; }
        .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
        .header p { margin: 8px 0 0; opacity: 0.9; font-size: 14px; }
        .content { padding: 24px; }
        .message-box { background: #f9fafb; border-radius: 8px; padding: 16px; margin: 16px 0; border-left: 4px solid ${color}; }
        .message-text { font-size: 16px; color: #374151; margin: 0; }
        .button { display: inline-block; background: ${color}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 500; margin-top: 16px; }
        .footer { background: #f9fafb; padding: 16px 24px; text-align: center; font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="card">
          <div class="header">
            <h1>${icon} ${typeLabel}</h1>
            <p>${notification.priority} Priority</p>
          </div>
          <div class="content">
            <h2 style="margin: 0 0 8px; font-size: 20px;">${notification.title}</h2>
            <div class="message-box">
              <p class="message-text">${notification.message}</p>
            </div>
            ${actionUrl ? `<a href="${actionUrl}" class="button">View Details →</a>` : ''}
          </div>
          <div class="footer">
            <p>This is an automated notification from your Inventory Management System.</p>
            <p>&copy; ${new Date().getFullYear()} IMS - All Rights Reserved</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
};

// ==================== HELPER FUNCTIONS ====================

/**
 * ✅ ONLY THESE TYPES SEND EMAILS TO ADMIN:
 * - User Management: USER_CREATED, USER_STATUS_CHANGE, USER_ROLE_CHANGE, PASSWORD_CHANGE, PROFILE_CHANGE_REQUEST
 * - Stock Alerts: LOW_STOCK, OUT_OF_STOCK
 * 
 * All other notifications are IN-APP ONLY
 */
const shouldSendEmail = (type) => {
  const EMAIL_TYPES = [
    // User Management (Admin needs to know)
    'USER_CREATED',
    'USER_STATUS_CHANGE',
    'USER_ROLE_CHANGE',
    'PASSWORD_CHANGE',
    'PROFILE_CHANGE_REQUEST',  // ✅ Added for profile change requests
    // Stock Alerts (Admin needs to know)
    'LOW_STOCK',
    'OUT_OF_STOCK',
  ];
  
  return EMAIL_TYPES.includes(type);
};

/**
 * Get admin users who should receive email notifications
 */
const getAdminRecipients = async () => {
  return await prisma.user.findMany({
    where: {
      role: 'ADMIN',
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      email: true,
      notificationPref: true,
    },
  });
};

/**
 * Send email notification to a user
 */
const sendEmailNotification = async (notification, user, actionUrl = null) => {
  if (!user?.email) return null;
  
  try {
    const subject = `[IMS ADMIN] ${notification.title}`;
    const html = getEmailTemplate(notification, user, actionUrl);
    
    await sendEmail(user.email, subject, html);
    
    const emailLog = await prisma.emailLog.create({
      data: {
        notificationId: notification.id,
        recipientEmail: user.email,
        recipientName: user.name,
        subject: subject,
        status: 'SENT',
        sentAt: new Date(),
      },
    });
    
    await prisma.notification.update({
      where: { id: notification.id },
      data: { emailSent: true, emailSentAt: new Date() },
    });
    
    return emailLog;
  } catch (error) {
    console.error(`Failed to send email for notification ${notification.id}:`, error);
    
    await prisma.emailLog.create({
      data: {
        notificationId: notification.id,
        recipientEmail: user.email,
        recipientName: user.name,
        subject: `[IMS ADMIN] ${notification.title}`,
        status: 'FAILED',
        errorMessage: error.message,
      },
    });
    
    return null;
  }
};

// ==================== CREATE NOTIFICATION ====================

/**
 * Create notification - EMAILS ONLY to ADMIN for:
 * - User Management events
 * - Stock Alerts
 * Everything else is IN-APP only
 */
export const createNotification = async (data) => {
  const {
    title,
    message,
    type,
    priority = 'INFORMATION',
    userId = null,
    referenceId = null,
    referenceType = null,
    sendEmail = true,
    actionUrl = null,
  } = data;

  try {
    let recipients = [];
    
    // Get recipients
    if (userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId, isActive: true },
        include: { notificationPref: true },
      });
      if (user) recipients.push(user);
    } else {
      // For critical alerts, send to all admins and managers
      const roles = ['ADMIN', 'MANAGER'];
      recipients = await prisma.user.findMany({
        where: { 
          role: { in: roles }, 
          isActive: true 
        },
        include: { notificationPref: true },
      });
    }
    
    const notifications = [];
    
    for (const recipient of recipients) {
      // Create notification in database (ALWAYS)
      const notification = await prisma.notification.create({
        data: {
          title,
          message,
          type,
          priority,
          userId: recipient.id,
          referenceId,
          referenceType,
        },
      });
      
      notifications.push(notification);
      
      // ✅ EMAIL ONLY FOR SPECIFIC TYPES:
      // - User Management (USER_CREATED, USER_STATUS_CHANGE, USER_ROLE_CHANGE, PASSWORD_CHANGE, PROFILE_CHANGE_REQUEST)
      // - Stock Alerts (LOW_STOCK, OUT_OF_STOCK)
      // Everything else is IN-APP ONLY
      if (sendEmail && shouldSendEmail(type)) {
        // ✅ Send email to ALL ADMIN users for these critical events
        const admins = await getAdminRecipients();
        
        for (const admin of admins) {
          // Don't send duplicate email to the same user
          if (admin.id === recipient.id) continue;
          
          await sendEmailNotification(notification, admin, actionUrl);
          console.log(`📧 Admin email sent to ${admin.email}: ${type}`);
        }
        
        // Also send to the original recipient if they are not admin
        if (recipient.role !== 'ADMIN') {
          await sendEmailNotification(notification, recipient, actionUrl);
          console.log(`📧 Email sent to ${recipient.email}: ${type}`);
        }
      } else {
        console.log(`📧 Email skipped for ${recipient.email}: ${type} (in-app only)`);
      }
    }
    
    return notifications;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

// ==================== STOCK ALERT HELPERS ====================

/**
 * ✅ EXPORTED: Check and create stock alert notification
 * ALWAYS sends email to ADMIN for OUT_OF_STOCK and LOW_STOCK
 */
export const checkAndCreateStockAlert = async (product) => {
  if (!product) return null;
  
  const isOutOfStock = product.currentStock === 0;
  const isLowStock = product.currentStock > 0 && product.currentStock <= product.reorderLevel;
  
  if (!isOutOfStock && !isLowStock) return null;
  
  // Check if unread notification already exists
  const existing = await prisma.notification.findFirst({
    where: {
      OR: [
        { type: 'OUT_OF_STOCK' },
        { type: 'LOW_STOCK' },
      ],
      referenceId: product.id,
      isRead: false,
    },
  });
  
  if (existing) {
    // Update existing notification with latest stock info
    await prisma.notification.update({
      where: { id: existing.id },
      data: {
        message: isOutOfStock
          ? `"${product.name}" is OUT OF STOCK! Current stock: 0 ${product.unit}(s). Reorder level: ${product.reorderLevel} ${product.unit}(s).`
          : `"${product.name}" has only ${product.currentStock} ${product.unit}(s) remaining. Reorder level is ${product.reorderLevel} ${product.unit}(s).`,
        priority: isOutOfStock ? 'CRITICAL' : 'WARNING',
        updatedAt: new Date(),
      },
    });
    return existing;
  }
  
  let priority, type, title, message;
  
  if (isOutOfStock) {
    priority = 'CRITICAL';
    type = 'OUT_OF_STOCK';
    title = `🚫 OUT OF STOCK: ${product.name}`;
    message = `"${product.name}" is COMPLETELY OUT OF STOCK! Current stock: 0 ${product.unit}(s). Reorder level: ${product.reorderLevel} ${product.unit}(s). Please create a purchase order IMMEDIATELY.`;
  } else {
    priority = 'WARNING';
    type = 'LOW_STOCK';
    title = `⚠️ Low Stock Alert: ${product.name}`;
    message = `"${product.name}" has only ${product.currentStock} ${product.unit}(s) remaining. Reorder level is ${product.reorderLevel} ${product.unit}(s). Please create a purchase order.`;
  }
  
  // This will automatically send email to ADMIN because type is in the email list
  return await createNotification({
    title,
    message,
    type,
    priority,
    referenceId: product.id,
    referenceType: 'Product',
    actionUrl: `/inventory/products/${product.id}`,
  });
};

/**
 * ✅ EXPORTED: Check and create LOW STOCK notification (legacy compatibility)
 */
export const checkAndCreateLowStockNotification = async (product) => {
  return await checkAndCreateStockAlert(product);
};

// ==================== CREDIT DUE HELPER ====================

/**
 * ✅ EXPORTED: Check and create credit due notifications
 * Runs via cron job - IN-APP ONLY (no email)
 */
export const checkAndCreateCreditDueNotification = async () => {
  try {
    const today = new Date();
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(today.getDate() + 3);
    
    const dueAccounts = await prisma.creditAccount.findMany({
      where: {
        dueDate: { lte: threeDaysFromNow },
        remainingBalance: { gt: 0 },
        status: { not: 'PAID' },
      },
      include: { customer: true },
    });
    
    let createdCount = 0;
    
    for (const account of dueAccounts) {
      const daysUntilDue = Math.ceil((account.dueDate - today) / (1000 * 60 * 60 * 24));
      const priority = daysUntilDue <= 0 ? 'CRITICAL' : 'WARNING';
      const statusText = daysUntilDue <= 0 ? 'overdue' : `due in ${daysUntilDue} days`;
      
      // IN-APP ONLY - no email for credit due
      await createNotification({
        title: `💳 Credit Payment ${statusText.toUpperCase()}`,
        message: `Customer "${account.customer.name}" has a credit payment of ₹${account.remainingBalance.toLocaleString()} ${statusText}. Due date: ${account.dueDate.toLocaleDateString()}.`,
        type: 'CREDIT_DUE',
        priority,
        referenceId: account.customerId,
        referenceType: 'Customer',
        actionUrl: `/customers/${account.customerId}/credit`,
      });
      
      createdCount++;
    }
    
    return createdCount;
  } catch (error) {
    console.error('Error checking credit due:', error);
    throw error;
  }
};

// ==================== REST OF CONTROLLER FUNCTIONS ====================

/**
 * GET /api/notifications
 */
export const getAllNotifications = async (req, res) => {
  try {
    const {
      isRead,
      type,
      priority,
      page = 1,
      limit = 20,
      search,
      startDate,
      endDate,
    } = req.query;
    
    const skip = (Number(page) - 1) * Number(limit);
    
    const where = {
      userId: req.user.id,
      ...(isRead !== undefined && { isRead: isRead === 'true' }),
      ...(type && type !== 'all' && { type }),
      ...(priority && priority !== 'all' && { priority }),
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { message: { contains: search, mode: 'insensitive' } },
        ],
      }),
      ...(startDate && { createdAt: { gte: new Date(startDate) } }),
      ...(endDate && { createdAt: { lte: new Date(endDate) } }),
    };
    
    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: Number(limit),
        skip,
      }),
      prisma.notification.count({ where }),
    ]);
    
    const unreadCount = await prisma.notification.count({
      where: { userId: req.user.id, isRead: false },
    });
    
    res.json({
      success: true,
      data: notifications,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
      stats: {
        unreadCount,
      },
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/notifications/stats
 */
export const getNotificationStats = async (req, res) => {
  try {
    const where = { userId: req.user.id };
    
    const [
      total,
      unread,
      critical,
      warning,
      info,
      last7Days,
      emailSentCount,
      lowStockCount,
      outOfStockCount,
      creditDueCount,
      orderUpdateCount,
      paymentReceivedCount,
      approvalRequestCount,
      systemWarningCount,
      stockAdjustmentCount,
      deliveryUpdateCount,
      newOrderCount,
    ] = await Promise.all([
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { ...where, isRead: false } }),
      prisma.notification.count({ where: { ...where, priority: 'CRITICAL' } }),
      prisma.notification.count({ where: { ...where, priority: 'WARNING' } }),
      prisma.notification.count({ where: { ...where, priority: 'INFORMATION' } }),
      prisma.notification.count({
        where: {
          ...where,
          createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
      }),
      prisma.notification.count({
        where: { ...where, emailSent: true },
      }),
      prisma.notification.count({ where: { ...where, type: 'LOW_STOCK' } }),
      prisma.notification.count({ where: { ...where, type: 'OUT_OF_STOCK' } }),
      prisma.notification.count({ where: { ...where, type: 'CREDIT_DUE' } }),
      prisma.notification.count({ where: { ...where, type: 'ORDER_UPDATE' } }),
      prisma.notification.count({ where: { ...where, type: 'PAYMENT_RECEIVED' } }),
      prisma.notification.count({ where: { ...where, type: 'APPROVAL_REQUEST' } }),
      prisma.notification.count({ where: { ...where, type: 'SYSTEM_WARNING' } }),
      prisma.notification.count({ where: { ...where, type: 'STOCK_ADJUSTMENT' } }),
      prisma.notification.count({ where: { ...where, type: 'DELIVERY_UPDATE' } }),
      prisma.notification.count({ where: { ...where, type: 'NEW_ORDER' } }),
    ]);
    
    res.json({
      success: true,
      stats: {
        total,
        unread,
        critical,
        warning,
        info,
        last7Days,
        emailSent: emailSentCount,
        outOfStock: outOfStockCount,
        byType: {
          LOW_STOCK: lowStockCount,
          OUT_OF_STOCK: outOfStockCount,
          CREDIT_DUE: creditDueCount,
          ORDER_UPDATE: orderUpdateCount,
          PAYMENT_RECEIVED: paymentReceivedCount,
          APPROVAL_REQUEST: approvalRequestCount,
          SYSTEM_WARNING: systemWarningCount,
          STOCK_ADJUSTMENT: stockAdjustmentCount,
          DELIVERY_UPDATE: deliveryUpdateCount,
          NEW_ORDER: newOrderCount,
        }
      },
    });
  } catch (error) {
    console.error('Get notification stats error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/notifications/:id
 */
export const getNotificationById = async (req, res) => {
  try {
    const notification = await prisma.notification.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.id,
      },
      include: {
        emailLogs: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found.' });
    }
    
    res.json({ success: true, data: notification });
  } catch (error) {
    console.error('Get notification error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PATCH /api/notifications/:id/read
 */
export const markAsRead = async (req, res) => {
  try {
    const notification = await prisma.notification.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.id,
      },
    });
    
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found.' });
    }
    
    const updated = await prisma.notification.update({
      where: { id: req.params.id },
      data: { isRead: true },
    });
    
    await logAction(req.user.id, 'MARK_READ', 'Notification', updated.id);
    
    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PATCH /api/notifications/read-all
 */
export const markAllAsRead = async (req, res) => {
  try {
    const result = await prisma.notification.updateMany({
      where: {
        userId: req.user.id,
        isRead: false,
      },
      data: { isRead: true },
    });
    
    await logAction(req.user.id, 'MARK_ALL_READ', 'Notification', null, {
      count: result.count,
    });
    
    res.json({
      success: true,
      message: `${result.count} notification(s) marked as read.`,
    });
  } catch (error) {
    console.error('Mark all as read error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * DELETE /api/notifications/:id
 */
export const deleteNotification = async (req, res) => {
  try {
    const notification = await prisma.notification.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.id,
      },
    });
    
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found.' });
    }
    
    await prisma.notification.delete({ where: { id: req.params.id } });
    
    await logAction(req.user.id, 'DELETE', 'Notification', req.params.id);
    
    res.json({ success: true, message: 'Notification deleted.' });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * DELETE /api/notifications/delete-all-read
 */
export const deleteAllRead = async (req, res) => {
  try {
    const result = await prisma.notification.deleteMany({
      where: {
        userId: req.user.id,
        isRead: true,
      },
    });
    
    await logAction(req.user.id, 'DELETE_ALL_READ', 'Notification', null, {
      count: result.count,
    });
    
    res.json({
      success: true,
      message: `${result.count} read notification(s) deleted.`,
    });
  } catch (error) {
    console.error('Delete all read error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/notifications/:id/resend-email
 */
export const resendEmailNotification = async (req, res) => {
  try {
    const { id } = req.params;
    
    const notification = await prisma.notification.findFirst({
      where: {
        id,
        userId: req.user.id,
      },
    });
    
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found.' });
    }
    
    // ✅ Only allow resend for email-enabled types
    if (!shouldSendEmail(notification.type)) {
      return res.status(400).json({ 
        success: false, 
        message: 'This notification type does not support email.' 
      });
    }
    
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { notificationPref: true },
    });
    
    if (!user?.email) {
      return res.status(400).json({ success: false, message: 'User has no email address.' });
    }
    
    if (user.notificationPref?.emailNotifications === false) {
      return res.status(400).json({ success: false, message: 'Email notifications are disabled for this user.' });
    }
    
    const emailLog = await sendEmailNotification(notification, user);
    
    res.json({
      success: true,
      message: 'Email resent successfully.',
      data: emailLog,
    });
  } catch (error) {
    console.error('Resend email error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==================== NOTIFICATION PREFERENCES ====================

/**
 * GET /api/notifications/preferences
 */
export const getNotificationPreferences = async (req, res) => {
  try {
    let preferences = await prisma.notificationPreference.findUnique({
      where: { userId: req.user.id },
    });
    
    if (!preferences) {
      preferences = await prisma.notificationPreference.create({
        data: { userId: req.user.id },
      });
    }
    
    res.json({ success: true, data: preferences });
  } catch (error) {
    console.error('Get preferences error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PATCH /api/notifications/preferences
 */
export const updateNotificationPreferences = async (req, res) => {
  try {
    const {
      emailNotifications,
      smsNotifications,
      inAppNotifications,
      pushNotifications,
      lowStockAlerts,
      outOfStockAlerts,
      creditDueAlerts,
      supplierDelayAlerts,
      orderUpdates,
      systemWarnings,
      approvalRequests,
      stockAdjustments,
      deliveryUpdates,
      criticalAlerts,
      warningAlerts,
      infoAlerts,
    } = req.body;
    
    const preferences = await prisma.notificationPreference.upsert({
      where: { userId: req.user.id },
      update: {
        emailNotifications: emailNotifications !== undefined ? emailNotifications : undefined,
        smsNotifications: smsNotifications !== undefined ? smsNotifications : undefined,
        inAppNotifications: inAppNotifications !== undefined ? inAppNotifications : undefined,
        pushNotifications: pushNotifications !== undefined ? pushNotifications : undefined,
        lowStockAlerts: lowStockAlerts !== undefined ? lowStockAlerts : undefined,
        outOfStockAlerts: outOfStockAlerts !== undefined ? outOfStockAlerts : undefined,
        creditDueAlerts: creditDueAlerts !== undefined ? creditDueAlerts : undefined,
        supplierDelayAlerts: supplierDelayAlerts !== undefined ? supplierDelayAlerts : undefined,
        orderUpdates: orderUpdates !== undefined ? orderUpdates : undefined,
        systemWarnings: systemWarnings !== undefined ? systemWarnings : undefined,
        approvalRequests: approvalRequests !== undefined ? approvalRequests : undefined,
        stockAdjustments: stockAdjustments !== undefined ? stockAdjustments : undefined,
        deliveryUpdates: deliveryUpdates !== undefined ? deliveryUpdates : undefined,
        criticalAlerts: criticalAlerts !== undefined ? criticalAlerts : undefined,
        warningAlerts: warningAlerts !== undefined ? warningAlerts : undefined,
        infoAlerts: infoAlerts !== undefined ? infoAlerts : undefined,
      },
      create: {
        userId: req.user.id,
        emailNotifications: emailNotifications ?? true,
        smsNotifications: smsNotifications ?? false,
        inAppNotifications: inAppNotifications ?? true,
        pushNotifications: pushNotifications ?? true,
        lowStockAlerts: lowStockAlerts ?? true,
        outOfStockAlerts: outOfStockAlerts ?? true,
        creditDueAlerts: creditDueAlerts ?? true,
        supplierDelayAlerts: supplierDelayAlerts ?? true,
        orderUpdates: orderUpdates ?? true,
        systemWarnings: systemWarnings ?? true,
        approvalRequests: approvalRequests ?? true,
        stockAdjustments: stockAdjustments ?? true,
        deliveryUpdates: deliveryUpdates ?? true,
        criticalAlerts: criticalAlerts ?? true,
        warningAlerts: warningAlerts ?? true,
        infoAlerts: infoAlerts ?? true,
      },
    });
    
    await logAction(req.user.id, 'UPDATE_PREFERENCES', 'NotificationPreference', preferences.id);
    
    res.json({ success: true, data: preferences });
  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/notifications (Admin/Manager only)
 */
export const createManualNotification = async (req, res) => {
  try {
    const {
      title,
      message,
      type,
      priority,
      userId,
      referenceId,
      referenceType,
      sendEmail,
      actionUrl,
    } = req.body;
    
    if (!title || !message) {
      return res.status(400).json({ success: false, message: 'Title and message are required.' });
    }
    
    const notifications = await createNotification({
      title,
      message,
      type: type || 'SYSTEM_WARNING',
      priority: priority || 'INFORMATION',
      userId,
      referenceId,
      referenceType,
      sendEmail: sendEmail !== false,
      actionUrl,
    });
    
    await logAction(req.user.id, 'CREATE_NOTIFICATION', 'Notification', null, {
      title,
      type,
      recipientCount: notifications.length,
    });
    
    res.status(201).json({
      success: true,
      message: `Notification sent to ${notifications.length} recipient(s).`,
      data: notifications,
    });
  } catch (error) {
    console.error('Create manual notification error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};