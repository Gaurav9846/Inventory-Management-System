// src/controllers/user.controller.js
import bcrypt from "bcrypt";
import prisma from "../config/prisma.js";
import { logAction } from "../utils/auditLog.js";
import { sendEmail } from "../config/nodemailer.js";
import { welcomeUserTemplate } from "../utils/emailTemplates.js";

// GET /api/users
export const getAllUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/users/:id
export const getUserById = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where:  { id: req.params.id },
      select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
    });
    if (!user) return res.status(404).json({ message: "User not found." });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/users
export const createUser = async (req, res) => {
  try {
    const { name, email, role } = req.body;
    if (!name || !email)
      return res.status(400).json({ message: "Name and email are required." });

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ message: "Email already in use." });

    const tempPassword = `${Math.random().toString(36).slice(-6)}A1!`;
    const hashed = await bcrypt.hash(tempPassword, 10);

    const user = await prisma.user.create({
      data:   { name, email, password: hashed, role: role || "STAFF" },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });

    await logAction(req.user.id, "CREATE", "User", user.id, { name, email, role });
    await sendEmail(email, "Your Fusion IMS Account", welcomeUserTemplate(name, email, tempPassword, user.role));

    res.status(201).json({ user, message: "User created. Credentials sent via email." });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PATCH /api/users/:id
export const updateUser = async (req, res) => {
  try {
    const { name, role, isActive } = req.body;
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: {
        ...(name                  && { name }),
        ...(role                  && { role }),
        ...(isActive !== undefined && { isActive }),
      },
      select: { id: true, name: true, email: true, role: true, isActive: true },
    });
    await logAction(req.user.id, "UPDATE", "User", user.id, req.body);
    res.json(user);
  } catch (err) {
    if (err.code === "P2025") return res.status(404).json({ message: "User not found." });
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/users/:id  (soft delete – deactivate)
export const deleteUser = async (req, res) => {
  try {
    await prisma.user.update({ where: { id: req.params.id }, data: { isActive: false } });
    await logAction(req.user.id, "DEACTIVATE", "User", req.params.id);
    res.json({ message: "User deactivated successfully." });
  } catch (err) {
    if (err.code === "P2025") return res.status(404).json({ message: "User not found." });
    res.status(500).json({ message: err.message });
  }
};
