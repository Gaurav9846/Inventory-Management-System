// src/controllers/user.controller.js
import bcrypt from "bcrypt";
import prisma from "../config/prisma.js";
import { logAction } from "../utils/auditLog.js";
import { sendEmail } from "../config/nodemailer.js";
import { welcomeUserTemplate } from "../utils/emailTemplates.js";
import { createNotification } from "./notification.controller.js";

// ✅ GET /api/users - FIXED to include phone
export const getAllUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: { 
        id: true, 
        name: true, 
        email: true, 
        phone: true,  // ✅ Added phone
        role: true, 
        isActive: true, 
        createdAt: true 
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ✅ GET /api/users/:id - FIXED to include phone
export const getUserById = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: { 
        id: true, 
        name: true, 
        email: true, 
        phone: true,  // ✅ Added phone
        role: true, 
        isActive: true, 
        createdAt: true 
      },
    });
    if (!user) return res.status(404).json({ message: "User not found." });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ✅ POST /api/users - FIXED to include phone
export const createUser = async (req, res) => {
  try {
    const { name, email, role, phone } = req.body; // ✅ Added phone
    if (!name || !email)
      return res.status(400).json({ message: "Name and email are required." });

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ message: "Email already in use." });

    const tempPassword = `${Math.random().toString(36).slice(-6)}A1!`;
    const hashed = await bcrypt.hash(tempPassword, 10);

    const user = await prisma.user.create({
      data: { 
        name, 
        email, 
        phone: phone || null, // ✅ Added phone
        password: hashed, 
        role: role || "STAFF" 
      },
      select: { 
        id: true, 
        name: true, 
        email: true, 
        phone: true, // ✅ Added phone
        role: true, 
        createdAt: true 
      },
    });

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

    await sendEmail(email, "Your Fusion IMS Account", welcomeUserTemplate(name, email, tempPassword, user.role));

    await createNotification({
      title: `👤 New User Created: ${user.name}`,
      message: `User "${user.name}" has been created with role: ${user.role}. Email: ${user.email}.`,
      type: 'SYSTEM_WARNING',
      priority: 'INFORMATION',
      referenceId: user.id,
      referenceType: 'User',
      actionUrl: `/users/${user.id}`,
    });

    res.status(201).json({ user, message: "User created. Credentials sent via email." });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ✅ PATCH /api/users/:id - FIXED to handle phone
export const updateUser = async (req, res) => {
  try {
    const { name, role, isActive, phone } = req.body; // ✅ Added phone
    
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
        ...(phone !== undefined && { phone }), // ✅ Added phone update
      },
      select: { 
        id: true, 
        name: true, 
        email: true, 
        phone: true,  // ✅ Include phone in response
        role: true, 
        isActive: true 
      },
    });

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

    await createNotification({
      title: `✏️ User Updated: ${user.name}`,
      message: `User "${user.name}" details have been updated. Role: ${user.role}. Status: ${user.isActive ? 'Active' : 'Inactive'}.`,
      type: 'SYSTEM_WARNING',
      priority: 'INFORMATION',
      referenceId: user.id,
      referenceType: 'User',
      actionUrl: `/users/${user.id}`,
    });

    res.json(user);
  } catch (err) {
    if (err.code === "P2025") return res.status(404).json({ message: "User not found." });
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/users/:id (soft delete – deactivate)
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

    await createNotification({
      title: `${user.isActive ? '🚫 User Deactivated' : '✅ User Activated'}: ${user.name}`,
      message: `User "${user.name}" (${user.email}) has been ${user.isActive ? 'deactivated' : 'activated'}.`,
      type: 'SYSTEM_WARNING',
      priority: user.isActive ? 'WARNING' : 'INFORMATION',
      referenceId: req.params.id,
      referenceType: 'User',
    });

    res.json({ message: `User ${user.isActive ? 'deactivated' : 'activated'} successfully.` });
  } catch (err) {
    if (err.code === "P2025") return res.status(404).json({ message: "User not found." });
    res.status(500).json({ message: err.message });
  }
};