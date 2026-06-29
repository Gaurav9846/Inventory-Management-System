// src/controllers/credit.controller.js
import prisma from "../config/prisma.js";
import { logAction } from "../utils/auditLog.js";

// ==================== GET ALL CREDIT ACCOUNTS ====================
export const getCreditAccounts = async (req, res) => {
  try {
    const creditAccounts = await prisma.creditAccount.findMany({
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            creditLimit: true,
            address: true,
          },
        },
        payments: {
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },
      orderBy: { dueDate: "asc" },
    });

    const formattedAccounts = creditAccounts.map(account => ({
      id: account.id,
      customerId: account.customer.id,
      customerName: account.customer.name,
      phone: account.customer.phone,
      email: account.customer.email,
      address: account.customer.address,
      totalCredit: account.totalCredit,
      paidAmount: account.paidAmount,
      remainingBalance: account.remainingBalance,
      dueDate: account.dueDate,
      status: account.status,
      creditLimit: account.customer.creditLimit || 0,
      availableCredit: (account.customer.creditLimit || 0) - account.remainingBalance,
      recentPayments: account.payments,
      createdAt: account.createdAt,
    }));

    res.json(formattedAccounts);
  } catch (err) {
    console.error("Error in getCreditAccounts:", err);
    res.status(500).json({ message: err.message });
  }
};

// ==================== GET PAYMENT TRANSACTIONS ====================
export const getPaymentTransactions = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const [transactions, total] = await Promise.all([
      prisma.creditPayment.findMany({
        where: { status: "COMPLETED" },
        include: {
          creditAccount: {
            include: {
              customer: {
                select: { id: true, name: true, phone: true },
              },
            },
          },
          recordedBy: {
            select: { id: true, name: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take: Number(limit),
        skip,
      }),
      prisma.creditPayment.count({ where: { status: "COMPLETED" } }),
    ]);

    const formattedTransactions = transactions.map(t => ({
      id: t.id,
      transactionId: t.transactionId || t.id.slice(0, 12),
      customer: t.creditAccount.customer.name,
      customerId: t.creditAccount.customer.id,
      amount: t.amount,
      paymentMethod: t.paymentMethod,
      paymentDate: t.paymentDate,
      notes: t.notes,
      recordedBy: t.recordedBy?.name || "System",
      dateTime: t.createdAt,
    }));

    res.json({
      data: formattedTransactions,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("Error in getPaymentTransactions:", err);
    res.status(500).json({ message: err.message });
  }
};

// ==================== GET CREDIT SUMMARY ====================
export const getCreditSummary = async (req, res) => {
  try {
    const summary = await prisma.creditAccount.aggregate({
      _sum: {
        totalCredit: true,
        paidAmount: true,
        remainingBalance: true,
      },
      _count: true,
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const overdueAccounts = await prisma.creditAccount.count({
      where: {
        dueDate: { lt: today },
        remainingBalance: { gt: 0 },
      },
    });

    const activeAccounts = await prisma.creditAccount.count({
      where: {
        remainingBalance: { gt: 0 },
      },
    });

    res.json({
      totalRemaining: summary._sum.remainingBalance || 0,
      totalPaid: summary._sum.paidAmount || 0,
      totalCreditOutstanding: summary._sum.totalCredit || 0,
      totalCreditAccounts: summary._count,
      activeCreditAccounts: activeAccounts,
      overdueAccounts,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

// ==================== GET CUSTOMER CREDIT INFO ====================
export const getCustomerCreditInfo = async (req, res) => {
  try {
    const { customerId } = req.params;

    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: { 
        creditAccount: {
          include: {
            payments: {
              orderBy: { createdAt: "desc" },
            },
          },
        },
      },
    });

    if (!customer) {
      return res.status(404).json({ message: "Customer not found." });
    }

    const creditAccount = customer.creditAccount;

    res.json({
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.phone,
      hasCreditAccount: !!creditAccount,
      creditAccountId: creditAccount?.id,
      totalCredit: creditAccount?.totalCredit || 0,
      paidAmount: creditAccount?.paidAmount || 0,
      remainingBalance: creditAccount?.remainingBalance || customer.outstandingCredit || 0,
      dueDate: creditAccount?.dueDate || null,
      status: creditAccount?.status || "PENDING",
      creditLimit: customer.creditLimit || 0,
      availableCredit: (customer.creditLimit || 0) - (creditAccount?.remainingBalance || customer.outstandingCredit || 0),
      paymentHistory: creditAccount?.payments || [],
    });
  } catch (err) {
    console.error("Error in getCustomerCreditInfo:", err);
    res.status(500).json({ message: err.message });
  }
};

// ==================== RECORD CREDIT PAYMENT ====================
export const recordCreditPayment = async (req, res) => {
  try {
    const { 
      creditAccountId, 
      customerId, 
      amount, 
      paymentMethod, 
      paymentDate, 
      notes, 
      transactionId 
    } = req.body;

    // Validation
    if ((!creditAccountId && !customerId) || !amount || amount <= 0) {
      return res.status(400).json({ 
        success: false,
        message: "Credit account ID or customer ID and valid amount are required." 
      });
    }

    // Find credit account
    let creditAccount;
    if (creditAccountId) {
      creditAccount = await prisma.creditAccount.findUnique({
        where: { id: creditAccountId },
        include: { customer: true },
      });
    } else if (customerId) {
      creditAccount = await prisma.creditAccount.findUnique({
        where: { customerId },
        include: { customer: true },
      });
    }

    if (!creditAccount) {
      return res.status(404).json({ 
        success: false,
        message: "No credit account found for this customer." 
      });
    }

    const paymentAmount = Number(amount);
    
    // Check if payment amount exceeds remaining balance
    if (paymentAmount > creditAccount.remainingBalance) {
      return res.status(400).json({
        success: false,
        message: `Payment amount cannot exceed remaining balance of ${creditAccount.remainingBalance}.`,
      });
    }

    const newPaidAmount = creditAccount.paidAmount + paymentAmount;
    const newRemainingBalance = creditAccount.remainingBalance - paymentAmount;
    
    // Determine new status
    let newStatus = "PARTIAL";
    if (newRemainingBalance <= 0) {
      newStatus = "PAID";
    } else if (newRemainingBalance === creditAccount.totalCredit) {
      newStatus = "PENDING";
    } else {
      newStatus = "PARTIAL";
    }

    // Check if due date is passed and still has balance
    const today = new Date();
    if (newRemainingBalance > 0 && creditAccount.dueDate < today && newStatus !== "PAID") {
      newStatus = "OVERDUE";
    }

    // Start transaction to update credit account and create payment record
    const result = await prisma.$transaction(async (tx) => {
      // Update credit account
      const updated = await tx.creditAccount.update({
        where: { id: creditAccount.id },
        data: {
          paidAmount: newPaidAmount,
          remainingBalance: newRemainingBalance,
          status: newStatus,
        },
      });

      // Create payment record
      const payment = await tx.creditPayment.create({
        data: {
          creditAccountId: creditAccount.id,
          amount: paymentAmount,
          paymentMethod,
          paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
          notes: notes || null,
          transactionId: transactionId || `CREDIT-PAY-${Date.now()}`,
          status: "COMPLETED",
          recordedById: req.user.id,
        },
      });

      // Update customer's outstanding credit
      await tx.customer.update({
        where: { id: creditAccount.customerId },
        data: { outstandingCredit: Math.max(0, newRemainingBalance) },
      });

      return { updated, payment };
    });

    await logAction(req.user.id, "RECORD_PAYMENT", "CreditAccount", creditAccount.id, {
      amount: paymentAmount,
      previousBalance: creditAccount.remainingBalance,
      newBalance: newRemainingBalance,
      paymentMethod,
    });

    res.json({
      success: true,
      message: newRemainingBalance <= 0 ? "Credit fully paid!" : "Payment recorded successfully",
      creditAccount: {
        id: result.updated.id,
        totalCredit: result.updated.totalCredit,
        paidAmount: result.updated.paidAmount,
        remainingBalance: result.updated.remainingBalance,
        status: result.updated.status,
      },
      payment: {
        id: result.payment.id,
        amount: result.payment.amount,
        paymentMethod: result.payment.paymentMethod,
        paymentDate: result.payment.paymentDate,
        transactionId: result.payment.transactionId,
      },
    });
    
  } catch (err) {
    console.error("Error in recordCreditPayment:", err);
    res.status(500).json({ 
      success: false,
      message: err.message 
    });
  }
};