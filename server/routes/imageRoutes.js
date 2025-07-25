// routes/imageRoutes.js
import express from 'express';
import { uploadSingle, handleMulterError } from '../middlewares/imageUpload.js';
import {
  uploadMenuImage,
  deleteMenuImage,
  getImageStatus,
  bulkUploadImages
} from '../controller/imageUploadController.js';
import verifyToken from '../middlewares/tokenVerification.js';
import { authorizeRole } from '../middlewares/roleMiddleware.js';

const router = express.Router();

// Apply authentication to all image routes
router.use(verifyToken);

// POST - Upload single menu image (Admin or SuperAdmin)
router.post('/menu/:menuId/upload-image',
  authorizeRole("superadmin", "admin"),
  uploadSingle,
  handleMulterError,
  uploadMenuImage
);

// DELETE - Delete menu image (Admin or SuperAdmin)
router.delete('/menu/:menuId/image',
  authorizeRole("superadmin", "admin"),
  deleteMenuImage
);

// POST - Bulk upload images (Admin or SuperAdmin)
router.post('/bulk-upload-images',
  authorizeRole("superadmin", "admin"),
  bulkUploadImages
);

// GET - Get image status (Admin or SuperAdmin - for monitoring)
router.get('/image-status',
  authorizeRole("superadmin", "admin"),
  getImageStatus
);

export default router;