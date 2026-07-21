// src/controllers/auth.controller.js
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import prisma from "../config/prisma.js";
import { logAction } from "../utils/auditLog.js";

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });

// POST /api/auth/login - ✅ FIXED to include phone and profileImage
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: "Email and password are required." });

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.password)))
      return res.status(401).json({ message: "Invalid email or password." });

    if (!user.isActive)
      return res.status(403).json({ message: "Account deactivated. Contact admin." });

    const token = signToken(user.id);

    // ✅ Enhanced audit log with req for IP
    await logAction({
      userId: user.id,
      action: "LOGIN",
      entity: "User",
      entityId: user.id,
      module: "Authentication",
      description: `User ${user.name} logged in successfully`,
      req,
    });

    res.json({
      token,
      user: { 
        id: user.id, 
        name: user.name, 
        email: user.email, 
        role: user.role,
        phone: user.phone,           // ✅ Added phone
        profileImage: user.profileImage, // ✅ Added profileImage
        createdAt: user.createdAt 
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: err.message });
  }
};

// GET /api/auth/me - ✅ FIXED to include phone and profileImage
export const getMe = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { 
        id: true, 
        name: true, 
        email: true, 
        role: true, 
        phone: true,           // ✅ Added phone
        profileImage: true,    // ✅ Added profileImage
        createdAt: true 
      },
    });
    res.json(user);
  } catch (err) {
    console.error("Get me error:", err);
    res.status(500).json({ message: err.message });
  }
};

// PATCH /api/auth/change-password
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword)
      return res.status(400).json({ message: "Both passwords are required." });

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) return res.status(401).json({ message: "Current password is incorrect." });

    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { id: req.user.id }, data: { password: hashed } });

    await logAction({
      userId: req.user.id,
      action: "CHANGE_PASSWORD",
      entity: "User",
      entityId: req.user.id,
      module: "Authentication",
      description: `User ${req.user.name} changed their password`,
      req,
    });

    res.json({ message: "Password changed successfully." });
  } catch (err) {
    console.error("Change password error:", err);
    res.status(500).json({ message: err.message });
  }
};