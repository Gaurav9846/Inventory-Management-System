// src/controllers/credit.controller.js

import prisma from "../config/prisma.js";
import { logAction } from "../utils/auditLog.js";
import { createNotification } from "./notification.controller.js";
import { generateCreditPaymentNumber } from "../utils/counter.js";

// ==================== GET ALL CREDIT ACCOUNTS ====================
export const getCreditAccounts = async (req, res) => {
  try {
    const { search, status, page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where = {
      ...(status && status !== 'all' && { status }),
      ...(search && {
        customer: {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { phone: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
          ],
        },
      }),
    };

    const [creditAccounts, total] = await Promise.all([
      prisma.creditAccount.findMany({
        where,
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
            orderBy: { paymentDate: "desc" },
            include: {
              paymentDetails: {
                include: {
                  product: { select: { id: true, name: true, unit: true } },
                  salesOrder: { select: { id: true, orderNumber: true } },
                },
              },
              recordedBy: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { dueDate: "asc" },
        take: Number(limit),
        skip,
      }),
      prisma.creditAccount.count({ where }),
    ]);

    const formattedAccounts = creditAccounts.map((account) => {
      const totalInstallments = account.payments.length;
      const lastPayment = account.payments[0] || null;
      
      const productMap = new Map();
      account.payments.forEach(payment => {
        payment.paymentDetails?.forEach(detail => {
          const productName = detail.product?.name || 'Unknown';
          if (!productMap.has(productName)) {
            productMap.set(productName, { 
              name: productName, 
              totalPaid: 0, 
              quantity: 0 
            });
          }
          const p = productMap.get(productName);
          p.totalPaid += detail.totalPrice || 0;
          p.quantity += detail.quantity || 0;
        });
      });

      return {
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
        paymentSummary: {
          totalInstallments,
          lastPaymentDate: lastPayment?.paymentDate || null,
          lastPaymentAmount: lastPayment?.amount || 0,
          productsPurchased: Array.from(productMap.values()),
        },
        recentPayments: account.payments.slice(0, 5),
        createdAt: account.createdAt,
      };
    });

    res.json({
      data: formattedAccounts,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (err) {
    console.error("Error in getCreditAccounts:", err);
    res.status(500).json({ message: err.message });
  }
};

// ==================== GET PAYMENT TRANSACTIONS ====================
export const getPaymentTransactions = async (req, res) => {
  try {
    const { customerId, page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where = {
      status: "COMPLETED",
      ...(customerId && { creditAccount: { customerId } }),
    };

    const [transactions, total] = await Promise.all([
      prisma.creditPayment.findMany({
        where,
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
          paymentDetails: {
            include: {
              product: { select: { id: true, name: true, unit: true } },
              salesOrder: { select: { id: true, orderNumber: true } },
            },
          },
        },
        orderBy: { paymentDate: "desc" },
        take: Number(limit),
        skip,
      }),
      prisma.creditPayment.count({ where }),
    ]);

    const formattedTransactions = transactions.map((t) => {
      const paymentDetails = t.paymentDetails?.map(detail => ({
        productName: detail.product?.name || 'Unknown',
        quantity: detail.quantity,
        unitPrice: detail.unitPrice,
        total: detail.totalPrice,
        orderNumber: detail.salesOrder?.orderNumber,
      })) || [];

      return {
        id: t.id,
        creditPaymentNumber: t.creditPaymentNumber || t.transactionId || t.id.slice(0, 12),
        customer: t.creditAccount.customer.name,
        customerId: t.creditAccount.customer.id,
        amount: t.amount,
        paymentMethod: t.paymentMethod,
        paymentPlatform: t.paymentPlatform,
        platformTransactionId: t.platformTransactionId,
        paymentDate: t.paymentDate,
        notes: t.notes,
        recordedBy: t.recordedBy?.name || "System",
        dateTime: t.createdAt,
        paymentDetails,
        runningBalance: t.creditAccount?.remainingBalance || 0,
        totalPaidToDate: t.creditAccount?.paidAmount || 0,
      };
    });

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

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentPayments = await prisma.creditPayment.aggregate({
      where: {
        status: "COMPLETED",
        paymentDate: { gte: thirtyDaysAgo },
      },
      _sum: { amount: true },
      _count: true,
    });

    const installmentStats = await prisma.creditPayment.groupBy({
      by: ["creditAccountId"],
      where: {
        status: "COMPLETED",
      },
      _count: {
        id: true,
      },
    });

    const avgInstallments = installmentStats.length > 0
      ? Math.round(installmentStats.reduce((sum, s) => sum + s._count.id, 0) / installmentStats.length)
      : 0;

    const fullyPaid = await prisma.creditAccount.count({
      where: { status: "PAID" },
    });

    const partial = await prisma.creditAccount.count({
      where: { status: "PARTIAL" },
    });

    const pending = await prisma.creditAccount.count({
      where: { status: "PENDING" },
    });

    res.json({
      totalRemaining: summary._sum.remainingBalance || 0,
      totalPaid: summary._sum.paidAmount || 0,
      totalCreditOutstanding: summary._sum.totalCredit || 0,
      totalCreditAccounts: summary._count,
      activeCreditAccounts: activeAccounts,
      overdueAccounts,
      recentPaymentCount: recentPayments._count,
      recentPaymentAmount: recentPayments._sum.amount || 0,
      averageInstallments: avgInstallments,
      statusBreakdown: {
        fullyPaid,
        partial,
        pending,
        overdue: overdueAccounts,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

// ==================== GET CUSTOMER LEDGER ====================
export const getCustomerLedger = async (req, res) => {
  try {
    const { customerId } = req.params;

    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        creditAccount: {
          include: {
            payments: {
              orderBy: { paymentDate: "asc" },
              include: {
                recordedBy: { select: { name: true } },
                paymentDetails: {
                  include: {
                    product: { select: { id: true, name: true, unit: true } },
                    salesOrder: { select: { id: true, orderNumber: true, salesInvoice: { select: { invoiceNumber: true } } } },
                  },
                },
              },
            },
          },
        },
        salesOrders: {
          where: {
            status: { not: "CANCELLED" },
          },
          include: {
            items: { include: { product: true } },
            payment: true,
            salesInvoice: { select: { invoiceNumber: true } },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!customer) {
      return res.status(404).json({ message: "Customer not found." });
    }

    const creditAccount = customer.creditAccount;
    
    // Build ledger entries - START WITH ZERO BALANCE
    const ledger = [];
    let runningBalance = 0;

    if (creditAccount) {
      // Add all sales orders (as debit entries)
      const salesOrders = customer.salesOrders.filter(
        order => order.payment?.method === "CREDIT"
      );

      for (const order of salesOrders) {
        runningBalance += order.totalAmount || 0;
        const productNames = order.items.map(item => item.product?.name).join(", ");
        
        ledger.push({
          date: order.createdAt,
          type: "SALE",
          description: `Sale #${order.orderNumber}`,
          reference: order.orderNumber,
          invoiceNumber: order.salesInvoice?.invoiceNumber || null,
          salesOrderId: order.id,
          debit: order.totalAmount || 0,
          credit: 0,
          balance: runningBalance,
          orderId: order.id,
          products: productNames || "N/A",
        });
      }

      // Add all payments (as credit entries)
      const sortedPayments = [...creditAccount.payments].sort(
        (a, b) => new Date(a.paymentDate) - new Date(b.paymentDate)
      );

      sortedPayments.forEach((payment, index) => {
        runningBalance -= payment.amount;
        
        const productDetails = payment.paymentDetails?.map(d => 
          `${d.quantity}x ${d.product?.name}`
        ).join(", ") || "N/A";

        ledger.push({
          date: payment.paymentDate,
          type: "PAYMENT",
          description: payment.notes || `Payment #${index + 1}`,
          reference: payment.creditPaymentNumber || payment.transactionId || payment.id.slice(0, 12),
          creditPaymentNumber: payment.creditPaymentNumber || null,
          paymentId: payment.id,
          debit: 0,
          credit: payment.amount,
          balance: runningBalance,
          paymentMethod: payment.paymentMethod,
          paymentPlatform: payment.paymentPlatform,
          recordedBy: payment.recordedBy?.name,
          products: productDetails,
        });
      });
    }

    // Get summary
    const totalSales = customer.salesOrders
      .filter(order => order.payment?.method === "CREDIT")
      .reduce((sum, order) => sum + (order.totalAmount || 0), 0);
    
    const totalPayments = creditAccount?.payments.reduce(
      (sum, p) => sum + p.amount, 0
    ) || 0;

    res.json({
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.phone,
      customerEmail: customer.email,
      customerAddress: customer.address,
      creditAccountId: creditAccount?.id,
      
      // Summary
      totalSales: totalSales,
      totalPayments: totalPayments,
      outstandingBalance: creditAccount?.remainingBalance || 0,
      
      // Ledger entries
      ledger: ledger,
      
      // Payment schedule
      dueDate: creditAccount?.dueDate || null,
      status: creditAccount?.status || "PENDING",
      totalInstallments: creditAccount?.payments.length || 0,
      
      // Customer info
      customerSince: customer.createdAt,
      totalOrders: customer.salesOrders.length,
    });
  } catch (err) {
    console.error("Error in getCustomerLedger:", err);
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
      paymentPlatform,
      platformTransactionId,
      paymentDate,
      notes,
      salesOrderIds,
    } = req.body;

    // Validation
    if ((!creditAccountId && !customerId) || !amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Credit account ID or customer ID and valid amount are required.",
      });
    }

    // Find credit account
    let creditAccount;
    if (creditAccountId) {
      creditAccount = await prisma.creditAccount.findUnique({
        where: { id: creditAccountId },
        include: { 
          customer: true,
          payments: true,
        },
      });
    } else if (customerId) {
      creditAccount = await prisma.creditAccount.findUnique({
        where: { customerId },
        include: { 
          customer: true,
          payments: true,
        },
      });
    }

    if (!creditAccount) {
      return res.status(404).json({
        success: false,
        message: "No credit account found for this customer.",
      });
    }

    const paymentAmount = Number(amount);
    const installmentNumber = creditAccount.payments.length + 1;

    // Check if payment amount exceeds remaining balance
    if (paymentAmount > creditAccount.remainingBalance) {
      return res.status(400).json({
        success: false,
        message: `Payment amount (₹${paymentAmount.toLocaleString()}) cannot exceed remaining balance of ₹${creditAccount.remainingBalance.toLocaleString()}.`,
      });
    }

    const newPaidAmount = creditAccount.paidAmount + paymentAmount;
    const newRemainingBalance = creditAccount.remainingBalance - paymentAmount;

    // Determine status
    let newStatus;
    if (newRemainingBalance <= 0) {
      newStatus = "PAID";
    } else if (newRemainingBalance === creditAccount.totalCredit) {
      newStatus = "PENDING";
    } else {
      newStatus = "PARTIAL";
    }

    // Check if due date is passed
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(creditAccount.dueDate);
    dueDate.setHours(0, 0, 0, 0);

    if (newRemainingBalance > 0 && dueDate < today && newStatus !== "PAID") {
      newStatus = "OVERDUE";
    }

    // ✅ Generate auto-increment credit payment number
    const creditPaymentNumber = await generateCreditPaymentNumber();
    
    // Keep transactionId for backward compatibility
    const transactionId = creditPaymentNumber;

    // Execute transaction
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

      // Create credit payment record with auto-increment payment number
      const payment = await tx.creditPayment.create({
        data: {
          creditAccountId: creditAccount.id,
          amount: paymentAmount,
          paymentMethod: paymentMethod || "CASH",
          paymentPlatform: paymentPlatform || null,
          platformTransactionId: platformTransactionId || null,
          paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
          transactionId: transactionId,
          creditPaymentNumber: creditPaymentNumber,
          notes: notes || `Installment #${installmentNumber}`,
          status: "COMPLETED",
          recordedById: req.user.id,
        },
      });

      // If salesOrderIds provided, link payment to orders and products
      if (salesOrderIds && salesOrderIds.length > 0) {
        const orderItems = await tx.salesOrderItem.findMany({
          where: {
            salesOrderId: { in: salesOrderIds },
          },
          include: {
            product: true,
            salesOrder: true,
          },
        });

        const totalOrderAmount = orderItems.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
        
        if (totalOrderAmount > 0) {
          for (const item of orderItems) {
            const proportion = (item.totalPrice || 0) / totalOrderAmount;
            const allocatedAmount = paymentAmount * proportion;

            await tx.creditPaymentDetail.create({
              data: {
                paymentId: payment.id,
                salesOrderId: item.salesOrderId,
                productId: item.productId,
                quantity: item.quantity,
                unitPrice: item.unitPrice || 0,
                totalPrice: allocatedAmount,
              },
            });
          }
        }
      }

      // Update customer's outstanding credit
      await tx.customer.update({
        where: { id: creditAccount.customerId },
        data: { outstandingCredit: Math.max(0, newRemainingBalance) },
      });

      return { updated, payment };
    });

    // Enhanced audit log
    await logAction({
      userId: req.user.id,
      action: "RECORD_PAYMENT",
      entity: "CreditAccount",
      entityId: creditAccount.id,
      module: "Credit",
      description: `Recorded credit payment #${creditPaymentNumber} of ₹${paymentAmount.toLocaleString()} for ${creditAccount.customer.name} (Installment #${installmentNumber})`,
      oldValues: {
        remainingBalance: creditAccount.remainingBalance,
        paidAmount: creditAccount.paidAmount,
        status: creditAccount.status,
      },
      newValues: {
        remainingBalance: newRemainingBalance,
        paidAmount: newPaidAmount,
        status: newStatus,
      },
      req,
    });

    // Create notification
    try {
      if (newRemainingBalance <= 0) {
        await createNotification({
          title: `✅ Credit Fully Paid: ${creditAccount.customer.name}`,
          message: `Customer "${creditAccount.customer.name}" has fully paid their credit of ₹${creditAccount.totalCredit.toLocaleString()}. Total installments: ${installmentNumber}. Payment #${creditPaymentNumber}.`,
          type: 'PAYMENT_RECEIVED',
          priority: 'INFORMATION',
          referenceId: creditAccount.customerId,
          referenceType: 'Customer',
          actionUrl: `/customers/${creditAccount.customerId}`,
        });
      } else {
        await createNotification({
          title: `💳 Credit Payment Received: ${creditAccount.customer.name}`,
          message: `Customer "${creditAccount.customer.name}" made payment #${installmentNumber} of ₹${paymentAmount.toLocaleString()}. Remaining: ₹${newRemainingBalance.toLocaleString()}. Payment #${creditPaymentNumber}.`,
          type: 'PAYMENT_RECEIVED',
          priority: 'INFORMATION',
          referenceId: creditAccount.customerId,
          referenceType: 'Customer',
          actionUrl: `/customers/${creditAccount.customerId}`,
        });
      }
    } catch (notificationError) {
      console.error('Failed to create notification:', notificationError);
    }

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
        creditPaymentNumber: result.payment.creditPaymentNumber,
        transactionId: result.payment.transactionId,
        amount: result.payment.amount,
        paymentMethod: result.payment.paymentMethod,
        paymentPlatform: result.payment.paymentPlatform,
        platformTransactionId: result.payment.platformTransactionId,
        paymentDate: result.payment.paymentDate,
        recordedById: result.payment.recordedById,
        recordedByName: req.user.name,
        notes: result.payment.notes,
        installmentNumber: installmentNumber,
        totalInstallments: installmentNumber,
      },
    });
  } catch (err) {
    console.error("Error in recordCreditPayment:", err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// ==================== UPDATE OVERDUE CREDIT ACCOUNTS ====================
export const updateOverdueCreditAccounts = async () => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const overdueAccounts = await prisma.creditAccount.findMany({
      where: {
        status: { not: "PAID" },
        remainingBalance: { gt: 0 },
        dueDate: { lt: today },
      },
      include: { customer: true },
    });

    for (const account of overdueAccounts) {
      await prisma.creditAccount.update({
        where: { id: account.id },
        data: { status: "OVERDUE" },
      });
      
      console.log(`✅ Account ${account.id} marked as OVERDUE`);
      
      try {
        await createNotification({
          title: `⚠️ Credit Overdue: ${account.customer.name}`,
          message: `Credit payment of ₹${account.remainingBalance.toLocaleString()} for customer "${account.customer.name}" is now OVERDUE. Due date was ${account.dueDate.toLocaleDateString()}.`,
          type: 'CREDIT_DUE',
          priority: 'CRITICAL',
          referenceId: account.customerId,
          referenceType: 'Customer',
          actionUrl: `/customers/${account.customerId}/credit`,
        });
      } catch (notificationError) {
        console.error('Failed to create overdue notification:', notificationError);
      }
    }

    return overdueAccounts.length;
  } catch (err) {
    console.error("Error updating overdue accounts:", err);
    return 0;
  }
};

// ==================== CHECK AND CREATE CREDIT DUE NOTIFICATION ====================
export const checkAndCreateCreditDueNotification = async () => {
  try {
    const today = new Date();
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(today.getDate() + 3);
    
    const dueAccounts = await prisma.creditAccount.findMany({
      where: {
        dueDate: { lte: threeDaysFromNow },
        remainingBalance: { gt: 0 },
        status: { not: 'PAID' },
      },
      include: { customer: true },
    });
    
    let createdCount = 0;
    
    for (const account of dueAccounts) {
      const daysUntilDue = Math.ceil((account.dueDate - today) / (1000 * 60 * 60 * 24));
      const priority = daysUntilDue <= 0 ? 'CRITICAL' : 'WARNING';
      const statusText = daysUntilDue <= 0 ? 'overdue' : `due in ${daysUntilDue} days`;
      
      await createNotification({
        title: `💳 Credit Payment ${statusText.toUpperCase()}`,
        message: `Customer "${account.customer.name}" has a credit payment of ₹${account.remainingBalance.toLocaleString()} ${statusText}. Due date: ${account.dueDate.toLocaleDateString()}.`,
        type: 'CREDIT_DUE',
        priority,
        referenceId: account.customerId,
        referenceType: 'Customer',
        actionUrl: `/customers/${account.customerId}/credit`,
      });
      
      createdCount++;
    }
    
    return createdCount;
  } catch (error) {
    console.error('Error checking credit due:', error);
    throw error;
  }
};