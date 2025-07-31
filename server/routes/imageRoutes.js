// routes/imageRoutes.js
import express from "express";
import {
  uploadMenuItemImage,
  getMenuItemImage,
  deleteMenuItemImage,
  getAllMenuItems,
  getMenuItemById,
} from "../controller/imageUploadController.js";
import verifyToken from "../middlewares/tokenVerification.js";
import { authorizeRole } from "../middlewares/roleMiddleware.js";

const router = express.Router();

// Apply authentication to all image routes
router.use(verifyToken);

router
  .route("/menu-items/:menuItemId/image")
  .post(verifyToken, authorizeRole("superadmin"), uploadMenuItemImage);

router
  .route("/menu-items/:menuItemId/image")
  .delete(verifyToken, authorizeRole("superadmin"), deleteMenuItemImage);

router
  .route("/menu-items/:menuItemId/image")
  .get(verifyToken, authorizeRole("superadmin"), getMenuItemImage);

router.route('/menu-items').get(verifyToken, authorizeRole("superadmin"),getAllMenuItems)
router.route('/menu-items/:id').get(verifyToken, authorizeRole("superadmin"),getMenuItemById)
export default router;
