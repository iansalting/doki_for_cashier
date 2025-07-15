import Ingredient from "../model/ingredientModel.js";
import Menu from "../model/menuModel.js";
import createHttpError from "http-errors";

const getAllMenu = async (req, res, next) => {
  try {
    const menus = await Menu.find().populate("ingredients.ingredient");

    if (!menus || menus.length === 0) {
      return next(createHttpError(404, "No menu items found"));
    }

    // Check availability for each menu item
    const menusWithAvailability = await Promise.all(
      menus.map(async (menu) => {
        const menuObj = menu.toObject();
        let isAvailable = true;
        const unavailableIngredients = [];

        // Check each ingredient's availability
        for (const menuIngredient of menuObj.ingredients) {
          const ingredient = menuIngredient.ingredient;
          const requiredQuantity = menuIngredient.quantity || 1;

          // Get fresh ingredient data from database to ensure accuracy
          const freshIngredient = await Ingredient.findById(ingredient._id);

          // Check if ingredient exists and has sufficient stock (using quantity field)
          if (!freshIngredient) {
            isAvailable = false;
            unavailableIngredients.push({
              name: ingredient.name || "Unknown ingredient",
              reason: "Ingredient not found in inventory",
            });
          } else if (freshIngredient.quantity < requiredQuantity) {
            isAvailable = false;
            unavailableIngredients.push({
              name: freshIngredient.name,
              required: requiredQuantity,
              available: freshIngredient.quantity,
              unit: freshIngredient.unit,
              reason:
                freshIngredient.quantity === 0
                  ? "Out of stock"
                  : "Insufficient stock",
            });
          }
        }

        return {
          ...menuObj,
          isAvailable,
          unavailableIngredients:
            unavailableIngredients.length > 0
              ? unavailableIngredients
              : undefined,
        };
      })
    );

    res.status(200).json({
      success: true,
      data: menusWithAvailability,
    });
  } catch (error) {
    next(error);
  }
};

const getMenuById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const menu = await Menu.findById(id);

    if (!menu) {
      const error = createHttpError(404, "Item not found");
      return next(error);
    }

    const menuItem = await Menu.findById(id).populate("ingredients.ingredient");

    const response = {
      id: menuItem._id,
      name: menuItem.name,
      price: menuItem.price,
      description: menuItem.description,
      category: menuItem.category,
      ingredients: menuItem.ingredients.map((ing) => ({
        id: ing.ingredient._id,
        name: ing.ingredient.name,
        quantity: ing.quantity,
      })),
    };

    res.status(200).json({ success: true, data: menuItem });
  } catch (error) {
    next(error);
  }
};

const addMenu = async (req, res, next) => {
  try {
    const { name, price, description, category, ingredients } = req.body;

    const ingredientId = await Promise.all(
      ingredients.map(async (item) => {
        const found = await Ingredient.findOne({ name: item.name });
        if (!found) throw new Error(`Ingredient "${item.name}" not found`);
        return {
          ingredient: found._id,
          quantity: item.quantity,
        };
      })
    );

    const menuItem = new Menu({
      name,
      price,
      description,
      category,
      ingredients: ingredientId,
    });

    const newMenu = await menuItem.save();

    res
      .status(201)
      .json({ success: true, message: "Menu item created", data: newMenu });
  } catch (error) {
    next(error);
  }
};

const deleteMenu = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deletedMenuItem = await Menu.findByIdAndDelete(id);

    if (!deletedMenuItem) {
      return res.status(404).json({ message: "Menu item not found" });
    }

    res
      .status(200)
      .json({ success: true, message: "Menu item deleted successfully" });
  } catch (error) {
    next(error);
  }
};

const updateMenu = async (req, res, next) => {
  try {
    const { id } = req.params;
    const menuItem = await Menu.findByIdAndUpdate(id, req.body, { new: true });

    if (!menuItem) {
      const error = createHttpError(404, "Item not found");
      return next(error);
    }

    res
      .status(201)
      .json({ success: true, message: "Menu Updated", data: menuItem });
  } catch (error) {
    next(error);
  }
};

const searchMenuItems = async (req, res) => {
  try {
    const { query } = req.query;

    if (!query) {
      return res.status(400).json({ message: "Search query is required" });
    }

    const menuItems = await Menu.find({
      name: { $regex: query, $options: "i" },
    }).populate("ingredients.ingredient");

    res.status(200).json(menuItems);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export { addMenu, deleteMenu, updateMenu, getAllMenu, getMenuById };
