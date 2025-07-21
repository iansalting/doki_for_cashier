// middlewares/imageUpload.js
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = './uploads/menu';
    // Ensure directory exists
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const sanitizedName = req.body.menuName 
      ? req.body.menuName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()
      : 'menu-item';
    const uniqueFileName = `${sanitizedName}-${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueFileName);
  }
});

// File filter for images only
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, PNG, and WebP images are allowed'), false);
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: fileFilter
});

// Error handling middleware for multer errors
const handleMulterError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    console.error('Multer error:', error);
    
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        return res.status(400).json({
          success: false,
          error: 'File too large. Maximum size is 5MB.',
          code: 'FILE_TOO_LARGE'
        });
      case 'LIMIT_FILE_COUNT':
        return res.status(400).json({
          success: false,
          error: 'Too many files. Only 1 file allowed.',
          code: 'TOO_MANY_FILES'
        });
      case 'LIMIT_UNEXPECTED_FILE':
        return res.status(400).json({
          success: false,
          error: 'Unexpected file field.',
          code: 'UNEXPECTED_FILE'
        });
      default:
        return res.status(400).json({
          success: false,
          error: `Upload error: ${error.message}`,
          code: 'UPLOAD_ERROR'
        });
    }
  }
  
  // Handle custom file filter errors
  if (error.message.includes('Only JPEG, PNG, and WebP')) {
    return res.status(400).json({
      success: false,
      error: error.message,
      code: 'INVALID_FILE_TYPE'
    });
  }
  
  // Pass other errors to next middleware
  next(error);
};

// Export the configured upload middleware and error handler
export const uploadSingle = upload.single('image');
export { handleMulterError };

// Also export the base upload for other uses
export { upload };