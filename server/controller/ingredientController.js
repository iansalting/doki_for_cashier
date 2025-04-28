import createHttpError from "http-errors";
import Ingredient from "../model/ingredientModel.js";

const getAllIngredient = async (req, res, next) => {
  try {
    const ingredient = await Ingredient.find();

    const response = ingredient.map(ingredient => ({
      id: ingredient._id,
      name: ingredient.name,
      quantity: ingredient.quantity,
    }));

    res.json(response);
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

const addIngredient = async (req, res, next) => {
  try {
    const { name, unit } = req.body;

    const existinngItem = await Ingredient.findOne({ name });
    if (existinngItem) {
      const error = createHttpError(404, "Item already exist");
      return next(error);
    };

    const ingredient = new Ingredient({
      name,
      unit,
      quantity: 0
    });

    const newIngredient = await ingredient.save();
    res
      .status(201)
      .json({
        success: true,
        message: "Item added successfully",
        data:{
          id: newIngredient._id,
          name: newIngredient.name,
        }
      });
  } catch (error) {
    next(error);
  }
};

const updateIngredient = async (req, res, next) => {
  try {
    const ingredient = await Ingredient.findByIdAndUpdate(req.params.id);
    if (!ingredient) {
      const error = createHttpError(404, "Item not found");
      return next(error);
    }
    if (req.body.name) ingredient.name = req.body.name;
    if (req.body.quantity !== undefined)
      ingredient.quantity = req.body.quantity;
    if (req.body.unit) ingredient.unit = req.body.unit;

    const updateIngredient = await ingredient.save();
    res.json({
      success: true,
      message: "Item updated successfully",
      data: {
        id: updateIngredient._id,
        name: updateIngredient.name,
      }
    });
  } catch (error) {
    next(error);
  }
};

const deleteIngredient = async (req, res, next) => {
  try {
    const ingredient = Ingredient.findById(req.params.id);
    if (!ingredient) {
      const error = createHttpError(404, "Item not found");
      return next(error);
    }
    res.status(201).json({ success: true, message: "Item deleted" });
  } catch (error) {
    next(error);
  }
};

export {
  getAllIngredient,
  getIngredientById,
  addIngredient,
  updateIngredient,
  deleteIngredient,
};
