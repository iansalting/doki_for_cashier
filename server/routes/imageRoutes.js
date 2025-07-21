// routes/imageRoutes.js
import express from 'express';
import { uploadSingle, handleMulterError } from '../middlewares/imageUpload.js';
import { 
  uploadMenuImage, 
  deleteMenuImage, 
  getImageStatus,
  bulkUploadImages
} from '../controller/imageUploadController.js';

const router = express.Router();

router.post('/menu/:menuId/upload-image', 
  uploadSingle,
  handleMulterError,
  uploadMenuImage
);

router.delete('/menu/:menuId/image', deleteMenuImage);
router.post('/bulk-upload-images', bulkUploadImages);
router.get('/image-status', getImageStatus);

export default router;