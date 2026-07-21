// src/controllers/auditLog.controller.js
import {
  getAuditLogs,
  getAuditLogStats,
  getAuditLogModules,
  getAuditLogActions,
} from "../services/auditLog.service.js";
import prisma from "../config/prisma.js";

// ==================== GET AUDIT LOGS ====================
export const getAuditLogsList = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      module,
      action,
      userId,
      role,
      startDate,
      endDate,
    } = req.query;

    const result = await getAuditLogs({
      page,
      limit,
      search,
      module,
      action,
      userId,
      role,
      startDate,
      endDate,
    });

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Error fetching audit logs:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==================== GET AUDIT LOG STATS ====================
export const getAuditLogStatsSummary = async (req, res) => {
  try {
    const stats = await getAuditLogStats();
    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Error fetching audit log stats:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==================== GET AUDIT LOG FILTERS ====================
export const getAuditLogFilters = async (req, res) => {
  try {
    const [modules, actions] = await Promise.all([
      getAuditLogModules(),
      getAuditLogActions(),
    ]);

    // Get users for filter
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        role: true,
      },
      orderBy: { name: "asc" },
    });

    // Get roles for filter
    const roles = await prisma.user.groupBy({
      by: ["role"],
    });

    res.json({
      success: true,
      data: {
        modules,
        actions,
        users: users.map((u) => ({
          value: u.id,
          label: u.name,
          role: u.role,
        })),
        roles: roles.map((r) => ({
          value: r.role,
          label: r.role.charAt(0).toUpperCase() + r.role.slice(1).toLowerCase(),
        })),
      },
    });
  } catch (error) {
    console.error("Error fetching audit log filters:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==================== GET AUDIT LOG DETAIL ====================
export const getAuditLogDetail = async (req, res) => {
  try {
    const { id } = req.params;

    const log = await prisma.auditLog.findUnique({
      where: { id },
    });

    if (!log) {
      return res.status(404).json({
        success: false,
        message: "Audit log not found",
      });
    }

    res.json({
      success: true,
      data: log,
    });
  } catch (error) {
    console.error("Error fetching audit log detail:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};