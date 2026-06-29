// src/controllers/supplier.controller.js
import prisma from "../config/prisma.js";
import { logAction } from "../utils/auditLog.js";

// ==================== GET ALL SUPPLIERS ====================
export const getAllSuppliers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const { search, category, status } = req.query;

    const where = {
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { contactPerson: { contains: search, mode: "insensitive" } },
          { phone: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
        ],
      }),
      ...(category && { productCategories: { has: category } }),
      ...(status && { status }),
    };

    const [suppliers, totalCount] = await Promise.all([
      prisma.supplier.findMany({
        where,
        include: {
          _count: { select: { purchaseOrders: true, rawMaterials: true } },
          purchaseOrders: {
            where: { status: { not: "CANCELLED" } },
            include: {
              payments: {  // ✅ Include payments to calculate actual paid amount
                select: { amount: true }
              }
            },
          },
        },
        orderBy: { name: "asc" },
        skip,
        take: limit,
      }),
      prisma.supplier.count({ where }),
    ]);

    const enhancedSuppliers = suppliers.map((supplier) => {
      // Calculate total purchases (sum of all PO amounts)
      const totalPurchases = supplier.purchaseOrders.reduce((sum, po) => sum + (po.totalAmount || 0), 0);
      
      // ✅ Calculate total paid by summing all payment amounts across all POs
      let totalPaid = 0;
      for (const po of supplier.purchaseOrders) {
        if (po.payments && po.payments.length > 0) {
          totalPaid += po.payments.reduce((sum, p) => sum + (p.amount || 0), 0);
        }
      }
      
      // Calculate outstanding (total purchases - total paid)
      const outstandingPayments = totalPurchases - totalPaid;
      
      // Calculate completed orders
      const completedOrders = supplier.purchaseOrders.filter(po => po.status === "RECEIVED").length;
      
      // Calculate on-time delivery rate
      const ordersWithDates = supplier.purchaseOrders.filter(po => po.expectedDeliveryDate && po.deliveredAt);
      const onTimeDeliveries = ordersWithDates.filter(po => new Date(po.deliveredAt) <= new Date(po.expectedDeliveryDate)).length;
      const onTimeRate = ordersWithDates.length > 0 ? (onTimeDeliveries / ordersWithDates.length) * 100 : 0;
      
      // Get last order date
      const lastOrder = supplier.purchaseOrders.sort((a, b) => b.createdAt - a.createdAt)[0];
      
      // Calculate payment performance percentage
      const paymentPerformance = totalPurchases > 0 ? (totalPaid / totalPurchases) * 100 : 0;
      
      return {
        id: supplier.id,
        name: supplier.name,
        contactPerson: supplier.contactPerson,
        phone: supplier.phone,
        email: supplier.email,
        address: supplier.address,
        productCategories: supplier.productCategories || [],
        paymentTerms: supplier.paymentTerms || "Net 30",
        status: supplier.status,
        performanceRating: supplier.performanceRating,
        // ✅ Financial fields (now correctly calculated from payments)
        totalPurchases,
        totalPaid,
        outstandingPayments,
        paymentPerformance: Math.round(paymentPerformance),
        // Order statistics
        totalOrders: supplier._count.purchaseOrders,
        totalRawMaterials: supplier._count.rawMaterials,
        completedOrders,
        pendingOrders: supplier.purchaseOrders.filter(po => po.status === "PENDING" || po.status === "DRAFT").length,
        onTimeDeliveryRate: Math.round(onTimeRate),
        lastOrderDate: lastOrder?.createdAt,
        // Bank details
        bankName: supplier.bankName,
        bankAccountNumber: supplier.bankAccountNumber,
        bankAccountName: supplier.bankAccountName,
        bankBranch: supplier.bankBranch,
        notes: supplier.notes,
        createdAt: supplier.createdAt,
      };
    });

    res.json({
      success: true,
      suppliers: enhancedSuppliers,
      pagination: {
        page,
        limit,
        total: totalCount,
        pages: Math.ceil(totalCount / limit),
      },
    });
  } catch (err) {
    console.error("Error in getAllSuppliers:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// Add this to supplier.controller.js - for getting suppliers by raw material category

// ==================== GET SUPPLIERS BY RAW MATERIAL CATEGORY ====================
export const getSuppliersByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    
    const suppliers = await prisma.supplier.findMany({
      where: {
        productCategories: { has: category }
      },
      include: {
        _count: { select: { purchaseOrders: true, rawMaterials: true } },
      },
    });
    
    res.json({
      success: true,
      suppliers,
      category,
    });
  } catch (err) {
    console.error("Error in getSuppliersByCategory:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ==================== GET ALL RAW MATERIAL CATEGORIES ====================
export const getRawMaterialCategories = async (req, res) => {
  try {
    const categories = await prisma.rawMaterialCategory.findMany({
      include: {
        _count: { select: { rawMaterials: true } }
      }
    });
    
    res.json({
      success: true,
      categories,
    });
  } catch (err) {
    console.error("Error in getRawMaterialCategories:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ==================== GET SUPPLIER STATS ====================
export const getSupplierStats = async (req, res) => {
  try {
    const [totalSuppliers, activeSuppliers, totalOutstanding, totalPurchasesAll, totalPaidAll] = await Promise.all([
      prisma.supplier.count(),
      prisma.supplier.count({ where: { status: "Active" } }),
      // Outstanding = total purchases - total paid across all suppliers
      prisma.purchaseOrder.aggregate({
        _sum: { totalAmount: true },
      }),
      prisma.purchaseOrder.aggregate({
        _sum: { totalAmount: true },
      }),
      prisma.purchaseOrderPayment.aggregate({
        _sum: { amount: true },
      }),
    ]);
    
    const totalPurchases = totalPurchasesAll._sum.totalAmount || 0;
    const totalPaid = totalPaidAll._sum.amount || 0;
    const outstanding = totalPurchases - totalPaid;
    
    const pendingApproval = await prisma.purchaseOrder.count({ 
      where: { status: "PENDING" } 
    });
    const onTrack = await prisma.purchaseOrder.count({ 
      where: { status: "APPROVED" } 
    });
    const lowVolume = await prisma.purchaseOrder.count({ 
      where: { totalAmount: { lt: 5000 } } 
    });
    
    res.json({
      success: true,
      stats: {
        totalSuppliers,
        activeSuppliers,
        pendingPurchaseOrders: pendingApproval,
        outstandingPayments: outstanding,
        totalPurchasesAll: totalPurchases,
        totalPaidAll: totalPaid,
        pendingApproval,
        onTrack,
        lowVolume,
      },
    });
  } catch (err) {
    console.error("Error in getSupplierStats:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ==================== GET SUPPLIER BY ID ====================
export const getSupplierById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const supplier = await prisma.supplier.findUnique({
      where: { id },
      include: {
        rawMaterials: { 
          select: { id: true, name: true, currentStock: true, unit: true, unitCost: true, category: true, reorderLevel: true } 
        },
        purchaseOrders: {
          include: {
            items: { 
              include: { rawMaterial: { select: { id: true, name: true, unit: true } } } 
            },
            createdBy: { select: { id: true, name: true } },
            payments: {  // ✅ Include payments
              include: { recordedBy: { select: { name: true } } },
              orderBy: { paymentDate: "desc" },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });
    
    if (!supplier) {
      return res.status(404).json({ success: false, message: "Supplier not found" });
    }
    
    // ✅ Calculate financial summary from actual payments
    let totalPurchases = 0;
    let totalPaid = 0;
    let totalOrders = 0;
    let completedOrders = 0;
    
    for (const po of supplier.purchaseOrders) {
      totalPurchases += po.totalAmount || 0;
      totalOrders++;
      
      if (po.status === "RECEIVED") completedOrders++;
      
      // ✅ Calculate paid amount from payments (not from PO paymentStatus)
      if (po.payments && po.payments.length > 0) {
        totalPaid += po.payments.reduce((sum, p) => sum + (p.amount || 0), 0);
      }
    }
    
    // ✅ Calculate outstanding
    const outstandingPayments = totalPurchases - totalPaid;
    
    // Calculate on-time delivery rate
    const ordersWithDates = supplier.purchaseOrders.filter(po => po.expectedDeliveryDate && po.deliveredAt);
    const onTimeDeliveries = ordersWithDates.filter(po => new Date(po.deliveredAt) <= new Date(po.expectedDeliveryDate)).length;
    const onTimeRate = ordersWithDates.length > 0 ? (onTimeDeliveries / ordersWithDates.length) * 100 : 0;
    
    // Monthly purchase trend with paid amounts
    const monthlyTrend = {};
    supplier.purchaseOrders.forEach(po => {
      const month = po.createdAt.toLocaleString('default', { month: 'short', year: 'numeric' });
      if (!monthlyTrend[month]) {
        monthlyTrend[month] = { month, amount: 0, orders: 0, paid: 0 };
      }
      monthlyTrend[month].amount += po.totalAmount || 0;
      monthlyTrend[month].orders++;
      
      // ✅ Calculate paid for this month from payments
      if (po.payments && po.payments.length > 0) {
        const monthPaid = po.payments.reduce((sum, p) => sum + (p.amount || 0), 0);
        monthlyTrend[month].paid += monthPaid;
      }
    });
    
    const averageOrderValue = totalOrders > 0 ? totalPurchases / totalOrders : 0;
    const paymentPerformance = totalPurchases > 0 ? (totalPaid / totalPurchases) * 100 : 0;
    
    res.json({
      success: true,
      supplier: {
        id: supplier.id,
        name: supplier.name,
        contactPerson: supplier.contactPerson,
        phone: supplier.phone,
        email: supplier.email,
        address: supplier.address,
        productCategories: supplier.productCategories || [],
        paymentTerms: supplier.paymentTerms,
        status: supplier.status,
        performanceRating: supplier.performanceRating,
        bankName: supplier.bankName,
        bankAccountNumber: supplier.bankAccountNumber,
        bankAccountName: supplier.bankAccountName,
        bankBranch: supplier.bankBranch,
        notes: supplier.notes,
        rawMaterials: supplier.rawMaterials,
        createdAt: supplier.createdAt,
      },
      insights: {
        totalOrders,
        completedOrders,
        pendingOrders: totalOrders - completedOrders,
        totalPurchases,
        totalPaid,        // ✅ From actual payments
        outstandingPayments,
        paymentPerformance: Math.round(paymentPerformance),
        onTimeDeliveryRate: Math.round(onTimeRate),
        averageOrderValue,
        monthlyTrend: Object.values(monthlyTrend),
      },
      purchaseOrders: supplier.purchaseOrders.map(po => ({
        id: po.id,
        poNumber: po.orderNumber,
        date: po.createdAt,
        expectedDeliveryDate: po.expectedDeliveryDate,
        totalAmount: po.totalAmount,
        status: po.status,
        paymentStatus: po.paymentStatus,
        items: po.items.map(item => ({
          name: item.rawMaterial?.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: (item.unitPrice || 0) * item.quantity,
        })),
        // ✅ Include payments in response
        payments: po.payments.map(p => ({
          id: p.id,
          amount: p.amount,
          method: p.paymentMethod,
          date: p.paymentDate,
          transactionId: p.transactionId,
          recordedBy: p.recordedBy?.name,
        })),
      })),
    });
  } catch (err) {
    console.error("Error in getSupplierById:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ==================== CREATE SUPPLIER ====================
export const createSupplier = async (req, res) => {
  try {
    const {
      name, contactPerson, email, phone, address,
      productCategories, paymentTerms, status, performanceRating,
      bankName, bankAccountNumber, bankAccountName, bankBranch, notes,
    } = req.body;
    
    if (!name || !phone) {
      return res.status(400).json({ success: false, message: "Name and phone are required" });
    }
    
    const supplier = await prisma.supplier.create({
      data: {
        name,
        contactPerson: contactPerson || null,
        email: email || null,
        phone,
        address: address || null,
        productCategories: productCategories || [],
        paymentTerms: paymentTerms || "Net 30",
        status: status || "Active",
        performanceRating: performanceRating || 4.0,
        bankName: bankName || null,
        bankAccountNumber: bankAccountNumber || null,
        bankAccountName: bankAccountName || null,
        bankBranch: bankBranch || null,
        notes: notes || null,
      },
    });
    
    await logAction(req.user.id, "CREATE", "Supplier", supplier.id, { name, phone });
    
    res.status(201).json({ success: true, supplier });
  } catch (err) {
    console.error("Error in createSupplier:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ==================== UPDATE SUPPLIER ====================
export const updateSupplier = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name, contactPerson, email, phone, address,
      productCategories, paymentTerms, status, performanceRating,
      bankName, bankAccountNumber, bankAccountName, bankBranch, notes,
    } = req.body;
    
    const supplier = await prisma.supplier.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(contactPerson !== undefined && { contactPerson }),
        ...(email !== undefined && { email }),
        ...(phone !== undefined && { phone }),
        ...(address !== undefined && { address }),
        ...(productCategories !== undefined && { productCategories }),
        ...(paymentTerms !== undefined && { paymentTerms }),
        ...(status !== undefined && { status }),
        ...(performanceRating !== undefined && { performanceRating }),
        ...(bankName !== undefined && { bankName }),
        ...(bankAccountNumber !== undefined && { bankAccountNumber }),
        ...(bankAccountName !== undefined && { bankAccountName }),
        ...(bankBranch !== undefined && { bankBranch }),
        ...(notes !== undefined && { notes }),
      },
    });
    
    await logAction(req.user.id, "UPDATE", "Supplier", supplier.id, req.body);
    
    res.json({ success: true, supplier });
  } catch (err) {
    if (err.code === "P2025") {
      return res.status(404).json({ success: false, message: "Supplier not found" });
    }
    console.error("Error in updateSupplier:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ==================== DELETE SUPPLIER ====================
export const deleteSupplier = async (req, res) => {
  try {
    const { id } = req.params;
    
    const hasOrders = await prisma.purchaseOrder.count({ where: { supplierId: id } });
    if (hasOrders > 0) {
      return res.status(400).json({ 
        success: false, 
        message: "Cannot delete supplier with existing purchase orders. Deactivate instead." 
      });
    }
    
    await prisma.supplier.delete({ where: { id } });
    await logAction(req.user.id, "DELETE", "Supplier", id);
    
    res.json({ success: true, message: "Supplier deleted successfully" });
  } catch (err) {
    if (err.code === "P2025") {
      return res.status(404).json({ success: false, message: "Supplier not found" });
    }
    console.error("Error in deleteSupplier:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};