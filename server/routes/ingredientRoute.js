import express from 'express';
import {
  getAllIngredient,
  getIngredientById,
  addIngredient,
  deleteIngredient,
  updateIngredient
} from '../controller/ingredientController.js';
import verifyToken from '../middlewares/tokenVerification.js';
import { authorizeRole } from '../middlewares/roleMiddleware.js';

const router = express.Router();

// Apply authentication to all routes
router.use(verifyToken);

// POST - Add ingredient (SuperAdmin only)
router.route("/post").post(
  authorizeRole("superadmin"),
  addIngredient
);

// DELETE - Delete ingredient (SuperAdmin only)
router.route("/delete/:id").delete(
  authorizeRole("superadmin"),
  deleteIngredient
);

// PATCH - Update ingredient (SuperAdmin only)
router.route("/update/:id").patch(
  authorizeRole("superadmin"),
  updateIngredient
);

// GET - Get all ingredients (Admin or SuperAdmin can view)
router.route("/").get(
  authorizeRole("superadmin", "admin"),
  getAllIngredient
);

// GET - Get ingredient by ID (Admin or SuperAdmin can view)
router.route("/:id").get(
  authorizeRole("superadmin", "admin"),
  getIngredientById
);

export default router;