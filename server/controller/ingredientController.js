import createHttpError from "http-errors";
import Ingredient from "../model/ingredientModel.js";

const getAllIngredient = async (req, res, next) => {
  try {
    const ingredients = await Ingredient.find();

    const response = ingredients.map((ingredient) => ({
      id: ingredient._id,
      name: ingredient.name,
      unit: ingredient.unit,
      totalQuantity: ingredient.totalQuantity, // from virtual
      batches: ingredient.batches.map((batch) => ({
        quantity: batch.quantity,
        expirationDate: batch.expirationDate,
        deliveryId: batch.deliveryId,
        addedDate: batch.addedDate,
      })),
    }));

    res.json({
      success: true,
      data: response,
    });
  } catch (error) {
    next(error);
  }
};

const getIngredientById = async (req, res, next) => {
  try {
    const ingredient = await Ingredient.findById(req.params.id);
    if (!ingredient) {
      const error = createHttpError(404, "Item not found");
      return next(error);
    }
    res.json({
      id: ingredient._id,
      name: ingredient.name,
    });
  } catch (error) {
    next(error);
  }
};

const allowedUnits = ["g", "kg", "ml", "l", "pcs"];

const addIngredient = async (req, res, next) => {
  try {
    const { name, unit } = req.body;

    if (!name || !unit) {
      return next(createHttpError(400, "Name and unit are required"));
    }

    if (!allowedUnits.includes(unit)) {
      return next(
        createHttpError(400, `Unit must be one of: ${allowedUnits.join(", ")}`)
      );
    }

    const existingItem = await Ingredient.findOne({ name: name.trim() });
    if (existingItem) {
      return next(createHttpError(409, "Item already exists"));
    }

    const ingredient = new Ingredient({
      name: name.trim(),
      unit,
    });

    const newIngredient = await ingredient.save();

    res.status(201).json({
      success: true,
      message: "Item added successfully",
      data: {
        id: newIngredient._id,
        name: newIngredient.name,
      },
    });
  } catch (error) {
    next(error);
  }
};

const updateIngredient = async (req, res, next) => {
  try {
    const ingredient = await Ingredient.findById(req.params.id);
    if (!ingredient) {
      const error = createHttpError(404, "Item not found");
      return next(error);
    }
    if (req.body.name) ingredient.name = req.body.name;
    if (req.body.unit && allowedUnits.includes(req.body.unit)) {
      ingredient.unit = req.body.unit;
    } else if (req.body.unit) {
      return next(
        createHttpError(400, `Unit must be one of: ${allowedUnits.join(", ")}`)
      );
    }

    const updateIngredient = await ingredient.save();
    res.json({
      success: true,
      message: "Item updated successfully",
      data: {
        id: updateIngredient._id,
        name: updateIngredient.name,
      },
    });
  } catch (error) {
    next(error);
  }
};

const getIngredientBatches = async (req, res, next) => {
  try {
    const { id } = req.params;

    const ingredient = await Ingredient.findById(id);

    if (!ingredient) {
      return next(createHttpError(404, "Ingredient not found"));
    }

    // Sort batches by expiration date
    ingredient.batches.sort(
      (a, b) => new Date(a.expirationDate) - new Date(b.expirationDate)
    );

    res.json({
      success: true,
      data: {
        name: ingredient.name,
        unit: ingredient.unit,
        totalQuantity: ingredient.totalQuantity,
        batches: ingredient.batches,
      },
    });
  } catch (error) {
    next(error);
  }
};

const deleteIngredient = async (req, res, next) => {
  try {
    const ingredient = await Ingredient.findByIdAndDelete(req.params.id);
    if (!ingredient) {
      const error = createHttpError(404, "Ingredient not found");
      return next(error);
    }

    res.status(200).json({
      success: true,
      message: "Ingredient deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

const deleteBatch = async (req, res, next) => {
  try {
    const { ingredientId, batchIndex } = req.params;

    const ingredient = await Ingredient.findById(ingredientId);
    if (!ingredient) {
      return next(createHttpError(404, "Ingredient not found"));
    }

    const index = parseInt(batchIndex, 10);

    if (isNaN(index) || index < 0 || index >= ingredient.batches.length) {
      return next(createHttpError(400, "Invalid batch index"));
    }

    const removedBatch = ingredient.batches.splice(index, 1);
    await ingredient.save();

    res.status(200).json({
      success: true,
      message: "Batch removed successfully",
      removedBatch: removedBatch[0],
    });
  } catch (error) {
    next(error);
  }
};

const getExpiredIngredients = async (req, res, next) => {
  try {
    const currentDate = new Date();

    // Method 1: Using MongoDB aggregation pipeline (more efficient)
    const ingredientsWithExpiredBatches = await Ingredient.aggregate([
      {
        // Match ingredients that have at least one expired batch
        $match: {
          "batches.expirationDate": { $lt: currentDate },
        },
      },
      {
        // Add a field to filter only expired batches
        $addFields: {
          expiredBatches: {
            $filter: {
              input: "$batches",
              as: "batch",
              cond: { $lt: ["$$batch.expirationDate", currentDate] },
            },
          },
          validBatches: {
            $filter: {
              input: "$batches",
              as: "batch",
              cond: { $gte: ["$$batch.expirationDate", currentDate] },
            },
          },
        },
      },
      {
        // Add computed fields
        $addFields: {
          totalExpiredQuantity: {
            $sum: "$expiredBatches.quantity",
          },
          totalValidQuantity: {
            $sum: "$validBatches.quantity",
          },
          expiredBatchCount: { $size: "$expiredBatches" },
        },
      },
      {
        // Sort by total expired quantity (descending)
        $sort: { totalExpiredQuantity: -1 },
      },
    ]);

    res.status(200).json({
      success: true,
      message: `Found ${ingredientsWithExpiredBatches.length} ingredients with expired batches`,
      data: ingredientsWithExpiredBatches,
      summary: {
        totalIngredients: ingredientsWithExpiredBatches.length,
        totalExpiredBatches: ingredientsWithExpiredBatches.reduce(
          (sum, ingredient) => sum + ingredient.expiredBatchCount,
          0
        ),
        totalExpiredQuantity: ingredientsWithExpiredBatches.reduce(
          (sum, ingredient) => sum + ingredient.totalExpiredQuantity,
          0
        ),
      },
    });
  } catch (error) {
    console.error("Error fetching ingredients with expired batches:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch ingredients with expired batches",
      error: error.message,
    });
  }
};

export {
  getAllIngredient,
  getIngredientById,
  addIngredient,
  updateIngredient,
  deleteIngredient,
  getIngredientBatches,
  deleteBatch,
  getExpiredIngredients,
};
