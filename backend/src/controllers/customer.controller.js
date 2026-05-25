// src/controllers/customer.controller.js
import prisma from "../config/prisma.js";
import { logAction } from "../utils/auditLog.js";

export const getAllCustomers = async (req, res) => {
  try {
    const { search } = req.query;
    const customers = await prisma.customer.findMany({
      where: search ? {
        OR: [
          { name:  { contains: search, mode: "insensitive" } },
          { phone: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
        ],
      } : undefined,
      include: { _count: { select: { salesOrders: true } } },
      orderBy: { name: "asc" },
    });
    res.json(customers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getCustomerById = async (req, res) => {
  try {
    const customer = await prisma.customer.findUnique({
      where:   { id: req.params.id },
      include: {
        salesOrders: {
          take: 10, orderBy: { createdAt: "desc" },
          select: { id: true, orderNumber: true, status: true, totalAmount: true, createdAt: true },
        },
      },
    });
    if (!customer) return res.status(404).json({ message: "Customer not found." });
    res.json(customer);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const createCustomer = async (req, res) => {
  try {
    const { name, email, phone, address, deliveryAddress, notes } = req.body;
    if (!name || !phone)
      return res.status(400).json({ message: "Name and phone are required." });

    const customer = await prisma.customer.create({
      data: { name, email, phone, address, deliveryAddress, notes },
    });
    await logAction(req.user.id, "CREATE", "Customer", customer.id, { name });
    res.status(201).json(customer);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const updateCustomer = async (req, res) => {
  try {
    const { name, email, phone, address, deliveryAddress, notes, outstandingBalance } = req.body;
    const customer = await prisma.customer.update({
      where: { id: req.params.id },
      data: {
        ...(name               !== undefined && { name }),
        ...(email              !== undefined && { email }),
        ...(phone              !== undefined && { phone }),
        ...(address            !== undefined && { address }),
        ...(deliveryAddress    !== undefined && { deliveryAddress }),
        ...(notes              !== undefined && { notes }),
        ...(outstandingBalance !== undefined && { outstandingBalance: Number(outstandingBalance) }),
      },
    });
    await logAction(req.user.id, "UPDATE", "Customer", customer.id, req.body);
    res.json(customer);
  } catch (err) {
    if (err.code === "P2025") return res.status(404).json({ message: "Customer not found." });
    res.status(500).json({ message: err.message });
  }
};

export const deleteCustomer = async (req, res) => {
  try {
    await prisma.customer.delete({ where: { id: req.params.id } });
    await logAction(req.user.id, "DELETE", "Customer", req.params.id);
    res.json({ message: "Customer deleted." });
  } catch (err) {
    if (err.code === "P2025") return res.status(404).json({ message: "Customer not found." });
    if (err.code === "P2003") return res.status(400).json({ message: "Customer has related orders." });
    res.status(500).json({ message: err.message });
  }
};
