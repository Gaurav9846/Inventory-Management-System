// src/controllers/notification.controller.js
import prisma from "../config/prisma.js";
import { sendEmail } from "../config/nodemailer.js";
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
    LOW_STOCK: 'Low Stock Alert',
    CREDIT_DUE: 'Credit Payment Due',
    ORDER_UPDATE: 'Order Update',
    SUPPLIER_DELAY: 'Supplier Delay',
    PAYMENT_RECEIVED: 'Payment Received',
    APPROVAL_REQUEST: 'Approval Required',
    SYSTEM_WARNING: 'System Warning',
    STOCK_ADJUSTMENT: 'Stock Adjustment',
    DELIVERY_UPDATE: 'Delivery Update',
    NEW_ORDER: 'New Order'
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
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #1f2937;
          margin: 0;
          padding: 0;
          background-color: #f3f4f6;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .card {
          background: white;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        }
        .header {
          background: ${color};
          padding: 24px 20px;
          text-align: center;
          color: white;
        }
        .header h1 {
          margin: 0;
          font-size: 24px;
          font-weight: 600;
        }
        .header p {
          margin: 8px 0 0;
          opacity: 0.9;
          font-size: 14px;
        }
        .content {
          padding: 24px;
        }
        .message-box {
          background: #f9fafb;
          border-radius: 8px;
          padding: 16px;
          margin: 16px 0;
          border-left: 4px solid ${color};
        }
        .message-text {
          font-size: 16px;
          color: #374151;
          margin: 0;
        }
        .details {
          background: #f3f4f6;
          border-radius: 8px;
          padding: 16px;
          margin: 16px 0;
        }
        .detail-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid #e5e7eb;
        }
        .detail-row:last-child {
          border-bottom: none;
        }
        .detail-label {
          font-weight: 600;
          color: #4b5563;
        }
        .detail-value {
          color: #1f2937;
        }
        .button {
          display: inline-block;
          background: ${color};
          color: white;
          padding: 12px 24px;
          text-decoration: none;
          border-radius: 8px;
          font-weight: 500;
          margin-top: 16px;
          transition: background 0.2s;
        }
        .button:hover {
          background: ${color}dd;
        }
        .footer {
          background: #f9fafb;
          padding: 16px 24px;
          text-align: center;
          font-size: 12px;
          color: #6b7280;
          border-top: 1px solid #e5e7eb;
        }
        .badge {
          display: inline-block;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 500;
          background: ${color}20;
          color: ${color};
        }
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
            <p>To update your notification preferences, please visit your account settings.</p>
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
 * Send email notification to a user
 */
const sendEmailNotification = async (notification, user, actionUrl = null) => {
  if (!user?.email) return null;
  
  try {
    const subject = `[IMS] ${notification.title}`;
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
        subject: `[IMS] ${notification.title}`,
        status: 'FAILED',
        errorMessage: error.message,
      },
    });
    
    return null;
  }
};

/**
 * Create notification and send to relevant users
 */
export const createNotification = async (data) => {
  const {
    title,
    message,
    type,
    priority = 'INFORMATION',
    userId = null, // If null, send to all managers/admins
    referenceId = null,
    referenceType = null,
    sendEmail = true,
    actionUrl = null,
  } = data;

  try {
    let recipients = [];
    
    if (userId) {
      // Send to specific user
      const user = await prisma.user.findUnique({
        where: { id: userId, isActive: true },
        include: { notificationPref: true },
      });
      if (user) recipients.push(user);
    } else {
      // Send to all managers and admins
      recipients = await prisma.user.findMany({
        where: { role: { in: ['ADMIN', 'MANAGER'] }, isActive: true },
        include: { notificationPref: true },
      });
    }
    
    const notifications = [];
    
    for (const recipient of recipients) {
      // Check if user wants this type of notification
      const prefs = recipient.notificationPref;
      if (prefs) {
        // Check type preference
        let typeEnabled = true;
        switch (type) {
          case 'LOW_STOCK': typeEnabled = prefs.lowStockAlerts; break;
          case 'CREDIT_DUE': typeEnabled = prefs.creditDueAlerts; break;
          case 'SUPPLIER_DELAY': typeEnabled = prefs.supplierDelayAlerts; break;
          case 'ORDER_UPDATE': typeEnabled = prefs.orderUpdates; break;
          case 'DELIVERY_UPDATE': typeEnabled = prefs.deliveryUpdates; break;
          case 'APPROVAL_REQUEST': typeEnabled = prefs.approvalRequests; break;
          case 'SYSTEM_WARNING': typeEnabled = prefs.systemWarnings; break;
          case 'STOCK_ADJUSTMENT': typeEnabled = prefs.stockAdjustments; break;
          default: typeEnabled = true;
        }
        
        // Check priority preference
        let priorityEnabled = true;
        switch (priority) {
          case 'CRITICAL': priorityEnabled = prefs.criticalAlerts; break;
          case 'WARNING': priorityEnabled = prefs.warningAlerts; break;
          case 'INFORMATION': priorityEnabled = prefs.infoAlerts; break;
          default: priorityEnabled = true;
        }
        
        if (!typeEnabled || !priorityEnabled) continue;
      }
      
      // Create notification
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
      
      // Send email if enabled
      if (sendEmail && recipient.notificationPref?.emailNotifications !== false) {
        await sendEmailNotification(notification, recipient, actionUrl);
      }
    }
    
    return notifications;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

/**
 * Auto-create low stock notification (replaces Alert system)
 */
export const checkAndCreateLowStockNotification = async (product) => {
  if (product.currentStock > product.reorderLevel) return null;
  
  // Check if unread notification already exists for this product
  const existing = await prisma.notification.findFirst({
    where: {
      type: 'LOW_STOCK',
      referenceId: product.id,
      isRead: false,
    },
  });
  
  if (existing) return existing;
  
  const priority = product.currentStock === 0 ? 'CRITICAL' : 'WARNING';
  const stockStatus = product.currentStock === 0 ? 'Out of Stock' : 'Low Stock';
  const message = `${stockStatus}: "${product.name}" has only ${product.currentStock} ${product.unit}(s) remaining. Reorder level is ${product.reorderLevel} ${product.unit}(s). Please create a purchase order to replenish stock.`;
  
  return await createNotification({
    title: `${stockStatus}: ${product.name}`,
    message,
    type: 'LOW_STOCK',
    priority,
    referenceId: product.id,
    referenceType: 'Product',
    actionUrl: `/inventory/products/${product.id}`,
  });
};

/**
 * Auto-create credit due notification
 */
export const checkAndCreateCreditDueNotification = async () => {
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
  
  for (const account of dueAccounts) {
    const daysUntilDue = Math.ceil((account.dueDate - today) / (1000 * 60 * 60 * 24));
    const priority = daysUntilDue <= 0 ? 'CRITICAL' : 'WARNING';
    const statusText = daysUntilDue <= 0 ? 'overdue' : `due in ${daysUntilDue} days`;
    
    await createNotification({
      title: `Credit Payment ${statusText.toUpperCase()}`,
      message: `Customer "${account.customer.name}" has a credit payment of ₹${account.remainingBalance.toLocaleString()} ${statusText}. Due date: ${account.dueDate.toLocaleDateString()}.`,
      type: 'CREDIT_DUE',
      priority,
      referenceId: account.customerId,
      referenceType: 'Customer',
      actionUrl: `/customers/${account.customerId}/credit`,
    });
  }
};

// ==================== CONTROLLER FUNCTIONS ====================

/**
 * GET /api/notifications
 * Get all notifications with filters
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
      userId: req.user.id, // Users only see their own notifications
      ...(isRead !== undefined && { isRead: isRead === 'true' }),
      ...(type && { type }),
      ...(priority && { priority }),
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
    
    // Get unread count
    const unreadCount = await prisma.notification.count({
      where: { userId: req.user.id, isRead: false },
    });
    
    // Get counts by type and priority for stats
    const typeCounts = await prisma.notification.groupBy({
      by: ['type'],
      where: { userId: req.user.id },
      _count: true,
    });
    
    const priorityCounts = await prisma.notification.groupBy({
      by: ['priority'],
      where: { userId: req.user.id, isRead: false },
      _count: true,
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
        byType: typeCounts,
        byPriority: priorityCounts,
      },
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/notifications/stats
 * Get notification statistics
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
    ]);
    
    // Get email log stats
    const emailLogs = await prisma.emailLog.aggregate({
      where: { notification: { userId: req.user.id } },
      _count: true,
    });
    
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
        emailsSent: emailLogs._count,
      },
    });
  } catch (error) {
    console.error('Get notification stats error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/notifications/:id
 * Get single notification
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
 * Mark a notification as read
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
 * Mark all notifications as read
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
 * Delete a notification
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
 * Delete all read notifications
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
 * POST /api/notifications/send-email
 * Resend email for a notification
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
 * Get user notification preferences
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
 * Update user notification preferences
 */
export const updateNotificationPreferences = async (req, res) => {
  try {
    const {
      emailNotifications,
      smsNotifications,
      inAppNotifications,
      lowStockAlerts,
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
        emailNotifications: emailNotifications ?? undefined,
        smsNotifications: smsNotifications ?? undefined,
        inAppNotifications: inAppNotifications ?? undefined,
        lowStockAlerts: lowStockAlerts ?? undefined,
        creditDueAlerts: creditDueAlerts ?? undefined,
        supplierDelayAlerts: supplierDelayAlerts ?? undefined,
        orderUpdates: orderUpdates ?? undefined,
        systemWarnings: systemWarnings ?? undefined,
        approvalRequests: approvalRequests ?? undefined,
        stockAdjustments: stockAdjustments ?? undefined,
        deliveryUpdates: deliveryUpdates ?? undefined,
        criticalAlerts: criticalAlerts ?? undefined,
        warningAlerts: warningAlerts ?? undefined,
        infoAlerts: infoAlerts ?? undefined,
      },
      create: {
        userId: req.user.id,
        emailNotifications: emailNotifications ?? true,
        smsNotifications: smsNotifications ?? false,
        inAppNotifications: inAppNotifications ?? true,
        lowStockAlerts: lowStockAlerts ?? true,
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

// ==================== CREATE NOTIFICATION (Admin/Manager) ====================

/**
 * POST /api/notifications
 * Create a new notification (Admin/Manager only)
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