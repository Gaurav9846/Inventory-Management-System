// src/controllers/customer.controller.js
import prisma from "../config/prisma.js";
import { logAction } from "../utils/auditLog.js";

// GET all customers (with pagination and search)
// src/controllers/customer.controller.js - Updated getAllCustomers

// src/controllers/customer.controller.js - Updated getAllCustomers

// src/controllers/customer.controller.js - Updated getAllCustomers

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
          creditAccount: true,
          _count: { select: { salesOrders: true } },
        },
        orderBy: { name: "asc" },
        take: Number(limit),
        skip,
      }),
      prisma.customer.count({ where }),
    ]);

    // Calculate total paid for each customer
    const customersWithTotalPaid = await Promise.all(
      customers.map(async (customer) => {
        // Get total paid amount from completed payments
        const totalPaidResult = await prisma.payment.aggregate({
          where: {
            salesOrder: {
              customerId: customer.id,
            },
            status: "COMPLETED",
          },
          _sum: {
            amount: true,
          },
        });
        
        const totalPaid = totalPaidResult._sum.amount || 0;
        
        return {
          id: customer.id,
          name: customer.name,
          phone: customer.phone,
          email: customer.email,
          address: customer.address,
          deliveryAddress: customer.deliveryAddress,
          customerType: customer.customerType,
          initials: customer.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2),
          outstandingCredit: customer.creditAccount?.remainingBalance || customer.outstandingCredit || 0,
          totalPaid: totalPaid, // ✅ Add total paid
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

// GET single customer with order and payment history
// src/controllers/customer.controller.js - Updated getCustomerById

export const getCustomerById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        creditAccount: true,
      },
    });
    
    if (!customer) {
      return res.status(404).json({ message: "Customer not found." });
    }
    
    // Get total paid amount
    const totalPaidResult = await prisma.payment.aggregate({
      where: {
        salesOrder: {
          customerId: id,
        },
        status: "COMPLETED",
      },
      _sum: {
        amount: true,
      },
    });
    
    const totalPaid = totalPaidResult._sum.amount || 0;
    
    // Get order history
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
      items: order.items.map(item => ({
        name: item.product.name,
        quantity: item.quantity,
        price: item.unitPrice,
      })),
    }));
    
    // Get payment history
    const payments = await prisma.payment.findMany({
      where: {
        salesOrder: { customerId: id },
        status: "COMPLETED",
      },
      orderBy: { createdAt: "desc" },
      include: { salesOrder: { select: { orderNumber: true } } },
    });
    
    const paymentHistory = payments.map(payment => ({
      type: payment.method,
      date: payment.createdAt,
      amount: payment.amount,
      transactionId: payment.khaltiTransactionId || payment.id,
      orderId: payment.salesOrder.orderNumber,
    }));
    
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
      totalPaid: totalPaid, // ✅ Add total paid
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
    
    await logAction(req.user.id, "CREATE", "Customer", customer.id, { name, phone });
    res.status(201).json(customer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

export const updateCustomer = async (req, res) => {
  try {
    const { name, email, phone, address, deliveryAddress, customerType, creditLimit, notes } = req.body;
    
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
    
    await logAction(req.user.id, "UPDATE", "Customer", customer.id, req.body);
    res.json(customer);
  } catch (err) {
    if (err.code === "P2025") {
      return res.status(404).json({ message: "Customer not found." });
    }
    res.status(500).json({ message: err.message });
  }
};

export const deleteCustomer = async (req, res) => {
  try {
    const orderCount = await prisma.salesOrder.count({
      where: { customerId: req.params.id },
    });
    
    if (orderCount > 0) {
      return res.status(400).json({ message: "Cannot delete customer with existing orders." });
    }
    
    await prisma.customer.delete({ where: { id: req.params.id } });
    await logAction(req.user.id, "DELETE", "Customer", req.params.id);
    res.json({ message: "Customer deleted successfully." });
  } catch (err) {
    if (err.code === "P2025") {
      return res.status(404).json({ message: "Customer not found." });
    }
    res.status(500).json({ message: err.message });
  }
};