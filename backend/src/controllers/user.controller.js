// src/controllers/user.controller.js
import bcrypt from "bcrypt";
import prisma from "../config/prisma.js";
import { logAction } from "../utils/auditLog.js";
import { sendEmail } from "../config/nodemailer.js";
import { welcomeUserTemplate } from "../utils/emailTemplates.js";
import { createNotification } from "./notification.controller.js";

// ✅ GET /api/users - Get all users
export const getAllUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: { 
        id: true, 
        name: true, 
        email: true, 
        phone: true,
        role: true, 
        isActive: true, 
        createdAt: true 
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(users);
  } catch (err) {
    console.error("❌ Error in getAllUsers:", err);
    res.status(500).json({ message: err.message });
  }
};

// ✅ GET /api/users/:id - Get user by ID
export const getUserById = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: { 
        id: true, 
        name: true, 
        email: true, 
        phone: true,
        role: true, 
        isActive: true, 
        createdAt: true 
      },
    });
    if (!user) return res.status(404).json({ message: "User not found." });
    res.json(user);
  } catch (err) {
    console.error("❌ Error in getUserById:", err);
    res.status(500).json({ message: err.message });
  }
};

// ✅ POST /api/users - Create user with email
export const createUser = async (req, res) => {
  try {
    const { name, email, role, phone } = req.body;
    
    // Validate input
    if (!name || !email) {
      return res.status(400).json({ message: "Name and email are required." });
    }

    // Check if user already exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ message: "Email already in use." });
    }

    // Generate temporary password
    const tempPassword = `${Math.random().toString(36).slice(-6)}A1!`;
    const hashed = await bcrypt.hash(tempPassword, 10);

    // Create user
    const user = await prisma.user.create({
      data: { 
        name, 
        email, 
        phone: phone || null,
        password: hashed, 
        role: role || "STAFF" 
      },
      select: { 
        id: true, 
        name: true, 
        email: true, 
        phone: true,
        role: true, 
        createdAt: true 
      },
    });

    // ✅ Log action
    await logAction({
      userId: req.user.id,
      action: "CREATE",
      entity: "User",
      entityId: user.id,
      module: "Users",
      description: `Created user: ${user.name} (${user.email}) with role: ${user.role}`,
      newValues: { name: user.name, email: user.email, role: user.role },
      req,
    });

    // ✅ SEND WELCOME EMAIL - With proper error handling
    let emailSent = false;
    let emailError = null;
    
    try {
      console.log(`📧 Attempting to send welcome email to: ${email}`);
      
      const emailHtml = welcomeUserTemplate(name, email, tempPassword, user.role);
      const result = await sendEmail(
        email, 
        "🎉 Welcome to Fusion IMS - Your Account Details", 
        emailHtml
      );
      
      if (result) {
        emailSent = true;
        console.log(`✅ Welcome email sent successfully to ${email}`);
      } else {
        console.warn(`⚠️ Email sending returned null for ${email}`);
      }
    } catch (emailError) {
      emailError = emailError.message;
      console.error(`❌ Failed to send welcome email to ${email}:`, emailError);
      // Don't fail the user creation if email fails
    }

    // ✅ Create notification for admin
    await createNotification({
      title: `👤 New User Created: ${user.name}`,
      message: `User "${user.name}" has been created with role: ${user.role}. Email: ${user.email}. ${emailSent ? '✅ Credentials sent via email.' : '⚠️ Email failed to send.'}`,
      type: 'USER_CREATED',
      priority: 'INFORMATION',
      referenceId: user.id,
      referenceType: 'User',
      actionUrl: `/users/${user.id}`,
    });

    // ✅ Send notification to admin about new user
    try {
      await createNotification({
        title: `📋 New User Registration: ${user.name}`,
        message: `A new user "${user.name}" (${user.email}) has been created with role: ${user.role}. ${emailSent ? 'Welcome email sent.' : '⚠️ Email delivery failed.'}`,
        type: 'USER_CREATED',
        priority: 'INFORMATION',
        referenceId: user.id,
        referenceType: 'User',
      });
    } catch (notifError) {
      console.error("❌ Failed to create admin notification:", notifError);
    }

    res.status(201).json({ 
      user, 
      message: emailSent 
        ? "User created. Credentials sent via email." 
        : "User created. But email sending failed. Please check SMTP configuration.",
      emailSent,
      emailError: emailError || null,
    });
  } catch (err) {
    console.error("❌ Create user error:", err);
    res.status(500).json({ message: err.message });
  }
};

// ✅ PATCH /api/users/:id - Update user
export const updateUser = async (req, res) => {
  try {
    const { name, role, isActive, phone } = req.body;
    
    // Get old values before update
    const oldUser = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: { name: true, role: true, isActive: true, phone: true },
    });

    if (!oldUser) {
      return res.status(404).json({ message: "User not found." });
    }

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(role !== undefined && { role }),
        ...(isActive !== undefined && { isActive }),
        ...(phone !== undefined && { phone }),
      },
      select: { 
        id: true, 
        name: true, 
        email: true, 
        phone: true,
        role: true, 
        isActive: true 
      },
    });

    // ✅ Log action
    await logAction({
      userId: req.user.id,
      action: "UPDATE",
      entity: "User",
      entityId: user.id,
      module: "Users",
      description: `Updated user: ${user.name}`,
      oldValues: { 
        name: oldUser.name, 
        role: oldUser.role, 
        isActive: oldUser.isActive,
        phone: oldUser.phone 
      },
      newValues: { 
        name: user.name, 
        role: user.role, 
        isActive: user.isActive,
        phone: user.phone 
      },
      req,
    });

    // ✅ Create notification
    await createNotification({
      title: `✏️ User Updated: ${user.name}`,
      message: `User "${user.name}" details have been updated. Role: ${user.role}. Status: ${user.isActive ? 'Active' : 'Inactive'}.`,
      type: 'USER_STATUS_CHANGE',
      priority: 'INFORMATION',
      referenceId: user.id,
      referenceType: 'User',
      actionUrl: `/users/${user.id}`,
    });

    // ✅ Send email notification on status change
    if (isActive !== undefined && isActive !== oldUser.isActive) {
      try {
        const statusText = isActive ? 'activated' : 'deactivated';
        const emailHtml = `
          <h1>Account Status Update</h1>
          <p>Hello ${user.name},</p>
          <p>Your account has been ${statusText}.</p>
          <p>If you have any questions, please contact your administrator.</p>
          <p>Best regards,<br>Fusion IMS Team</p>
        `;
        await sendEmail(user.email, `Account ${statusText}`, emailHtml);
        console.log(`✅ Status change email sent to ${user.email}`);
      } catch (emailError) {
        console.error(`❌ Failed to send status email:`, emailError);
      }
    }

    res.json(user);
  } catch (err) {
    if (err.code === "P2025") {
      return res.status(404).json({ message: "User not found." });
    }
    console.error("❌ Update user error:", err);
    res.status(500).json({ message: err.message });
  }
};

// ✅ DELETE /api/users/:id - Soft delete (deactivate)
export const deleteUser = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: { name: true, email: true, isActive: true }
    });
    
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const action = user.isActive ? "DEACTIVATE" : "ACTIVATE";
    
    await prisma.user.update({ 
      where: { id: req.params.id }, 
      data: { isActive: !user.isActive } 
    });

    // ✅ Log action
    await logAction({
      userId: req.user.id,
      action: action,
      entity: "User",
      entityId: req.params.id,
      module: "Users",
      description: `${action} user: ${user.name}`,
      oldValues: { isActive: user.isActive },
      newValues: { isActive: !user.isActive },
      req,
    });

    // ✅ Create notification
    await createNotification({
      title: `${user.isActive ? '🚫 User Deactivated' : '✅ User Activated'}: ${user.name}`,
      message: `User "${user.name}" (${user.email}) has been ${user.isActive ? 'deactivated' : 'activated'}.`,
      type: 'USER_STATUS_CHANGE',
      priority: user.isActive ? 'WARNING' : 'INFORMATION',
      referenceId: req.params.id,
      referenceType: 'User',
    });

    // ✅ Send status change email
    try {
      const statusText = user.isActive ? 'deactivated' : 'activated';
      const emailHtml = `
        <h1>Account Status Update</h1>
        <p>Hello ${user.name},</p>
        <p>Your account has been ${statusText}.</p>
        <p>If you have any questions, please contact your administrator.</p>
        <p>Best regards,<br>Fusion IMS Team</p>
      `;
      await sendEmail(user.email, `Account ${statusText}`, emailHtml);
      console.log(`✅ Status change email sent to ${user.email}`);
    } catch (emailError) {
      console.error(`❌ Failed to send status email:`, emailError);
    }

    res.json({ message: `User ${user.isActive ? 'deactivated' : 'activated'} successfully.` });
  } catch (err) {
    if (err.code === "P2025") {
      return res.status(404).json({ message: "User not found." });
    }
    console.error("❌ Delete user error:", err);
    res.status(500).json({ message: err.message });
  }
};