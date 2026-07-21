// src/controllers/payment.controller.js
import axios from "axios";
import prisma from "../config/prisma.js";
import { logAction } from "../utils/auditLog.js";
import { sendEmail } from "../config/nodemailer.js";
import { paymentSuccessTemplate } from "../utils/emailTemplates.js";

const KHALTI_BASE = "https://a.khalti.com/api/v2";

const khaltiHeaders = {
  Authorization: `Key ${process.env.KHALTI_SECRET_KEY}`,
  "Content-Type": "application/json",
};

// ── POST /api/payments/initiate ───────────────────────────────────────────────
export const initiatePayment = async (req, res) => {
  try {
    const { salesOrderId, platform = "KHALTI" } = req.body;
    if (!salesOrderId)
      return res.status(400).json({ message: "salesOrderId is required." });

    const order = await prisma.salesOrder.findUnique({
      where: { id: salesOrderId },
      include: { customer: true, payment: true },
    });
    if (!order) return res.status(404).json({ message: "Sales order not found." });
    if (order.payment?.status === "COMPLETED")
      return res.status(400).json({ message: "Order already paid." });

    const amountPaisa = Math.round((order.totalAmount || 0) * 100);

    const payload = {
      return_url: `${process.env.FRONTEND_URL}/payment/verify`,
      website_url: process.env.FRONTEND_URL,
      amount: amountPaisa,
      purchase_order_id: salesOrderId,
      purchase_order_name: `Order ${order.orderNumber}`,
      customer_info: {
        name: order.customer.name,
        email: order.customer.email || "",
        phone: order.customer.phone || "",
      },
    };

    const { data } = await axios.post(`${KHALTI_BASE}/epayment/initiate/`, payload, {
      headers: khaltiHeaders,
    });

    await prisma.payment.upsert({
      where: { salesOrderId },
      update: {
        khaltiPidx: data.pidx,
        status: "PENDING",
        platform: platform,
      },
      create: {
        salesOrderId,
        method: "ONLINE",
        platform: platform,
        status: "PENDING",
        amount: order.totalAmount || 0,
        khaltiPidx: data.pidx,
      },
    });

    await logAction(req.user.id, "INITIATE_PAYMENT", "Payment", salesOrderId, {
      pidx: data.pidx,
      platform,
    });

    res.json({
      pidx: data.pidx,
      payment_url: data.payment_url,
      expiresAt: data.expires_at,
      platform,
    });
  } catch (err) {
    const message = err.response?.data?.detail || err.message;
    res.status(500).json({ message });
  }
};

// ── POST /api/payments/verify ─────────────────────────────────────────────────
export const verifyPayment = async (req, res) => {
  try {
    const { pidx } = req.body;
    if (!pidx) return res.status(400).json({ message: "pidx is required." });

    const { data } = await axios.post(`${KHALTI_BASE}/epayment/lookup/`, { pidx }, {
      headers: khaltiHeaders,
    });

    if (data.status !== "Completed") {
      return res.status(400).json({ message: `Payment not completed. Status: ${data.status}` });
    }

    const payment = await prisma.payment.update({
      where: { khaltiPidx: pidx },
      data: {
        status: "COMPLETED",
        khaltiTransactionId: data.transaction_id,
        platformTransactionId: data.transaction_id,
        verifiedAt: new Date(),
      },
      include: {
        salesOrder: {
          include: { customer: true },
        },
      },
    });

    await prisma.salesOrder.update({
      where: { id: payment.salesOrderId },
      data: { status: "PROCESSING" },
    });

    if (payment.salesOrder.customer.email) {
      await sendEmail(
        payment.salesOrder.customer.email,
        "Payment Confirmed – Fusion IMS",
        paymentSuccessTemplate(
          payment.salesOrder.orderNumber,
          data.total_amount,
          data.transaction_id
        )
      );
    }

    await logAction(req.user.id, "VERIFY_PAYMENT", "Payment", payment.id, {
      transactionId: data.transaction_id,
      platform: payment.platform,
    });

    res.json({
      message: "Payment verified successfully.",
      transactionId: data.transaction_id,
      amount: data.total_amount,
      platform: payment.platform,
      payment,
    });
  } catch (err) {
    const message = err.response?.data?.detail || err.message;
    res.status(500).json({ message });
  }
};

// ── GET /api/payments/:salesOrderId ──────────────────────────────────────────
export const getPaymentByOrder = async (req, res) => {
  try {
    const payment = await prisma.payment.findUnique({
      where: { salesOrderId: req.params.salesOrderId },
      include: {
        salesOrder: {
          select: {
            orderNumber: true,
            totalAmount: true,
            status: true,
          },
        },
      },
    });
    if (!payment) return res.status(404).json({ message: "No payment record found." });
    res.json(payment);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};