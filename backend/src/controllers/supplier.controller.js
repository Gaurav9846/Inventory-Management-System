// src/controllers/supplier.controller.js
import prisma from "../config/prisma.js";
import { logAction } from "../utils/auditLog.js";

export const getAllSuppliers = async (req, res) => {
  try {
    const { search } = req.query;
    const suppliers = await prisma.supplier.findMany({
      where: search ? {
        OR: [
          { name:          { contains: search, mode: "insensitive" } },
          { contactPerson: { contains: search, mode: "insensitive" } },
          { phone:         { contains: search, mode: "insensitive" } },
        ],
      } : undefined,
      include: { _count: { select: { products: true, purchaseOrders: true } } },
      orderBy: { name: "asc" },
    });
    res.json(suppliers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getSupplierById = async (req, res) => {
  try {
    const supplier = await prisma.supplier.findUnique({
      where:   { id: req.params.id },
      include: {
        products:       { select: { id: true, name: true, currentStock: true, unit: true } },
        purchaseOrders: {
          take: 10, orderBy: { createdAt: "desc" },
          select: { id: true, orderNumber: true, status: true, totalAmount: true, createdAt: true },
        },
      },
    });
    if (!supplier) return res.status(404).json({ message: "Supplier not found." });
    res.json(supplier);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const createSupplier = async (req, res) => {
  try {
    const { name, contactPerson, email, phone, address, paymentTerms, notes } = req.body;
    if (!name || !phone)
      return res.status(400).json({ message: "Name and phone are required." });

    const supplier = await prisma.supplier.create({
      data: { name, contactPerson, email, phone, address, paymentTerms, notes },
    });
    await logAction(req.user.id, "CREATE", "Supplier", supplier.id, { name });
    res.status(201).json(supplier);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const updateSupplier = async (req, res) => {
  try {
    const { name, contactPerson, email, phone, address, paymentTerms, notes } = req.body;
    const supplier = await prisma.supplier.update({
      where: { id: req.params.id },
      data: {
        ...(name          !== undefined && { name }),
        ...(contactPerson !== undefined && { contactPerson }),
        ...(email         !== undefined && { email }),
        ...(phone         !== undefined && { phone }),
        ...(address       !== undefined && { address }),
        ...(paymentTerms  !== undefined && { paymentTerms }),
        ...(notes         !== undefined && { notes }),
      },
    });
    await logAction(req.user.id, "UPDATE", "Supplier", supplier.id, req.body);
    res.json(supplier);
  } catch (err) {
    if (err.code === "P2025") return res.status(404).json({ message: "Supplier not found." });
    res.status(500).json({ message: err.message });
  }
};

export const deleteSupplier = async (req, res) => {
  try {
    await prisma.supplier.delete({ where: { id: req.params.id } });
    await logAction(req.user.id, "DELETE", "Supplier", req.params.id);
    res.json({ message: "Supplier deleted." });
  } catch (err) {
    if (err.code === "P2025") return res.status(404).json({ message: "Supplier not found." });
    if (err.code === "P2003") return res.status(400).json({ message: "Supplier has related records." });
    res.status(500).json({ message: err.message });
  }
};
