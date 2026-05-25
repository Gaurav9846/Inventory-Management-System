// src/middleware/upload.middleware.js
import multer from "multer";

const memoryStorage = multer.memoryStorage();

const imageFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed."), false);
  }
};

// 5 MB limit – used for product image uploads
export const uploadImage = multer({
  storage: memoryStorage,
  limits:  { fileSize: 5 * 1024 * 1024 },
  fileFilter: imageFilter,
});
