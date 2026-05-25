// src/middleware/role.middleware.js

export const restrictTo = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({
      message: `Access denied. Required role(s): ${roles.join(", ")}.`,
    });
  }
  next();
};
