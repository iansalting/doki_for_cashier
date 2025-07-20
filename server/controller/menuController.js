import Ingredient from "../model/ingredientModel.js";
import Menu from "../model/menuModel.js";
import createHttpError from "http-errors";

const getAllMenu = async (req, res, next) => {
  try {
    // Add query options for filtering and pagination if needed
    const { category, available } = req.query;
    
    // Build query filter
    let filter = {};
    if (category) {
      filter.category = category;
    }
    if (available !== undefined) {
      filter.available = available === 'true';
    }

    const menus = await Menu.find(filter)
      .populate("sizes.ingredients.ingredient")
      .sort({ category: 1, name: 1 }); // Sort by category, then name

    if (!menus || menus.length === 0) {
      return res.status(200).json({
        success: true,
        data: [],
        categories: [],
        message: "No menu items found"
      });
    }

    const categoriesSet = new Set();

    const menusWithAvailability = await Promise.all(
      menus.map(async (menu) => {
        const menuObj = menu.toObject();

        // Collect category
        if (menuObj.category) {
          categoriesSet.add(menuObj.category);
        }

        const sizesWithAvailability = Array.isArray(menuObj.sizes)
          ? await Promise.all(
              menuObj.sizes.map(async (size) => {
                let isAvailable = true;
                const unavailableIngredients = [];

                // Only check ingredients if they exist
                if (size.ingredients && size.ingredients.length > 0) {
                  for (const menuIngredient of size.ingredients) {
                    const ingredient = menuIngredient.ingredient;
                    const requiredQuantity = menuIngredient.quantity || 1;

                    if (!ingredient) {
                      isAvailable = false;
                      unavailableIngredients.push({
                        name: "Unknown ingredient",
                        reason: "Ingredient not found in inventory",
                      });
                    } else if (
                      typeof ingredient.quantity === 'number' && 
                      ingredient.quantity < requiredQuantity
                    ) {
                      isAvailable = false;
                      unavailableIngredients.push({
                        name: ingredient.name,
                        required: requiredQuantity,
                        available: ingredient.quantity,
                        unit: ingredient.unit || 'units',
                        reason:
                          ingredient.quantity === 0
                            ? "Out of stock"
                            : "Insufficient stock",
                      });
                    }
                  }
                }

                return {
                  _id: size._id,
                  label: size.label,
                  price: size.price,
                  isAvailable,
                  unavailableIngredients:
                    unavailableIngredients.length > 0
                      ? unavailableIngredients
                      : undefined,
                  ingredients: size.ingredients || [], // Ensure it's always an array
                };
              })
            )
          : [];

        // Calculate basePrice - prefer Classic, fall back to first available
        let basePrice = null;
        const classic = sizesWithAvailability.find(
          (s) => s.label === "Classic"
        );
        
        if (classic) {
          basePrice = classic.price;
        } else if (sizesWithAvailability.length > 0) {
          // Get the lowest price as base price
          basePrice = Math.min(...sizesWithAvailability.map(s => s.price));
        }

        // Menu is available if it's marked as available AND has at least one available size
        const isMenuAvailable = menuObj.available && (
          sizesWithAvailability.length > 0
            ? sizesWithAvailability.some((size) => size.isAvailable)
            : true // If no sizes (like drinks), just use the menu's available flag
        );

        // ADD IMAGE URL LOGIC HERE
        let imageUrl = null;
        if (menuObj.image) {
          imageUrl = `${req.protocol}://${req.get('host')}/uploads/menu/${menuObj.image}`;
        }

        return {
          _id: menuObj._id,
          name: menuObj.name,
          description: menuObj.description,
          category: menuObj.category,
          available: menuObj.available,
          sizes: sizesWithAvailability,
          isAvailable: isMenuAvailable,
          basePrice,
          // ADD IMAGE FIELDS TO RESPONSE
          image: menuObj.image,
          imageAlt: menuObj.imageAlt,
          imageUrl: imageUrl,
          createdAt: menuObj.createdAt,
          updatedAt: menuObj.updatedAt,
        };
      })
    );

    // Optional: Filter out unavailable items if requested
    const finalMenus = req.query.showUnavailable === 'false' 
      ? menusWithAvailability.filter(menu => menu.isAvailable)
      : menusWithAvailability;

    res.status(200).json({
      success: true,
      data: finalMenus,
      categories: Array.from(categoriesSet).sort(), // Sort categories alphabetically
      total: finalMenus.length,
    });

  } catch (error) {
    console.error('Error in getAllMenu:', error);
    
    // Handle specific errors
    if (error.name === 'CastError') {
      return next(createHttpError(400, "Invalid menu ID format"));
    }
    
    if (error.name === 'ValidationError') {
      return next(createHttpError(400, `Validation error: ${error.message}`));
    }
    
    // Generic server error
    next(createHttpError(500, "Failed to fetch menu items"));
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
    const { name, description, category, sizes, price, available } = req.body;

    // Validate required fields upfront
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return next(createHttpError(400, "Name is required and must be a non-empty string"));
    }

    if (!category || typeof category !== 'string') {
      return next(createHttpError(400, "Category is required and must be a string"));
    }

    // Get allowed categories from the model schema
    const allowedCategories = Menu.schema.path('category').enumValues;
    
    if (!allowedCategories.includes(category)) {
      return next(createHttpError(400, 
        `Invalid category "${category}". Allowed categories: ${allowedCategories.join(", ")}`
      ));
    }

    // Check if menu item with same name already exists
    const existingMenuItem = await Menu.findOne({ 
      name: name.trim() 
    });
    
    if (existingMenuItem) {
      return next(createHttpError(409, `Menu item with name "${name}" already exists`));
    }

    let processedSizes = [];

    if (category === "ramen") {
      // Ramen items must have sizes with ingredients
      if (!sizes || !Array.isArray(sizes) || sizes.length === 0) {
        return next(createHttpError(400, 
          "At least one size must be provided for ramen items"
        ));
      }

      // Validate each size for ramen
      for (const size of sizes) {
        const { label, price: sizePrice, ingredients } = size;

        // Validate size structure
        if (!label || typeof label !== 'string') {
          return next(createHttpError(400, 
            "Each size must have a valid label"
          ));
        }

        if (!sizePrice || typeof sizePrice !== 'number' || sizePrice <= 0) {
          return next(createHttpError(400, 
            `Size "${label}" must have a valid price greater than 0`
          ));
        }

        if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
          return next(createHttpError(400, 
            `Size "${label}" must have at least one ingredient`
          ));
        }

        // Get allowed size labels from the model schema
        const allowedLabels = Menu.schema.path('sizes').schema.path('label').enumValues;
        if (!allowedLabels.includes(label)) {
          return next(createHttpError(400, 
            `Invalid size label "${label}". Allowed labels: ${allowedLabels.join(", ")}`
          ));
        }

        // Process ingredients for this size
        const processedIngredients = [];
        
        for (const item of ingredients) {
          if (!item.name || typeof item.name !== 'string') {
            return next(createHttpError(400, 
              `Invalid ingredient name in size "${label}"`
            ));
          }

          if (!item.quantity || typeof item.quantity !== 'number' || item.quantity <= 0) {
            return next(createHttpError(400, 
              `Invalid quantity for ingredient "${item.name}" in size "${label}"`
            ));
          }

          // Find ingredient in database
          const foundIngredient = await Ingredient.findOne({ 
            name: item.name.trim() 
          });
          
          if (!foundIngredient) {
            return next(createHttpError(400, 
              `Ingredient "${item.name}" not found for size "${label}"`
            ));
          }

          processedIngredients.push({
            ingredient: foundIngredient._id,
            quantity: item.quantity,
          });
        }

        processedSizes.push({
          label,
          price: sizePrice,
          ingredients: processedIngredients,
        });
      }

    } else {
      // Non-ramen items: single size with price from root level
      if (!price || typeof price !== 'number' || price <= 0) {
        return next(createHttpError(400, 
          "Price is required and must be greater than 0 for non-ramen items"
        ));
      }

      // Process ingredients for non-ramen items if provided
      let processedIngredients = [];
      
      if (sizes && Array.isArray(sizes) && sizes[0] && sizes[0].ingredients) {
        const ingredients = sizes[0].ingredients;
        
        if (Array.isArray(ingredients) && ingredients.length > 0) {
          for (const item of ingredients) {
            if (!item.name || typeof item.name !== 'string') {
              return next(createHttpError(400, 
                "Invalid ingredient name for non-ramen item"
              ));
            }

            if (!item.quantity || typeof item.quantity !== 'number' || item.quantity <= 0) {
              return next(createHttpError(400, 
                `Invalid quantity for ingredient "${item.name}"`
              ));
            }

            // Find ingredient in database
            const foundIngredient = await Ingredient.findOne({ 
              name: item.name.trim() 
            });
            
            if (!foundIngredient) {
              return next(createHttpError(400, 
                `Ingredient "${item.name}" not found`
              ));
            }

            processedIngredients.push({
              ingredient: foundIngredient._id,
              quantity: item.quantity,
            });
          }
        }
      }

      processedSizes = [{
        price,
        ingredients: processedIngredients,
      }];
    }

    // Check for duplicate size labels
    const sizeLabels = processedSizes.map(size => size.label);
    const uniqueLabels = [...new Set(sizeLabels)];
    
    if (sizeLabels.length !== uniqueLabels.length) {
      return next(createHttpError(400, 
        "Duplicate size labels are not allowed"
      ));
    }

    // Create the menu item
    const newMenuItem = new Menu({
      name: name.trim(),
      description: description ? description.trim() : undefined,
      category,
      available: available !== undefined ? Boolean(available) : true,
      sizes: processedSizes,
    });

    // Save to database
    const savedMenuItem = await newMenuItem.save();

    // Populate the ingredients for response
    await savedMenuItem.populate('sizes.ingredients.ingredient');

    // Success response
    res.status(201).json({
      success: true,
      message: "Menu item created successfully",
      data: {
        menuItem: savedMenuItem
      }
    });

  } catch (error) {
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const errorMessages = Object.values(error.errors).map(err => err.message);
      return next(createHttpError(400, `Validation failed: ${errorMessages.join(', ')}`));
    }

    // Handle duplicate key errors (shouldn't happen due to our check, but just in case)
    if (error.code === 11000) {
      return next(createHttpError(409, "A menu item with this name already exists"));
    }

    // Handle any other unexpected errors
    console.error('Error creating menu item:', error);
    return next(createHttpError(500, "Internal server error while creating menu item"));
  }
};


const updateMenu = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const menuItem = await Menu.findById(id);
    if (!menuItem) {
      throw createHttpError(404, "Menu item not found");
    }

    // Update basic fields
    if (updateData.name) menuItem.name = updateData.name;
    if (updateData.description) menuItem.description = updateData.description;

    // Handle category changes
    if (updateData.category) {
      menuItem.category = updateData.category;

      // If changing TO ramen, ensure sizes exist
      if (
        updateData.category === "ramen" &&
        (!menuItem.sizes || menuItem.sizes.length === 0)
      ) {
        if (!updateData.sizes || updateData.sizes.length === 0) {
          return next(
            createHttpError(
              400,
              "Sizes are required when changing category to ramen"
            )
          );
        }
      }

      // If changing FROM ramen to normal, clear sizes
      if (
        updateData.category !== "ramen" &&
        menuItem.sizes &&
        menuItem.sizes.length > 0
      ) {
        menuItem.sizes = [];
      }
    }

    // Handle size updates (only for ramen category)
    if (updateData.sizes && Array.isArray(updateData.sizes)) {
      if (menuItem.category !== "ramen") {
        return next(createHttpError(400, "Only ramen category can have sizes"));
      }

      // Your existing size update logic here...
      for (const updatedSize of updateData.sizes) {
        const existingSize = menuItem.sizes.find(
          (s) => s.label === updatedSize.label
        );
        if (!existingSize) {
          continue;
        }

        if (updatedSize.price !== undefined) {
          existingSize.price = updatedSize.price;
        }

        if (updatedSize.ingredients && Array.isArray(updatedSize.ingredients)) {
          const ingredientIds = updatedSize.ingredients.map(
            (ing) => ing.ingredient
          );
          const existingIngredients = await Ingredient.find({
            _id: { $in: ingredientIds },
          });
          if (existingIngredients.length !== ingredientIds.length) {
            throw createHttpError(
              404,
              `One or more ingredients not found for size ${updatedSize.label}`
            );
          }
          existingSize.ingredients = updatedSize.ingredients;
        }
      }
    }

    await menuItem.save();

    res.status(200).json({
      success: true,
      message: "Menu updated successfully",
      data: menuItem,
    });
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

export { addMenu, updateMenu, getAllMenu, getMenuById };
