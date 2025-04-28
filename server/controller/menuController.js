import Menu from "../model/menuModel.js";
import createHttpError from "http-errors";

const getAllMenu = async (req, res, next) => {
  try {
    const menus = await Menu.find().populate("ingredients.ingredient");
    
    if (!menus || menus.length === 0) {
      return next(createHttpError(404, "No menu items found"));
    }
    
    res.status(200).json({ success: true, data: menus });
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
      ingredients: menuItem.ingredients.map(ing => ({
        id: ing.ingredient._id,
        name: ing.ingredient.name,
        quantity: ing.quantity
      }))
    };
        
    res.status(200).json({ success: true, data: menuItem });
  } catch (error) {
    next(error);
  }
};

const addMenu = async (req, res, next) => {
  try {
    const menuItem = new Menu({
      name: req.body.name,
      price: req.body.price,
      description: req.body.description,
      category: req.body.category,
      ingredients: req.body.ingredients,
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