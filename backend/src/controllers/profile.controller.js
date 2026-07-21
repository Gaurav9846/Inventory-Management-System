// src/controllers/profile.controller.js
import prisma from "../config/prisma.js";
import { logAction } from "../utils/auditLog.js";
import { createNotification } from "./notification.controller.js";

// ==================== STAFF/MANAGER FUNCTIONS ====================

/**
 * POST /api/profile/request-change
 * Submit a profile change request
 */
export const requestProfileChange = async (req, res) => {
  try {
    const { field, requestedValue, reason } = req.body;
    const userId = req.user.id;

    // Validate field
    const validFields = ['NAME', 'EMAIL', 'PHONE', 'PROFILE_IMAGE'];
    if (!field || !validFields.includes(field)) {
      return res.status(400).json({ 
        success: false, 
        message: "Valid field is required (NAME, EMAIL, PHONE, PROFILE_IMAGE)" 
      });
    }

    // Validate requested value
    if (!requestedValue) {
      return res.status(400).json({ 
        success: false, 
        message: "Requested value is required" 
      });
    }

    // Check if there's already a pending request for this field
    const existingRequest = await prisma.profileChangeRequest.findFirst({
      where: {
        userId,
        field,
        status: 'PENDING',
      },
    });

    if (existingRequest) {
      return res.status(400).json({
        success: false,
        message: `You already have a pending request to change your ${field.toLowerCase()}`,
      });
    }

    // Get current value
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        name: true,
        email: true,
        phone: true,
        profileImage: true,
      },
    });

    let currentValue = null;
    switch (field) {
      case 'NAME':
        currentValue = user.name;
        break;
      case 'EMAIL':
        currentValue = user.email;
        break;
      case 'PHONE':
        currentValue = user.phone;
        break;
      case 'PROFILE_IMAGE':
        currentValue = user.profileImage;
        break;
    }

    // Check if the requested value is the same as current
    if (currentValue === requestedValue) {
      return res.status(400).json({
        success: false,
        message: `The requested ${field.toLowerCase()} is the same as your current ${field.toLowerCase()}`,
      });
    }

    // For email, check if already taken by another user
    if (field === 'EMAIL') {
      const existingUser = await prisma.user.findUnique({
        where: { email: requestedValue },
      });
      if (existingUser && existingUser.id !== userId) {
        return res.status(400).json({
          success: false,
          message: "This email is already taken by another user",
        });
      }
    }

    // Create the change request
    const changeRequest = await prisma.profileChangeRequest.create({
      data: {
        userId,
        field,
        currentValue,
        requestedValue,
        reason: reason || null,
        status: 'PENDING',
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    await logAction(userId, "REQUEST_PROFILE_CHANGE", "ProfileChangeRequest", changeRequest.id, {
      field,
      requestedValue,
      reason,
    });

    // ✅ Notify all admins about the change request
    await createNotification({
      title: `📝 Profile Change Request from ${req.user.name}`,
      message: `${req.user.name} (${req.user.role}) has requested to change their ${field.toLowerCase()} from "${currentValue}" to "${requestedValue}".`,
      type: 'APPROVAL_REQUEST',
      priority: 'WARNING',
      referenceId: changeRequest.id,
      referenceType: 'ProfileChangeRequest',
      actionUrl: `/admin/profile-requests/${changeRequest.id}`,
    });

    res.status(201).json({
      success: true,
      message: "Profile change request submitted successfully. Waiting for admin approval.",
      data: changeRequest,
    });

  } catch (error) {
    console.error('Error in requestProfileChange:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/profile/my-requests
 * Get user's own profile change requests
 */
export const getMyProfileChangeRequests = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where = {
      userId: req.user.id,
      ...(status && { status: status.toUpperCase() }),
    };

    const [requests, total] = await Promise.all([
      prisma.profileChangeRequest.findMany({
        where,
        include: {
          reviewedBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: Number(limit),
        skip,
      }),
      prisma.profileChangeRequest.count({ where }),
    ]);

    res.json({
      success: true,
      data: requests,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error('Error in getMyProfileChangeRequests:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==================== ADMIN FUNCTIONS ====================

/**
 * GET /api/profile/admin/requests
 * Get all profile change requests (Admin only)
 */
export const getAllProfileChangeRequests = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where = {
      ...(status && { status: status.toUpperCase() }),
    };

    const [requests, total] = await Promise.all([
      prisma.profileChangeRequest.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              phone: true,
            },
          },
          reviewedBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: Number(limit),
        skip,
      }),
      prisma.profileChangeRequest.count({ where }),
    ]);

    // Get stats
    const stats = {
      pending: await prisma.profileChangeRequest.count({ where: { status: 'PENDING' } }),
      approved: await prisma.profileChangeRequest.count({ where: { status: 'APPROVED' } }),
      rejected: await prisma.profileChangeRequest.count({ where: { status: 'REJECTED' } }),
      total: await prisma.profileChangeRequest.count(),
    };

    res.json({
      success: true,
      data: requests,
      stats,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error('Error in getAllProfileChangeRequests:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PATCH /api/profile/admin/requests/:id/approve
 * Approve a profile change request (Admin only)
 */
export const approveProfileChangeRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { adminNotes } = req.body;

    const changeRequest = await prisma.profileChangeRequest.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!changeRequest) {
      return res.status(404).json({ success: false, message: "Change request not found" });
    }

    if (changeRequest.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        message: `Request is already ${changeRequest.status.toLowerCase()}`,
      });
    }

    // Update user's profile based on the field
    let updateData = {};
    switch (changeRequest.field) {
      case 'NAME':
        updateData.name = changeRequest.requestedValue;
        break;
      case 'EMAIL':
        // Check if email is already taken
        const existingUser = await prisma.user.findUnique({
          where: { email: changeRequest.requestedValue },
        });
        if (existingUser && existingUser.id !== changeRequest.userId) {
          return res.status(400).json({
            success: false,
            message: "This email is already taken by another user",
          });
        }
        updateData.email = changeRequest.requestedValue;
        break;
      case 'PHONE':
        updateData.phone = changeRequest.requestedValue;
        break;
      case 'PROFILE_IMAGE':
        updateData.profileImage = changeRequest.requestedValue;
        break;
    }

    // Update the user
    const updatedUser = await prisma.user.update({
      where: { id: changeRequest.userId },
      data: updateData,
    });

    // Update the request status
    const updatedRequest = await prisma.profileChangeRequest.update({
      where: { id },
      data: {
        status: 'APPROVED',
        reviewedById: req.user.id,
        reviewedAt: new Date(),
        adminNotes: adminNotes || null,
      },
    });

    await logAction(req.user.id, "APPROVE_PROFILE_CHANGE", "ProfileChangeRequest", id, {
      userId: changeRequest.userId,
      field: changeRequest.field,
      requestedValue: changeRequest.requestedValue,
      adminNotes,
    });

    // ✅ Notify the user that their request was approved
    await createNotification({
      title: `✅ Profile Change Approved: ${changeRequest.field}`,
      message: `Your request to change your ${changeRequest.field.toLowerCase()} to "${changeRequest.requestedValue}" has been APPROVED by ${req.user.name}.`,
      type: 'APPROVAL_REQUEST',
      priority: 'INFORMATION',
      userId: changeRequest.userId,
      referenceId: id,
      referenceType: 'ProfileChangeRequest',
    });

    res.json({
      success: true,
      message: "Profile change request approved and applied",
      data: updatedRequest,
    });

  } catch (error) {
    console.error('Error in approveProfileChangeRequest:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PATCH /api/profile/admin/requests/:id/reject
 * Reject a profile change request (Admin only)
 */
export const rejectProfileChangeRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { adminNotes } = req.body;

    if (!adminNotes) {
      return res.status(400).json({
        success: false,
        message: "Admin notes are required when rejecting a request",
      });
    }

    const changeRequest = await prisma.profileChangeRequest.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!changeRequest) {
      return res.status(404).json({ success: false, message: "Change request not found" });
    }

    if (changeRequest.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        message: `Request is already ${changeRequest.status.toLowerCase()}`,
      });
    }

    const updatedRequest = await prisma.profileChangeRequest.update({
      where: { id },
      data: {
        status: 'REJECTED',
        reviewedById: req.user.id,
        reviewedAt: new Date(),
        adminNotes,
      },
    });

    await logAction(req.user.id, "REJECT_PROFILE_CHANGE", "ProfileChangeRequest", id, {
      userId: changeRequest.userId,
      field: changeRequest.field,
      requestedValue: changeRequest.requestedValue,
      adminNotes,
    });

    // ✅ Notify the user that their request was rejected
    await createNotification({
      title: `❌ Profile Change Rejected: ${changeRequest.field}`,
      message: `Your request to change your ${changeRequest.field.toLowerCase()} to "${changeRequest.requestedValue}" has been REJECTED by ${req.user.name}. Reason: ${adminNotes}`,
      type: 'APPROVAL_REQUEST',
      priority: 'WARNING',
      userId: changeRequest.userId,
      referenceId: id,
      referenceType: 'ProfileChangeRequest',
    });

    res.json({
      success: true,
      message: "Profile change request rejected",
      data: updatedRequest,
    });

  } catch (error) {
    console.error('Error in rejectProfileChangeRequest:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};