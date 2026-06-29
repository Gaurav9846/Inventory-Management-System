// src/controllers/purchaseOrder.controller.js
import prisma from "../config/prisma.js";
import { logAction } from "../utils/auditLog.js";
import { generateOrderNumber } from "../utils/generateOrderNumber.js";
import { uploadBuffer, deleteImage } from "../config/cloudinary.js";

// ==================== GET ALL PURCHASE ORDERS ====================
export const getAllPurchaseOrders = async (req, res) => {
  try {
    const {
      status, supplierId, paymentStatus, search,
      page = 1, limit = 20,
      startDate, endDate,
    } = req.query;
    
    const skip = (Number(page) - 1) * Number(limit);
    
    const where = {
      ...(status && status !== "all" && { status }),
      ...(supplierId && { supplierId }),
      ...(paymentStatus && paymentStatus !== "all" && { paymentStatus }),
      ...(search && {
        OR: [
          { orderNumber: { contains: search, mode: "insensitive" } },
          { supplier: { name: { contains: search, mode: "insensitive" } } },
        ],
      }),
      ...(startDate && { createdAt: { gte: new Date(startDate) } }),
      ...(endDate && { createdAt: { lte: new Date(endDate) } }),
    };
    
    const [orders, total] = await Promise.all([
      prisma.purchaseOrder.findMany({
        where,
        include: {
          supplier: { select: { id: true, name: true, phone: true, email: true } },
          createdBy: { select: { id: true, name: true } },
          approvedBy: { select: { id: true, name: true } },
          items: { 
            include: { rawMaterial: { select: { id: true, name: true, unit: true } } } 
          },
          payments: true,
        },
        orderBy: { createdAt: "desc" },
        take: Number(limit),
        skip,
      }),
      prisma.purchaseOrder.count({ where }),
    ]);
    
    // Calculate summary stats
    const stats = {
      total: await prisma.purchaseOrder.count(),
      pendingApproval: await prisma.purchaseOrder.count({ where: { status: "PENDING" } }),
      approved: await prisma.purchaseOrder.count({ where: { status: "APPROVED" } }),
      received: await prisma.purchaseOrder.count({ where: { status: "RECEIVED" } }),
      cancelled: await prisma.purchaseOrder.count({ where: { status: "CANCELLED" } }),
      partiallyReceived: await prisma.purchaseOrder.count({ where: { status: "PARTIALLY_RECEIVED" } }),
    };
    
    res.json({
      success: true,
      data: orders,
      stats,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (err) {
    console.error("Error in getAllPurchaseOrders:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ==================== GET PURCHASE ORDER BY ID ====================
export const getPurchaseOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const order = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        supplier: true,
        createdBy: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, name: true } },
        items: { 
          include: { 
            rawMaterial: { select: { id: true, name: true, unit: true, currentStock: true, unitCost: true } } 
          } 
        },
        payments: { orderBy: { paymentDate: "desc" } },
        goodsReceivingNotes: {
          include: {
            items: {
              include: { rawMaterial: true },
            },
            receivedBy: { select: { name: true } },
          },
          orderBy: { receivedDate: "desc" },
        },
        invoices: {
          include: { uploadedBy: { select: { name: true } } },
          orderBy: { createdAt: "desc" },
        },
      },
    });
    
    if (!order) {
      return res.status(404).json({ success: false, message: "Purchase order not found" });
    }
    
    res.json({ success: true, data: order });
  } catch (err) {
    console.error("Error in getPurchaseOrderById:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ==================== CREATE PURCHASE ORDER ====================
export const createPurchaseOrder = async (req, res) => {
  try {
    const {
      supplierId, expectedDeliveryDate, warehouseDestination,
      items, notes, discount = 0, tax = 0,
    } = req.body;
    
    if (!supplierId || !items?.length) {
      return res.status(400).json({ success: false, message: "Supplier and at least one item are required" });
    }
    
    // Calculate totals
    let subtotal = 0;
    const processedItems = items.map(item => {
      const total = (item.unitPrice || 0) * item.quantity;
      subtotal += total;
      return {
        rawMaterialId: item.rawMaterialId,
        quantity: Number(item.quantity),
        unitPrice: item.unitPrice ? Number(item.unitPrice) : null,
        totalPrice: total,
      };
    });
    
    const discountAmount = subtotal * (Number(discount) || 0) / 100;
    const taxAmount = (subtotal - discountAmount) * (Number(tax) || 0) / 100;
    const totalAmount = subtotal - discountAmount + taxAmount;
    
    const order = await prisma.purchaseOrder.create({
      data: {
        orderNumber: generateOrderNumber("PO"),
        supplierId,
        expectedDeliveryDate: expectedDeliveryDate ? new Date(expectedDeliveryDate) : null,
        warehouseDestination: warehouseDestination || null,
        notes: notes || null,
        discount: Number(discount) || 0,
        tax: Number(tax) || 0,
        subtotal,
        totalAmount,
        status: "PENDING", // Needs admin approval
        paymentStatus: "UNPAID",
        createdById: req.user.id,
        items: { create: processedItems },
      },
      include: {
        supplier: true,
        items: { include: { rawMaterial: { select: { id: true, name: true } } } },
      },
    });
    
    await logAction(req.user.id, "CREATE", "PurchaseOrder", order.id, { orderNumber: order.orderNumber });
    
    res.status(201).json({ success: true, data: order });
  } catch (err) {
    console.error("Error in createPurchaseOrder:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ==================== UPDATE PURCHASE ORDER STATUS (Admin approval only) ====================
export const updatePurchaseOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const userRole = req.user.role;
    const userId = req.user.id;
    
    const validStatuses = ["APPROVED", "CANCELLED"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: `Invalid status. Only APPROVED or CANCELLED allowed` });
    }
    
    const order = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: { items: { include: { rawMaterial: true } } }
    });
    
    if (!order) {
      return res.status(404).json({ success: false, message: "Purchase order not found" });
    }
    
    let updatedOrder;
    
    // ONLY ADMIN can approve
    if (status === "APPROVED") {
      if (userRole !== "ADMIN") {
        return res.status(403).json({ success: false, message: "Only Admin can approve purchase orders" });
      }
      if (order.status !== "PENDING") {
        return res.status(400).json({ success: false, message: "Only pending orders can be approved" });
      }
      
      updatedOrder = await prisma.purchaseOrder.update({
        where: { id },
        data: { 
          status: "APPROVED",
          approvedById: userId,
          approvedAt: new Date()
        }
      });
    }
    // MANAGER or ADMIN can cancel (if not received)
    else if (status === "CANCELLED") {
      if (order.status === "RECEIVED") {
        return res.status(400).json({ success: false, message: "Cannot cancel a received order" });
      }
      updatedOrder = await prisma.purchaseOrder.update({
        where: { id },
        data: { 
          status: "CANCELLED",
          cancelledById: userId,
          cancelledAt: new Date()
        }
      });
    }
    
    if (updatedOrder) {
      await logAction(req.user.id, "UPDATE_STATUS", "PurchaseOrder", updatedOrder.id, { status });
      res.json({ success: true, data: updatedOrder });
    } else {
      res.status(400).json({ success: false, message: "No changes made" });
    }
  } catch (err) {
    console.error("Error in updatePurchaseOrderStatus:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ==================== ADD PAYMENT ====================
export const addPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, paymentMethod, transactionId, paymentDate, notes } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: "Valid amount is required" });
    }
    
    const order = await prisma.purchaseOrder.findUnique({ 
      where: { id },
      include: { supplier: true }
    });
    
    if (!order) {
      return res.status(404).json({ success: false, message: "Purchase order not found" });
    }
    
    // Calculate total paid so far
    const existingPayments = await prisma.purchaseOrderPayment.aggregate({
      where: { purchaseOrderId: id },
      _sum: { amount: true },
    });
    
    const totalPaidSoFar = existingPayments._sum.amount || 0;
    const newTotalPaid = totalPaidSoFar + amount;
    
    if (newTotalPaid > order.totalAmount) {
      return res.status(400).json({ 
        success: false, 
        message: `Payment amount exceeds remaining balance. Remaining: ${(order.totalAmount - totalPaidSoFar).toFixed(2)}` 
      });
    }
    
    const payment = await prisma.purchaseOrderPayment.create({
      data: {
        purchaseOrderId: id,
        amount: parseFloat(amount),
        paymentMethod,
        transactionId: transactionId || null,
        paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
        recordedById: req.user.id,
        notes: notes || null,
      },
      include: { recordedBy: { select: { name: true } } },
    });
    
    let newPaymentStatus = "PARTIAL";
    if (newTotalPaid >= order.totalAmount) {
      newPaymentStatus = "PAID";
    } else if (newTotalPaid === 0) {
      newPaymentStatus = "UNPAID";
    }
    
    await prisma.purchaseOrder.update({
      where: { id },
      data: { paymentStatus: newPaymentStatus },
    });
    
    await logAction(req.user.id, "ADD_PAYMENT", "PurchaseOrder", id, { amount, paymentMethod });
    
    res.status(201).json({ success: true, data: payment });
  } catch (err) {
    console.error("Error in addPayment:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ==================== RECEIVE GOODS (GRN) - AUTO STATUS UPDATE ====================
export const receiveGoods = async (req, res) => {
  try {
    const { id } = req.params;
    const { items, notes } = req.body;
    
    const order = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        items: { include: { rawMaterial: true } },
        supplier: true,
      },
    });
    
    if (!order) {
      return res.status(404).json({ success: false, message: "Purchase order not found" });
    }
    
    // Check if order is approved before receiving
    if (order.status !== "APPROVED" && order.status !== "PARTIALLY_RECEIVED") {
      return res.status(400).json({ 
        success: false, 
        message: "Order must be approved before receiving goods" 
      });
    }
    
    // Create GRN
    const grn = await prisma.goodsReceivingNote.create({
      data: {
        grnNumber: `GRN-${Date.now()}`,
        purchaseOrderId: id,
        receivedById: req.user.id,
        notes: notes || null,
      },
    });
    
    let totalGoodReceived = 0;
    let totalDamaged = 0;
    
    // Update each item with received quantities
    for (const receivedItem of items) {
      const orderItem = order.items.find(i => i.rawMaterialId === receivedItem.rawMaterialId);
      if (orderItem) {
        const goodQty = receivedItem.receivedQty - (receivedItem.damagedQty || 0);
        
        totalGoodReceived += goodQty;
        totalDamaged += receivedItem.damagedQty || 0;
        
        await prisma.purchaseOrderRawMaterial.update({
          where: { id: orderItem.id },
          data: {
            receivedQty: (orderItem.receivedQty || 0) + receivedItem.receivedQty,
            damagedQty: (orderItem.damagedQty || 0) + (receivedItem.damagedQty || 0),
            remarks: receivedItem.remarks || null,
          },
        });
        
        // Create GRN item
        await prisma.goodsReceivingRawMaterial.create({
          data: {
            grnId: grn.id,
            rawMaterialId: receivedItem.rawMaterialId,
            orderedQty: orderItem.quantity,
            previouslyReceived: orderItem.receivedQty || 0,
            receivedQty: receivedItem.receivedQty,
            damagedQty: receivedItem.damagedQty || 0,
            acceptedQty: goodQty,
            remarks: receivedItem.remarks || null,
          },
        });
        
        // Update stock with good quantity only
        if (goodQty > 0) {
          const newStock = orderItem.rawMaterial.currentStock + goodQty;
          await prisma.$transaction([
            prisma.rawMaterial.update({
              where: { id: orderItem.rawMaterialId },
              data: { currentStock: newStock },
            }),
            prisma.stockTransaction.create({
              data: {
                rawMaterialId: orderItem.rawMaterialId,
                type: "IN",
                quantity: goodQty,
                previousStock: orderItem.rawMaterial.currentStock,
                newStock: newStock,
                note: `GRN ${grn.grnNumber} for PO ${order.orderNumber}`,
                userId: req.user.id,
              },
            }),
          ]);
        }
      }
    }
    
    // AUTO-DETERMINE STATUS BASED ON RECEIVED QUANTITIES
    const allItems = await prisma.purchaseOrderRawMaterial.findMany({
      where: { purchaseOrderId: id },
    });
    
    const allReceived = allItems.every(i => (i.receivedQty || 0) >= i.quantity);
    const anyReceived = allItems.some(i => (i.receivedQty || 0) > 0);
    
    let newStatus = order.status;
    if (allReceived) {
      newStatus = "RECEIVED";
    } else if (anyReceived && !allReceived) {
      newStatus = "PARTIALLY_RECEIVED";
    }
    
    await prisma.purchaseOrder.update({
      where: { id },
      data: { 
        status: newStatus, 
        deliveredAt: new Date(),
        deliveredOnTime: order.expectedDeliveryDate ? new Date() <= new Date(order.expectedDeliveryDate) : null,
      },
    });
    
    await logAction(req.user.id, "RECEIVE_GOODS", "PurchaseOrder", id, { items, newStatus });
    
    res.json({
      success: true,
      message: "Goods received successfully",
      data: { 
        grn, 
        totalGoodReceived, 
        totalDamaged, 
        status: newStatus,
        statusMessage: allReceived ? "All items received. Order marked as RECEIVED." : 
                      anyReceived ? "Partial receipt. Order marked as PARTIALLY RECEIVED." : 
                      "No items received yet."
      },
    });
  } catch (err) {
    console.error("Error in receiveGoods:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ==================== UPLOAD INVOICE ====================
export const uploadInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }
    
    const order = await prisma.purchaseOrder.findUnique({ where: { id } });
    if (!order) {
      return res.status(404).json({ success: false, message: "Purchase order not found" });
    }
    
    // Upload to Cloudinary
    const result = await uploadBuffer(req.file.buffer, "ims/po-invoices");
    
    const invoice = await prisma.purchaseOrderInvoice.create({
      data: {
        purchaseOrderId: id,
        imageUrl: result.url,
        imagePublicId: result.publicId,
        fileName: req.file.originalname,
        fileSize: req.file.size,
        uploadedById: req.user.id,
        notes: notes || null,
      },
      include: {
        uploadedBy: { select: { name: true } },
      },
    });
    
    await logAction(req.user.id, "UPLOAD_INVOICE", "PurchaseOrder", id, { invoiceId: invoice.id });
    
    res.status(201).json({ success: true, data: invoice });
  } catch (err) {
    console.error("Error in uploadInvoice:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ==================== GET INVOICES ====================
export const getInvoices = async (req, res) => {
  try {
    const { id } = req.params;
    
    const invoices = await prisma.purchaseOrderInvoice.findMany({
      where: { purchaseOrderId: id },
      include: {
        uploadedBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    
    res.json({ success: true, data: invoices });
  } catch (err) {
    console.error("Error in getInvoices:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ==================== DELETE INVOICE ====================
export const deleteInvoice = async (req, res) => {
  try {
    const { id, invoiceId } = req.params;
    
    const invoice = await prisma.purchaseOrderInvoice.findUnique({
      where: { id: invoiceId },
    });
    
    if (!invoice) {
      return res.status(404).json({ success: false, message: "Invoice not found" });
    }
    
    // Delete from Cloudinary
    if (invoice.imagePublicId) {
      await deleteImage(invoice.imagePublicId);
    }
    
    await prisma.purchaseOrderInvoice.delete({ where: { id: invoiceId } });
    
    await logAction(req.user.id, "DELETE_INVOICE", "PurchaseOrder", id, { invoiceId });
    
    res.json({ success: true, message: "Invoice deleted successfully" });
  } catch (err) {
    console.error("Error in deleteInvoice:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ==================== DELETE PURCHASE ORDER ====================
export const deletePurchaseOrder = async (req, res) => {
  try {
    const { id } = req.params;
    
    const order = await prisma.purchaseOrder.findUnique({ where: { id } });
    if (!order) {
      return res.status(404).json({ success: false, message: "Purchase order not found" });
    }
    
    if (order.status === "RECEIVED") {
      return res.status(400).json({ success: false, message: "Cannot delete a received purchase order" });
    }
    
    await prisma.purchaseOrderRawMaterial.deleteMany({ where: { purchaseOrderId: id } });
    await prisma.purchaseOrder.delete({ where: { id } });
    
    await logAction(req.user.id, "DELETE", "PurchaseOrder", id);
    
    res.json({ success: true, message: "Purchase order deleted successfully" });
  } catch (err) {
    console.error("Error in deletePurchaseOrder:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ==================== AUTO-CANCEL PENDING ORDERS (Scheduled Job) ====================
export const autoCancelPendingOrders = async () => {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  const pendingOrders = await prisma.purchaseOrder.findMany({
    where: {
      status: "PENDING",
      createdAt: { lt: sevenDaysAgo }
    }
  });
  
  for (const order of pendingOrders) {
    await prisma.purchaseOrder.update({
      where: { id: order.id },
      data: { 
        status: "CANCELLED",
        cancelledAt: new Date()
      }
    });
    console.log(`[AUTO-CANCEL] PO ${order.orderNumber} cancelled due to 7 days pending`);
  }
  
  return pendingOrders.length;
};