// src/controllers/category.controller.js
import prisma from "../config/prisma.js";
import { logAction } from "../utils/auditLog.js";

export const getAllCategories = async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      include:  { _count: { select: { products: true } } },
      orderBy:  { name: "asc" },
    });
    res.json(categories);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getCategoryById = async (req, res) => {
  try {
    const category = await prisma.category.findUnique({
      where:   { id: req.params.id },
      include: { products: { select: { id: true, name: true, currentStock: true } } },
    });
    if (!category) return res.status(404).json({ message: "Category not found." });
    res.json(category);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const createCategory = async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ message: "Category name is required." });

    const category = await prisma.category.create({ data: { name, description } });
    await logAction(req.user.id, "CREATE", "Category", category.id, { name });
    res.status(201).json(category);
  } catch (err) {
    if (err.code === "P2002") return res.status(409).json({ message: "Category already exists." });
    res.status(500).json({ message: err.message });
  }
};

export const updateCategory = async (req, res) => {
  try {
    const { name, description } = req.body;
    const category = await prisma.category.update({
      where: { id: req.params.id },
      data: {
        ...(name        !== undefined && { name }),
        ...(description !== undefined && { description }),
      },
    });
    await logAction(req.user.id, "UPDATE", "Category", category.id, req.body);
    res.json(category);
  } catch (err) {
    if (err.code === "P2025") return res.status(404).json({ message: "Category not found." });
    res.status(500).json({ message: err.message });
  }
};

export const deleteCategory = async (req, res) => {
  try {
    await prisma.category.delete({ where: { id: req.params.id } });
    await logAction(req.user.id, "DELETE", "Category", req.params.id);
    res.json({ message: "Category deleted." });
  } catch (err) {
    if (err.code === "P2025") return res.status(404).json({ message: "Category not found." });
    if (err.code === "P2003") return res.status(400).json({ message: "Cannot delete category with existing products." });
    res.status(500).json({ message: err.message });
  }
};
