// src/services/auditLog.service.js
import prisma from "../config/prisma.js";

/**
 * Get audit logs with filters and pagination
 */
export const getAuditLogs = async ({
  page = 1,
  limit = 20,
  search = null,
  module = null,
  action = null,
  userId = null,
  role = null,
  startDate = null,
  endDate = null,
}) => {
  const skip = (Number(page) - 1) * Number(limit);
  const take = Number(limit);

  const where = {};

  // Search
  if (search) {
    where.OR = [
      { userName: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
      { entityId: { contains: search, mode: "insensitive" } },
    ];
  }

  // Filters
  if (module && module !== "all") {
    where.module = module;
  }

  if (action && action !== "all") {
    where.action = action;
  }

  if (userId && userId !== "all") {
    where.userId = userId;
  }

  if (role && role !== "all") {
    where.userRole = role;
  }

  if (startDate) {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    where.createdAt = { ...where.createdAt, gte: start };
  }

  if (endDate) {
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    where.createdAt = { ...where.createdAt, lte: end };
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    data: logs,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(total / Number(limit)),
    },
  };
};

/**
 * Get audit log statistics
 */
export const getAuditLogStats = async () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [total, todayLogs, orders, inventory, users] = await Promise.all([
    prisma.auditLog.count(),
    prisma.auditLog.count({
      where: {
        createdAt: { gte: today, lt: tomorrow },
      },
    }),
    prisma.auditLog.count({
      where: {
        module: "Orders",
      },
    }),
    prisma.auditLog.count({
      where: {
        OR: [
          { module: "Products" },
          { module: "Inventory" },
          { module: "Stock" },
        ],
      },
    }),
    prisma.auditLog.count({
      where: {
        module: "Users",
      },
    }),
  ]);

  return {
    total,
    today: todayLogs,
    orders,
    inventory,
    users,
  };
};

/**
 * Get audit log modules for filter
 */
export const getAuditLogModules = async () => {
  const result = await prisma.auditLog.groupBy({
    by: ["module"],
    _count: { module: true },
    orderBy: { module: "asc" },
  });

  return result.map((r) => ({
    value: r.module,
    label: r.module,
    count: r._count.module,
  }));
};

/**
 * Get audit log actions for filter
 */
export const getAuditLogActions = async () => {
  const result = await prisma.auditLog.groupBy({
    by: ["action"],
    _count: { action: true },
    orderBy: { action: "asc" },
  });

  return result.map((r) => ({
    value: r.action,
    label: r.action.replace(/_/g, " "),
    count: r._count.action,
  }));
};