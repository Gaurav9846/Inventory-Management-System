// src/controllers/customer.controller.js

import prisma from "../config/prisma.js";
import { logAction } from "../utils/auditLog.js";

// ==================== GET ALL CUSTOMERS ====================
export const getAllCustomers = async (req, res) => {
  try {
    const { search, page = 1, limit = 10 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    
    const where = search ? {
      OR: [
        { name: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ],
    } : {};

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        include: {
          creditAccount: {
            include: {
              payments: {
                where: { status: "COMPLETED" },
              },
            },
          },
          _count: { select: { salesOrders: true } },
        },
        orderBy: { name: "asc" },
        take: Number(limit),
        skip,
      }),
      prisma.customer.count({ where }),
    ]);

    const customersWithTotalPaid = await Promise.all(
      customers.map(async (customer) => {
        // ✅ Calculate total paid from CREDIT PAYMENTS (installments)
        let totalPaidFromCredit = 0;
        let totalCreditGiven = 0;
        
        if (customer.creditAccount) {
          // Sum all completed credit payments
          totalPaidFromCredit = customer.creditAccount.payments.reduce(
            (sum, payment) => sum + (payment.amount || 0), 0
          );
          
          // Total credit given = total credit amount
          totalCreditGiven = customer.creditAccount.totalCredit || 0;
        }
        
        // ✅ Get completed cash/online payments from sales orders
        const totalPaidResult = await prisma.payment.aggregate({
          where: {
            salesOrder: {
              customerId: customer.id,
            },
            status: "COMPLETED",
            method: {
              not: "CREDIT",
            },
          },
          _sum: {
            amount: true,
          },
        });
        
        const cashOnlinePaid = totalPaidResult._sum.amount || 0;
        
        // ✅ TOTAL PAID = Cash/Online payments + Credit payments (installments)
        const totalPaid = cashOnlinePaid + totalPaidFromCredit;
        
        // ✅ OUTSTANDING CREDIT = Total credit given - Total credit paid
        const outstandingCredit = customer.creditAccount?.remainingBalance || customer.outstandingCredit || 0;
        
        return {
          id: customer.id,
          name: customer.name,
          phone: customer.phone,
          email: customer.email,
          address: customer.address,
          deliveryAddress: customer.deliveryAddress,
          customerType: customer.customerType,
          initials: customer.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2),
          outstandingCredit: outstandingCredit,
          totalPaid: totalPaid,
          totalOrders: customer._count.salesOrders,
          creditLimit: customer.creditLimit,
          createdAt: customer.createdAt,
        };
      })
    );

    res.json({
      customers: customersWithTotalPaid,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

// ==================== GET SINGLE CUSTOMER ====================
export const getCustomerById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        creditAccount: {
          include: {
            payments: {
              orderBy: { paymentDate: "desc" },
              include: {
                recordedBy: { select: { name: true } },
                paymentDetails: {
                  include: {
                    product: { select: { id: true, name: true, unit: true } },
                    salesOrder: { select: { id: true, orderNumber: true } },
                  },
                },
              },
            },
          },
        },
      },
    });
    
    if (!customer) {
      return res.status(404).json({ message: "Customer not found." });
    }
    
    // ✅ Calculate total paid from credit payments
    let totalPaidFromCredit = 0;
    if (customer.creditAccount) {
      totalPaidFromCredit = customer.creditAccount.payments.reduce(
        (sum, payment) => sum + (payment.amount || 0), 0
      );
    }
    
    // ✅ Get completed cash/online payments
    const totalPaidResult = await prisma.payment.aggregate({
      where: {
        salesOrder: {
          customerId: id,
        },
        status: "COMPLETED",
        method: {
          not: "CREDIT",
        },
      },
      _sum: {
        amount: true,
      },
    });
    
    const cashOnlinePaid = totalPaidResult._sum.amount || 0;
    const totalPaid = cashOnlinePaid + totalPaidFromCredit;
    
    const orders = await prisma.salesOrder.findMany({
      where: { customerId: id },
      orderBy: { createdAt: "desc" },
      include: {
        items: { include: { product: true } },
        payment: true,
        delivery: true,
      },
    });
    
    const orderHistory = orders.map(order => ({
      id: order.orderNumber,
      date: order.createdAt,
      amount: order.totalAmount,
      status: order.status,
      deliveryStatus: order.delivery?.status || "PENDING",
      paymentMethod: order.payment?.method || "N/A",
      paymentStatus: order.payment?.status || "N/A",
      items: order.items.map(item => ({
        name: item.product.name,
        quantity: item.quantity,
        price: item.unitPrice,
      })),
    }));
    
    // ✅ Credit payment history
    const creditPaymentHistory = customer.creditAccount?.payments.map(payment => ({
      type: "CREDIT_PAYMENT",
      date: payment.paymentDate,
      amount: payment.amount,
      transactionId: payment.transactionId || payment.id,
      method: payment.paymentMethod,
      platform: payment.paymentPlatform,
      notes: payment.notes,
      orderId: payment.paymentDetails?.map(d => d.salesOrder?.orderNumber).join(", ") || "N/A",
      products: payment.paymentDetails?.map(d => `${d.quantity}x ${d.product?.name}`).join(", ") || "N/A",
    })) || [];
    
    // ✅ Cash/Online payment history
    const cashOnlinePayments = await prisma.payment.findMany({
      where: {
        salesOrder: { customerId: id },
        status: "COMPLETED",
        method: {
          not: "CREDIT",
        },
      },
      orderBy: { createdAt: "desc" },
      include: { salesOrder: { select: { orderNumber: true } } },
    });
    
    const cashOnlinePaymentHistory = cashOnlinePayments.map(payment => ({
      type: payment.method,
      date: payment.createdAt,
      amount: payment.amount,
      transactionId: payment.khaltiTransactionId || payment.id,
      orderId: payment.salesOrder.orderNumber,
    }));
    
    // ✅ Combine payment histories
    const paymentHistory = [...creditPaymentHistory, ...cashOnlinePaymentHistory].sort(
      (a, b) => new Date(b.date) - new Date(a.date)
    );
    
    res.json({
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      address: customer.address,
      deliveryAddress: customer.deliveryAddress,
      notes: customer.notes,
      customerType: customer.customerType,
      outstandingCredit: customer.creditAccount?.remainingBalance || customer.outstandingCredit || 0,
      totalPaid: totalPaid,
      creditLimit: customer.creditLimit || 0,
      creditAccount: customer.creditAccount,
      orderHistory,
      paymentHistory,
      createdAt: customer.createdAt,
    });
    
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

// ==================== CREATE CUSTOMER ====================
export const createCustomer = async (req, res) => {
  try {
    const { name, email, phone, address, deliveryAddress, customerType, creditLimit, notes } = req.body;
    
    if (!name || !phone) {
      return res.status(400).json({ message: "Name and phone are required." });
    }
    
    const customer = await prisma.customer.create({
      data: {
        name,
        email,
        phone,
        address,
        deliveryAddress,
        customerType: customerType || "REGULAR",
        creditLimit: creditLimit ? Number(creditLimit) : 0,
        notes,
        outstandingCredit: 0,
      },
    });
    
    await logAction({
      userId: req.user.id,
      action: "CREATE",
      entity: "Customer",
      entityId: customer.id,
      module: "Customers",
      description: `Created customer: ${customer.name}`,
      newValues: { name: customer.name, phone: customer.phone, email: customer.email, customerType: customer.customerType },
      req,
    });
    
    res.status(201).json(customer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

// ==================== UPDATE CUSTOMER ====================
export const updateCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, address, deliveryAddress, customerType, creditLimit, notes } = req.body;
    
    const oldCustomer = await prisma.customer.findUnique({
      where: { id },
      select: { name: true, email: true, phone: true, customerType: true, creditLimit: true }
    });
    
    if (!oldCustomer) {
      return res.status(404).json({ message: "Customer not found." });
    }
    
    const customer = await prisma.customer.update({
      where: { id: req.params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(email !== undefined && { email }),
        ...(phone !== undefined && { phone }),
        ...(address !== undefined && { address }),
        ...(deliveryAddress !== undefined && { deliveryAddress }),
        ...(customerType !== undefined && { customerType }),
        ...(creditLimit !== undefined && { creditLimit: Number(creditLimit) }),
        ...(notes !== undefined && { notes }),
      },
    });
    
    await logAction({
      userId: req.user.id,
      action: "UPDATE",
      entity: "Customer",
      entityId: customer.id,
      module: "Customers",
      description: `Updated customer: ${customer.name}`,
      oldValues: { 
        name: oldCustomer.name, 
        phone: oldCustomer.phone, 
        email: oldCustomer.email,
        customerType: oldCustomer.customerType,
        creditLimit: oldCustomer.creditLimit,
      },
      newValues: { 
        name: customer.name, 
        phone: customer.phone, 
        email: customer.email,
        customerType: customer.customerType,
        creditLimit: customer.creditLimit,
      },
      req,
    });
    
    res.json(customer);
  } catch (err) {
    if (err.code === "P2025") {
      return res.status(404).json({ message: "Customer not found." });
    }
    res.status(500).json({ message: err.message });
  }
};

// ==================== DELETE CUSTOMER ====================
export const deleteCustomer = async (req, res) => {
  try {
    const orderCount = await prisma.salesOrder.count({
      where: { customerId: req.params.id },
    });
    
    if (orderCount > 0) {
      return res.status(400).json({ message: "Cannot delete customer with existing orders." });
    }
    
    const customer = await prisma.customer.findUnique({
      where: { id: req.params.id },
      select: { name: true }
    });
    
    await prisma.customer.delete({ where: { id: req.params.id } });
    
    await logAction({
      userId: req.user.id,
      action: "DELETE",
      entity: "Customer",
      entityId: req.params.id,
      module: "Customers",
      description: `Deleted customer: ${customer?.name}`,
      req,
    });
    
    res.json({ message: "Customer deleted successfully." });
  } catch (err) {
    if (err.code === "P2025") {
      return res.status(404).json({ message: "Customer not found." });
    }
    res.status(500).json({ message: err.message });
  }
};