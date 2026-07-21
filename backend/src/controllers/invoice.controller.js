// src/controllers/invoice.controller.js

import prisma from "../config/prisma.js";
import { generateSalesInvoiceNumber, generatePurchaseInvoiceNumber } from "../utils/counter.js";
import { logAction } from "../utils/auditLog.js";

// ==================== CREATE SALES INVOICE FROM SALES ORDER ====================
export const createSalesInvoiceFromOrder = async (salesOrderId, userId) => {
  try {
    const salesOrder = await prisma.salesOrder.findUnique({
      where: { id: salesOrderId },
      include: {
        customer: true,
        items: {
          include: {
            product: true,
          },
        },
        payment: true,
      },
    });

    if (!salesOrder) {
      throw new Error("Sales order not found");
    }

    // Check if invoice already exists
    const existingInvoice = await prisma.salesInvoice.findFirst({
      where: { salesOrderId: salesOrderId },
    });

    if (existingInvoice) {
      return existingInvoice;
    }

    // Generate invoice number
    const invoiceNumber = await generateSalesInvoiceNumber();

    // Calculate totals
    const subtotal = salesOrder.totalAmount || 0;
    const discount = 0;
    const tax = 0;
    const totalAmount = subtotal - discount + tax;

    // Create invoice
    const invoice = await prisma.salesInvoice.create({
      data: {
        invoiceNumber: invoiceNumber,
        salesOrderId: salesOrder.id,
        customerId: salesOrder.customerId,
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        subtotal: subtotal,
        discount: discount,
        tax: tax,
        totalAmount: totalAmount,
        status: "DRAFT",
        notes: salesOrder.notes || null,
        createdById: userId,
        items: {
          create: salesOrder.items.map((item) => ({
            productId: item.productId,
            description: item.product?.name || "Product",
            quantity: item.quantity,
            unitPrice: item.unitPrice || 0,
            totalPrice: (item.unitPrice || 0) * item.quantity,
          })),
        },
      },
      include: {
        items: true,
        customer: true,
        salesOrder: true,
      },
    });

    await logAction({
      userId: userId,
      action: "CREATE",
      entity: "SalesInvoice",
      entityId: invoice.id,
      module: "Invoices",
      description: `Created sales invoice ${invoice.invoiceNumber} for order ${salesOrder.orderNumber}`,
    });

    return invoice;
  } catch (error) {
    console.error("Error creating sales invoice:", error);
    throw error;
  }
};

// ==================== CREATE PURCHASE INVOICE FROM PURCHASE ORDER ====================
export const createPurchaseInvoiceFromOrder = async (purchaseOrderId, userId) => {
  try {
    const purchaseOrder = await prisma.purchaseOrder.findUnique({
      where: { id: purchaseOrderId },
      include: {
        supplier: true,
        items: {
          include: {
            rawMaterial: true,
          },
        },
        payments: true,
      },
    });

    if (!purchaseOrder) {
      throw new Error("Purchase order not found");
    }

    // Check if invoice already exists
    const existingInvoice = await prisma.purchaseInvoice.findFirst({
      where: { purchaseOrderId: purchaseOrderId },
    });

    if (existingInvoice) {
      return existingInvoice;
    }

    // Generate invoice number
    const invoiceNumber = await generatePurchaseInvoiceNumber();

    // Calculate totals
    const subtotal = purchaseOrder.totalAmount || 0;
    const discount = purchaseOrder.discount || 0;
    const tax = purchaseOrder.tax || 0;
    const totalAmount = subtotal - discount + tax;

    // Create invoice
    const invoice = await prisma.purchaseInvoice.create({
      data: {
        invoiceNumber: invoiceNumber,
        purchaseOrderId: purchaseOrder.id,
        supplierId: purchaseOrder.supplierId,
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        subtotal: subtotal,
        discount: discount,
        tax: tax,
        totalAmount: totalAmount,
        status: "DRAFT",
        notes: purchaseOrder.notes || null,
        createdById: userId,
        items: {
          create: purchaseOrder.items.map((item) => ({
            rawMaterialId: item.rawMaterialId,
            description: item.rawMaterial?.name || "Raw Material",
            quantity: item.quantity,
            unitPrice: item.unitPrice || 0,
            totalPrice: (item.unitPrice || 0) * item.quantity,
          })),
        },
      },
      include: {
        items: true,
        supplier: true,
        purchaseOrder: true,
      },
    });

    await logAction({
      userId: userId,
      action: "CREATE",
      entity: "PurchaseInvoice",
      entityId: invoice.id,
      module: "Invoices",
      description: `Created purchase invoice ${invoice.invoiceNumber} for order ${purchaseOrder.orderNumber}`,
    });

    return invoice;
  } catch (error) {
    console.error("Error creating purchase invoice:", error);
    throw error;
  }
};

// ==================== GET ALL SALES INVOICES ====================
export const getAllSalesInvoices = async (req, res) => {
  try {
    const {
      status,
      search,
      page = 1,
      limit = 20,
    } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    const where = {
      ...(status && status !== 'all' && { status }),
      ...(search && {
        OR: [
          { invoiceNumber: { contains: search, mode: "insensitive" } },
          { customer: { name: { contains: search, mode: "insensitive" } } },
        ],
      }),
    };

    const [invoices, total] = await Promise.all([
      prisma.salesInvoice.findMany({
        where,
        include: {
          customer: {
            select: { id: true, name: true, phone: true },
          },
          salesOrder: {
            select: { id: true, orderNumber: true },
          },
          items: {
            include: {
              product: { select: { id: true, name: true, unit: true } },
            },
          },
          createdBy: {
            select: { id: true, name: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take: Number(limit),
        skip,
      }),
      prisma.salesInvoice.count({ where }),
    ]);

    res.json({
      success: true,
      data: invoices,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error("Error in getAllSalesInvoices:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==================== GET ALL PURCHASE INVOICES ====================
export const getAllPurchaseInvoices = async (req, res) => {
  try {
    const {
      status,
      search,
      page = 1,
      limit = 20,
    } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    const where = {
      ...(status && status !== 'all' && { status }),
      ...(search && {
        OR: [
          { invoiceNumber: { contains: search, mode: "insensitive" } },
          { supplier: { name: { contains: search, mode: "insensitive" } } },
        ],
      }),
    };

    const [invoices, total] = await Promise.all([
      prisma.purchaseInvoice.findMany({
        where,
        include: {
          supplier: {
            select: { id: true, name: true, phone: true },
          },
          purchaseOrder: {
            select: { id: true, orderNumber: true },
          },
          items: {
            include: {
              rawMaterial: { select: { id: true, name: true, unit: true } },
            },
          },
          createdBy: {
            select: { id: true, name: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take: Number(limit),
        skip,
      }),
      prisma.purchaseInvoice.count({ where }),
    ]);

    res.json({
      success: true,
      data: invoices,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error("Error in getAllPurchaseInvoices:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==================== GET SALES INVOICE BY ID ====================
export const getSalesInvoiceById = async (req, res) => {
  try {
    const { id } = req.params;

    const invoice = await prisma.salesInvoice.findUnique({
      where: { id },
      include: {
        customer: true,
        salesOrder: true,
        items: {
          include: {
            product: true,
          },
        },
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: "Sales invoice not found",
      });
    }

    res.json({
      success: true,
      data: invoice,
    });
  } catch (error) {
    console.error("Error in getSalesInvoiceById:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==================== GET PURCHASE INVOICE BY ID ====================
export const getPurchaseInvoiceById = async (req, res) => {
  try {
    const { id } = req.params;

    const invoice = await prisma.purchaseInvoice.findUnique({
      where: { id },
      include: {
        supplier: true,
        purchaseOrder: true,
        items: {
          include: {
            rawMaterial: true,
          },
        },
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: "Purchase invoice not found",
      });
    }

    res.json({
      success: true,
      data: invoice,
    });
  } catch (error) {
    console.error("Error in getPurchaseInvoiceById:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==================== UPDATE SALES INVOICE STATUS ====================
export const updateSalesInvoiceStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ["DRAFT", "SENT", "PAID", "OVERDUE", "CANCELLED"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
      });
    }

    const invoice = await prisma.salesInvoice.update({
      where: { id },
      data: { status },
      include: {
        customer: true,
        salesOrder: true,
      },
    });

    await logAction({
      userId: req.user.id,
      action: "UPDATE_STATUS",
      entity: "SalesInvoice",
      entityId: invoice.id,
      module: "Invoices",
      description: `Updated sales invoice ${invoice.invoiceNumber} status to ${status}`,
      req,
    });

    res.json({
      success: true,
      data: invoice,
    });
  } catch (error) {
    console.error("Error in updateSalesInvoiceStatus:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==================== UPDATE PURCHASE INVOICE STATUS ====================
export const updatePurchaseInvoiceStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ["DRAFT", "SENT", "PAID", "OVERDUE", "CANCELLED"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
      });
    }

    const invoice = await prisma.purchaseInvoice.update({
      where: { id },
      data: { status },
      include: {
        supplier: true,
        purchaseOrder: true,
      },
    });

    await logAction({
      userId: req.user.id,
      action: "UPDATE_STATUS",
      entity: "PurchaseInvoice",
      entityId: invoice.id,
      module: "Invoices",
      description: `Updated purchase invoice ${invoice.invoiceNumber} status to ${status}`,
      req,
    });

    res.json({
      success: true,
      data: invoice,
    });
  } catch (error) {
    console.error("Error in updatePurchaseInvoiceStatus:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==================== DELETE SALES INVOICE ====================
export const deleteSalesInvoice = async (req, res) => {
  try {
    const { id } = req.params;

    const invoice = await prisma.salesInvoice.findUnique({
      where: { id },
      select: { invoiceNumber: true },
    });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: "Sales invoice not found",
      });
    }

    await prisma.salesInvoice.delete({
      where: { id },
    });

    await logAction({
      userId: req.user.id,
      action: "DELETE",
      entity: "SalesInvoice",
      entityId: id,
      module: "Invoices",
      description: `Deleted sales invoice ${invoice.invoiceNumber}`,
      req,
    });

    res.json({
      success: true,
      message: "Sales invoice deleted successfully",
    });
  } catch (error) {
    console.error("Error in deleteSalesInvoice:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==================== DELETE PURCHASE INVOICE ====================
export const deletePurchaseInvoice = async (req, res) => {
  try {
    const { id } = req.params;

    const invoice = await prisma.purchaseInvoice.findUnique({
      where: { id },
      select: { invoiceNumber: true },
    });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: "Purchase invoice not found",
      });
    }

    await prisma.purchaseInvoice.delete({
      where: { id },
    });

    await logAction({
      userId: req.user.id,
      action: "DELETE",
      entity: "PurchaseInvoice",
      entityId: id,
      module: "Invoices",
      description: `Deleted purchase invoice ${invoice.invoiceNumber}`,
      req,
    });

    res.json({
      success: true,
      message: "Purchase invoice deleted successfully",
    });
  } catch (error) {
    console.error("Error in deletePurchaseInvoice:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==================== GET INVOICE STATS ====================
export const getInvoiceStats = async (req, res) => {
  try {
    const [salesTotal, purchaseTotal, salesDraft, salesSent, salesPaid, salesOverdue, purchaseDraft, purchaseSent, purchasePaid, purchaseOverdue] = await Promise.all([
      prisma.salesInvoice.count(),
      prisma.purchaseInvoice.count(),
      prisma.salesInvoice.count({ where: { status: "DRAFT" } }),
      prisma.salesInvoice.count({ where: { status: "SENT" } }),
      prisma.salesInvoice.count({ where: { status: "PAID" } }),
      prisma.salesInvoice.count({ where: { status: "OVERDUE" } }),
      prisma.purchaseInvoice.count({ where: { status: "DRAFT" } }),
      prisma.purchaseInvoice.count({ where: { status: "SENT" } }),
      prisma.purchaseInvoice.count({ where: { status: "PAID" } }),
      prisma.purchaseInvoice.count({ where: { status: "OVERDUE" } }),
    ]);

    const salesAmount = await prisma.salesInvoice.aggregate({
      _sum: { totalAmount: true },
      where: { status: { in: ["SENT", "PAID"] } },
    });

    const purchaseAmount = await prisma.purchaseInvoice.aggregate({
      _sum: { totalAmount: true },
      where: { status: { in: ["SENT", "PAID"] } },
    });

    res.json({
      success: true,
      data: {
        total: salesTotal + purchaseTotal,
        sales: {
          total: salesTotal,
          draft: salesDraft,
          sent: salesSent,
          paid: salesPaid,
          overdue: salesOverdue,
          amount: salesAmount._sum.totalAmount || 0,
        },
        purchase: {
          total: purchaseTotal,
          draft: purchaseDraft,
          sent: purchaseSent,
          paid: purchasePaid,
          overdue: purchaseOverdue,
          amount: purchaseAmount._sum.totalAmount || 0,
        },
      },
    });
  } catch (error) {
    console.error("Error in getInvoiceStats:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};