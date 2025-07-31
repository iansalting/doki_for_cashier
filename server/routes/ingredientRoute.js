import express from "express";
import {
  getAllIngredient,
  getIngredientById,
  addIngredient,
  deleteIngredient,
  updateIngredient,
  getIngredientBatches,
  deleteBatch,
  getExpiredIngredients,
} from "../controller/ingredientController.js";
import verifyToken from "../middlewares/tokenVerification.js";
import { authorizeRole } from "../middlewares/roleMiddleware.js";

const router = express.Router();

// Apply authentication to all routes
router.use(verifyToken);

// SPECIFIC ROUTES FIRST (before parameterized routes)

// GET - Get expired ingredients (Admin or SuperAdmin can view)
router.get("/expired", authorizeRole("superadmin", "admin"), getExpiredIngredients);

// GET - Get ingredient batches (Admin or SuperAdmin can view)  
router.get("/batches", authorizeRole("superadmin", "admin"), getIngredientBatches);

// GET - Get all ingredients (Admin or SuperAdmin can view)
router.get("/", authorizeRole("superadmin", "admin"), getAllIngredient);

// POST - Add ingredient (SuperAdmin only)
router.post("/", authorizeRole("superadmin"), addIngredient);

// PARAMETERIZED ROUTES LAST

// GET - Get ingredient by ID (Admin or SuperAdmin can view)
router.get("/:id", authorizeRole("superadmin", "admin"), getIngredientById);

// PUT - Update ingredient (SuperAdmin only)
router.put("/:id", authorizeRole("superadmin"), updateIngredient);

// DELETE - Delete ingredient (SuperAdmin only)
router.delete("/:id", authorizeRole("superadmin"), deleteIngredient);

// DELETE - Delete specific batch (SuperAdmin only)
router.delete("/:ingredientId/batch/:batchIndex", authorizeRole("superadmin"), deleteBatch);

export default router;