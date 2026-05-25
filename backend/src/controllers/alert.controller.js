// src/controllers/alert.controller.js
import prisma from "../config/prisma.js";

export const getAllAlerts = async (req, res) => {
  try {
    const { isRead } = req.query;
    const alerts = await prisma.alert.findMany({
      where: isRead !== undefined ? { isRead: isRead === "true" } : undefined,
      include: {
        product: { select: { id: true, name: true, currentStock: true, unit: true, reorderLevel: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(alerts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const markAlertRead = async (req, res) => {
  try {
    const alert = await prisma.alert.update({
      where: { id: req.params.id },
      data:  { isRead: true },
    });
    res.json(alert);
  } catch (err) {
    if (err.code === "P2025") return res.status(404).json({ message: "Alert not found." });
    res.status(500).json({ message: err.message });
  }
};

export const markAllAlertsRead = async (req, res) => {
  try {
    const result = await prisma.alert.updateMany({ data: { isRead: true } });
    res.json({ message: `${result.count} alert(s) marked as read.` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const deleteAlert = async (req, res) => {
  try {
    await prisma.alert.delete({ where: { id: req.params.id } });
    res.json({ message: "Alert deleted." });
  } catch (err) {
    if (err.code === "P2025") return res.status(404).json({ message: "Alert not found." });
    res.status(500).json({ message: err.message });
  }
};
