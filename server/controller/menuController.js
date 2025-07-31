import config from "../config/config.js";
import Ingredient from "../model/ingredientModel.js";
import Menu from "../model/menuModel.js";
import createHttpError from "http-errors";
import NodeCache from "node-cache";
const cache = new NodeCache({ stdTTL: 3600 });
const getImageUrl = (menu) => {
  try {
    if (!menu.image) {
      return null;
    }

    const currentPort = config.port || "8000";

    if (currentPort === "8000" && menu.imageUrlPort8000) {
      console.log(
        `🖼️ Using stored URL for port 8000: ${menu.imageUrlPort8000}`
      );
      return menu.imageUrlPort8000;
    }
    if (currentPort === "5000" && menu.imageUrlPort5000) {
      console.log(
        `🖼️ Using stored URL for port 5000: ${menu.imageUrlPort5000}`
      );
      return menu.imageUrlPort5000;
    }

    // Fallback: construct URL dynamically
    const baseUrl = config.baseUrl || `http://localhost:${currentPort}`;
    const cleanBaseUrl = baseUrl.replace(/\/$/, "");
    const imageUrl = `${cleanBaseUrl}/uploads/menu/${menu.image}`;

    console.log(`🖼️ Generated fallback image URL: ${imageUrl}`);
    return imageUrl;
  } catch (error) {
    console.error("❌ Error constructing image URL:", error);
    return null;
  }
};

const getAllMenu = async (req, res, next) => {
  const startTime = Date.now();
  console.log('🚀 Starting getAllMenu...');
  
  try {
    res.set({
      'Cache-Control': 'no-store',
      Pragma: 'no-cache',
      Expires: '0',
      Vary: 'Accept-Encoding, Authorization',
    });

    const { category, available, showUnavailable } = req.query;

    // Build query filter
    let filter = {};
    if (category) {
      filter.category = category;
    }
    if (available !== undefined) {
      filter.available = available === 'true';
    }

    console.log('📊 Database query starting...');
    const dbStartTime = Date.now();

    // Fetch menus with populated ingredients - INCLUDE imageUrl fields
    const menus = await Menu.find(filter)
      .populate({
        path: 'sizes.ingredients.ingredient',
        select: 'name unit batches',
        options: { virtuals: true },
      })
      .select('name description category available sizes image imageAlt imageUrlPort8000 imageUrlPort5000 createdAt updatedAt')
      .lean()
      .sort({ category: 1, name: 1 });

    console.log(`📊 Database query completed in: ${Date.now() - dbStartTime}ms`);

    if (!menus || menus.length === 0) {
      console.log(`✅ getAllMenu completed (empty) in: ${Date.now() - startTime}ms`);
      return res.status(200).json({
        success: true,
        data: [],
        categories: [],
        message: 'No menu items found',
      });
    }

    console.log('🔄 Processing menus...');
    const processingStartTime = Date.now();

    const categoriesSet = new Set();

    // Process menus with availability check
    const menusWithAvailability = await Promise.all(
      menus.map(async (menu) => {
        // Collect category
        if (menu.category) {
          categoriesSet.add(menu.category);
        }

        // Process sizes with availability check
        const sizesWithAvailability = Array.isArray(menu.sizes)
          ? await Promise.all(
              menu.sizes.map(async (size) => {
                let isAvailable = true;
                const unavailableIngredients = [];

                if (size.ingredients && size.ingredients.length > 0) {
                  for (const menuIngredient of size.ingredients) {
                    try {
                      const ingredientDoc = menuIngredient.ingredient;

                      if (!ingredientDoc) {
                        isAvailable = false;
                        unavailableIngredients.push({
                          name: 'Unknown ingredient',
                          reason: 'Ingredient not found or not populated',
                        });
                        continue;
                      }

                      let totalAvailable = 0;
                      if (
                        Array.isArray(ingredientDoc.batches) &&
                        ingredientDoc.batches.length > 0
                      ) {
                        console.log(`🔍 Ingredient: ${ingredientDoc.name}`);
                        const now = new Date();
                        const validBatches = ingredientDoc.batches.filter(
                          (batch) => new Date(batch.expirationDate) > now && batch.quantity > 0
                        );
                        totalAvailable = validBatches.reduce(
                          (sum, batch) => sum + batch.quantity,
                          0
                        );
                      } else if (ingredientDoc.totalQuantity !== undefined) {
                        totalAvailable = ingredientDoc.totalQuantity;
                      }

                      const requiredQuantity = menuIngredient.quantity || 1;

                      if (totalAvailable < requiredQuantity) {
                        isAvailable = false;
                        unavailableIngredients.push({
                          name: ingredientDoc.name,
                          required: requiredQuantity,
                          available: totalAvailable,
                          unit: ingredientDoc.unit || 'units',
                          reason:
                            totalAvailable === 0
                              ? 'Out of stock or all batches expired'
                              : 'Insufficient stock',
                        });
                      }
                    } catch (err) {
                      console.error('❌ Error checking ingredient availability:', err.message);
                      isAvailable = false;
                      unavailableIngredients.push({
                        name: 'Error checking ingredient',
                        reason: err.message,
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
                    unavailableIngredients.length > 0 ? unavailableIngredients : undefined,
                  ingredients: size.ingredients || [],
                };
              })
            )
          : [];

        // Calculate basePrice
        let basePrice = null;
        const classic = sizesWithAvailability.find((s) => s.label === 'Classic');
        if (classic) {
          basePrice = classic.price;
        } else if (sizesWithAvailability.length > 0) {
          basePrice = Math.min(...sizesWithAvailability.map((s) => s.price));
        }

        // Determine menu availability
        const isMenuAvailable =
          menu.available &&
          (sizesWithAvailability.length > 0
            ? sizesWithAvailability.some((size) => size.isAvailable)
            : true);

        // FIXED: Get image URL using the getImageUrl function
        const imageUrl = getImageUrl(menu);

        return {
          _id: menu._id,
          name: menu.name,
          description: menu.description,
          category: menu.category,
          available: menu.available,
          sizes: sizesWithAvailability,
          isAvailable: isMenuAvailable,
          basePrice,
          image: {
            filename: menu.image || null,
            url: imageUrl,
            alt: menu.imageAlt || `Image of ${menu.name}`,
          },
          createdAt: menu.createdAt,
          updatedAt: menu.updatedAt,
        };
      })
    );

    console.log(`🔄 Menu processing completed in: ${Date.now() - processingStartTime}ms`);

    // Filter out unavailable items if requested
    const finalMenus =
      showUnavailable === 'false'
        ? menusWithAvailability.filter((menu) => menu.isAvailable)
        : menusWithAvailability;

    res.set('X-Response-Time', `${Date.now() - startTime}ms`);

    console.log(`✅ getAllMenu completed in: ${Date.now() - startTime}ms`);

    res.status(200).json({
      success: true,
      data: finalMenus,
      categories: Array.from(categoriesSet).sort(),
      total: finalMenus.length,
      cache: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('❌ Error in getAllMenu:', error);
    console.log(`❌ getAllMenu failed in: ${Date.now() - startTime}ms`);

    if (error.name === 'CastError') {
      return next(createHttpError(400, 'Invalid menu ID format'));
    }
    if (error.name === 'ValidationError') {
      return next(createHttpError(400, `Validation error: ${error.message}`));
    }
    next(createHttpError(500, 'Failed to fetch menu items'));
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
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return next(
        createHttpError(400, "Name is required and must be a non-empty string")
      );
    }

    if (!category || typeof category !== "string") {
      return next(
        createHttpError(400, "Category is required and must be a string")
      );
    }

    // Get allowed categories from the model schema
    const allowedCategories = Menu.schema.path("category").enumValues;

    if (!allowedCategories.includes(category)) {
      return next(
        createHttpError(
          400,
          `Invalid category "${category}". Allowed categories: ${allowedCategories.join(
            ", "
          )}`
        )
      );
    }

    // Check if menu item with same name already exists
    const existingMenuItem = await Menu.findOne({
      name: name.trim(),
    });

    if (existingMenuItem) {
      return next(
        createHttpError(409, `Menu item with name "${name}" already exists`)
      );
    }

    let processedSizes = [];

    if (category === "ramen") {
      // Ramen items must have sizes with ingredients
      if (!sizes || !Array.isArray(sizes) || sizes.length === 0) {
        return next(
          createHttpError(
            400,
            "At least one size must be provided for ramen items"
          )
        );
      }

      // Validate each size for ramen
      for (const size of sizes) {
        const { label, price: sizePrice, ingredients } = size;

        // Validate size structure
        if (!label || typeof label !== "string") {
          return next(
            createHttpError(400, "Each size must have a valid label")
          );
        }

        if (!sizePrice || typeof sizePrice !== "number" || sizePrice <= 0) {
          return next(
            createHttpError(
              400,
              `Size "${label}" must have a valid price greater than 0`
            )
          );
        }

        if (
          !ingredients ||
          !Array.isArray(ingredients) ||
          ingredients.length === 0
        ) {
          return next(
            createHttpError(
              400,
              `Size "${label}" must have at least one ingredient`
            )
          );
        }

        // Get allowed size labels from the model schema
        const allowedLabels = Menu.schema
          .path("sizes")
          .schema.path("label").enumValues;
        if (!allowedLabels.includes(label)) {
          return next(
            createHttpError(
              400,
              `Invalid size label "${label}". Allowed labels: ${allowedLabels.join(
                ", "
              )}`
            )
          );
        }

        // Process ingredients for this size
        const processedIngredients = [];

        for (const item of ingredients) {
          if (!item.name || typeof item.name !== "string") {
            return next(
              createHttpError(400, `Invalid ingredient name in size "${label}"`)
            );
          }

          if (
            !item.quantity ||
            typeof item.quantity !== "number" ||
            item.quantity <= 0
          ) {
            return next(
              createHttpError(
                400,
                `Invalid quantity for ingredient "${item.name}" in size "${label}"`
              )
            );
          }

          // Find ingredient in database
          const foundIngredient = await Ingredient.findOne({
            name: item.name.trim(),
          });

          if (!foundIngredient) {
            return next(
              createHttpError(
                400,
                `Ingredient "${item.name}" not found for size "${label}"`
              )
            );
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
      if (!price || typeof price !== "number" || price <= 0) {
        return next(
          createHttpError(
            400,
            "Price is required and must be greater than 0 for non-ramen items"
          )
        );
      }

      // Process ingredients for non-ramen items if provided
      let processedIngredients = [];

      if (sizes && Array.isArray(sizes) && sizes[0] && sizes[0].ingredients) {
        const ingredients = sizes[0].ingredients;

        if (Array.isArray(ingredients) && ingredients.length > 0) {
          for (const item of ingredients) {
            if (!item.name || typeof item.name !== "string") {
              return next(
                createHttpError(
                  400,
                  "Invalid ingredient name for non-ramen item"
                )
              );
            }

            if (
              !item.quantity ||
              typeof item.quantity !== "number" ||
              item.quantity <= 0
            ) {
              return next(
                createHttpError(
                  400,
                  `Invalid quantity for ingredient "${item.name}"`
                )
              );
            }

            // Find ingredient in database
            const foundIngredient = await Ingredient.findOne({
              name: item.name.trim(),
            });

            if (!foundIngredient) {
              return next(
                createHttpError(400, `Ingredient "${item.name}" not found`)
              );
            }

            processedIngredients.push({
              ingredient: foundIngredient._id,
              quantity: item.quantity,
            });
          }
        }
      }

      processedSizes = [
        {
          price,
          ingredients: processedIngredients,
        },
      ];
    }

    // Check for duplicate size labels
    const sizeLabels = processedSizes.map((size) => size.label);
    const uniqueLabels = [...new Set(sizeLabels)];

    if (sizeLabels.length !== uniqueLabels.length) {
      return next(
        createHttpError(400, "Duplicate size labels are not allowed")
      );
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
    await savedMenuItem.populate("sizes.ingredients.ingredient");

    // Success response
    res.status(201).json({
      success: true,
      message: "Menu item created successfully",
      data: {
        menuItem: savedMenuItem,
      },
    });
  } catch (error) {
    // Handle validation errors
    if (error.name === "ValidationError") {
      const errorMessages = Object.values(error.errors).map(
        (err) => err.message
      );
      return next(
        createHttpError(400, `Validation failed: ${errorMessages.join(", ")}`)
      );
    }

    // Handle duplicate key errors (shouldn't happen due to our check, but just in case)
    if (error.code === 11000) {
      return next(
        createHttpError(409, "A menu item with this name already exists")
      );
    }

    // Handle any other unexpected errors
    console.error("Error creating menu item:", error);
    return next(
      createHttpError(500, "Internal server error while creating menu item")
    );
  }
};

const updateMenu = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    console.log("Received update request:", { id, updateData });

    // Validate menuId
    const isValidObjectId = (id) => /^[0-9a-fA-F]{24}$/.test(id);
    if (!isValidObjectId(id)) {
      throw createHttpError(400, `Invalid menu ID: ${id}`);
    }

    // Find menu item
    const menuItem = await Menu.findById(id);
    if (!menuItem) {
      throw createHttpError(404, "Menu item not found");
    }

    console.log("Menu category:", menuItem.category);

    // Update basic fields
    if (updateData.name) menuItem.name = updateData.name;
    if (updateData.description) menuItem.description = updateData.description;
    if (updateData.available !== undefined)
      menuItem.available = updateData.available;

    // Handle category changes
    if (updateData.category) {
      menuItem.category = updateData.category;

      if (
        updateData.category === "ramen" &&
        (!menuItem.sizes || menuItem.sizes.length === 0) &&
        (!updateData.sizes || updateData.sizes.length === 0)
      ) {
        throw createHttpError(
          400,
          "Sizes are required when changing category to ramen"
        );
      }
    }

    // Handle size updates for all categories
    if (updateData.sizes && Array.isArray(updateData.sizes)) {
      for (const updatedSize of updateData.sizes) {
        const existingSize = menuItem.sizes.find(
          (s) => s.label === updatedSize.label
        );
        if (!existingSize) {
          // Add new size
          menuItem.sizes.push({
            label: updatedSize.label,
            price: parseFloat(updatedSize.price) || 0,
            ingredients: updatedSize.ingredients || [],
            isAvailable:
              updatedSize.isAvailable !== undefined
                ? updatedSize.isAvailable
                : true,
          });
          continue;
        }

        // Update existing size
        if (updatedSize.price !== undefined) {
          console.log(
            `Updating price for size ${updatedSize.label}:`,
            updatedSize.price
          );
          existingSize.price = parseFloat(updatedSize.price) || 0;
        }
        if (updatedSize.isAvailable !== undefined) {
          existingSize.isAvailable = updatedSize.isAvailable;
        }

        if (updatedSize.ingredients && Array.isArray(updatedSize.ingredients)) {
          const ingredientIds = updatedSize.ingredients
            .map((ing) => ing.ingredient)
            .filter(Boolean);
          if (ingredientIds.length > 0) {
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
          } else {
            existingSize.ingredients = [];
          }
        }
      }
    }

    // For non-ramen items, ensure a "Classic" size exists if sizes are updated
    if (
      menuItem.category !== "ramen" &&
      updateData.sizes &&
      updateData.sizes.length > 0 &&
      !menuItem.sizes.some((s) => s.label === "Classic")
    ) {
      const classicSize = updateData.sizes.find((s) => s.label === "Classic");
      if (classicSize) {
        menuItem.sizes.push({
          label: "Classic",
          price: parseFloat(classicSize.price) || 0,
          ingredients: [],
          isAvailable: true,
        });
      }
    }

    const updatedMenu = await menuItem.save();
    console.log("Updated menu:", updatedMenu);

    // Populate the response
    const populatedMenu = await Menu.findById(id).populate({
      path: "sizes.ingredients.ingredient",
      select: "name unit batches",
    });

    res.status(200).json({
      success: true,
      message: "Menu updated successfully",
      data: populatedMenu || updatedMenu,
    });
  } catch (error) {
    console.error("Update error:", error);
    next(error);
  }
};

const deleteSizeIngredient = async (req, res, next) => {
  try {
    const { menuId, label, ingredientId } = req.params;

    console.log("Received delete request:", { menuId, label, ingredientId }); // Debug

    if (!ingredientId) {
      throw createHttpError(400, "Ingredient ID is required");
    }

    const isValidObjectId = (id) => /^[0-9a-fA-F]{24}$/.test(id);
    if (!isValidObjectId(ingredientId)) {
      throw createHttpError(400, `Invalid ingredient ID: ${ingredientId}`);
    }

    const menuItem = await Menu.findById(menuId);
    if (!menuItem) {
      throw createHttpError(404, "Menu item not found");
    }

    const size = menuItem.sizes.find((s) => s.label === label);
    if (!size) {
      throw createHttpError(404, `Size '${label}' not found`);
    }

    console.log(
      "Current ingredients in size:",
      JSON.stringify(size.ingredients, null, 2)
    ); // Debug

    const ingredientIndex = size.ingredients.findIndex((ing) => {
      const currentId =
        typeof ing.ingredient === "object" && ing.ingredient
          ? (ing.ingredient._id || ing.ingredient.id)?.toString()
          : ing.ingredient?.toString();
      return currentId === ingredientId.toString();
    });

    if (ingredientIndex === -1) {
      console.log(
        "Available ingredient IDs:",
        size.ingredients
          .map((ing) =>
            (typeof ing.ingredient === "object" && ing.ingredient
              ? ing.ingredient._id || ing.ingredient.id
              : ing.ingredient
            )?.toString()
          )
          .filter(Boolean)
      ); // Debug
      throw createHttpError(404, "Ingredient not found in size");
    }

    size.ingredients.splice(ingredientIndex, 1);
    await menuItem.save();

    res.status(200).json({
      success: true,
      message: "Ingredient deleted successfully",
      data: menuItem,
    });
  } catch (error) {
    console.error("Delete error:", error); // Debug
    next(error);
  }
};

const addSizeIngredient = async (req, res, next) => {
  try {
    const { menuId, label } = req.params;
    const { ingredientId, quantity } = req.body;

    console.log("Received ingredientId:", ingredientId); // Debug

    if (!ingredientId || !quantity || quantity <= 0) {
      throw createHttpError(
        400,
        "Ingredient ID and positive quantity are required"
      );
    }

    const ingredient = await Ingredient.findById(ingredientId);
    if (!ingredient) {
      throw createHttpError(404, "Ingredient not found");
    }

    if (!ingredientId || !quantity || quantity <= 0) {
      throw createHttpError(
        400,
        "Ingredient ID and positive quantity are required"
      );
    }

    const menuItem = await Menu.findById(menuId);
    if (!menuItem) {
      throw createHttpError(404, "Menu item not found");
    }

    const size = menuItem.sizes.find((s) => s.label === label);
    if (!size) {
      throw createHttpError(404, `Size '${label}' not found`);
    }

    const exists = size.ingredients.some((ing) => {
      const currentId =
        typeof ing.ingredient === "object"
          ? ing.ingredient._id?.toString()
          : ing.ingredient?.toString();
      return currentId === ingredientId.toString();
    });

    if (exists) {
      throw createHttpError(400, "Ingredient already exists in size");
    }

    size.ingredients.push({
      ingredient: ingredientId,
      quantity: parseFloat(quantity),
    });

    await menuItem.save();

    res.status(200).json({
      success: true,
      message: "Ingredient added successfully",
      data: menuItem,
    });
  } catch (error) {
    next(error);
  }
};
const updateSizeIngredientQuantity = async (req, res, next) => {
  try {
    const { menuId, label, ingredientId } = req.params;
    const { quantity } = req.body;

    if (typeof quantity !== "number" || quantity <= 0) {
      return res
        .status(400)
        .json({ success: false, message: "Valid quantity is required" });
    }

    const menuItem = await Menu.findById(menuId);
    if (!menuItem) {
      throw createHttpError(404, "Menu item not found");
    }

    const size = menuItem.sizes.find((s) => s.label === label);
    if (!size) {
      throw createHttpError(404, `Size '${label}' not found`);
    }

    const ingredientEntry = size.ingredients.find((ing) => {
      const idToCompare =
        typeof ing.ingredient === "object"
          ? ing.ingredient._id?.toString()
          : ing.ingredient?.toString();
      return idToCompare === ingredientId;
    });

    if (!ingredientEntry) {
      throw createHttpError(404, "Ingredient not found in size");
    }

    // Update quantity
    ingredientEntry.quantity = quantity;
    await menuItem.save();

    res.status(200).json({
      success: true,
      message: "Ingredient quantity updated successfully",
      data: menuItem,
    });
  } catch (error) {
    next(error);
  }
};

const updateSizeIngredient = async (req, res, next) => {
  try {
    const { menuId, label, ingredientId } = req.params;
    const { newIngredientId, quantity } = req.body;

    // Find menu item
    const menuItem = await Menu.findById(menuId);
    if (!menuItem) {
      throw createHttpError(404, "Menu item not found");
    }

    // Find size
    const size = menuItem.sizes.find((s) => s.label === label);
    if (!size) {
      throw createHttpError(404, `Size '${label}' not found`);
    }

    // Find the ingredient entry
    const ingredientEntry = size.ingredients.find((ing) => {
      const idToCompare =
        typeof ing.ingredient === "object"
          ? ing.ingredient._id?.toString()
          : ing.ingredient?.toString();
      return idToCompare === ingredientId.toString();
    });

    if (!ingredientEntry) {
      throw createHttpError(404, "Ingredient not found in size");
    }

    // Update ingredient if newIngredientId provided
    if (newIngredientId && newIngredientId !== ingredientId) {
      // Verify new ingredient exists
      const newIngredient = await Ingredient.findById(newIngredientId);
      if (!newIngredient) {
        throw createHttpError(404, "New ingredient not found");
      }

      // Check if new ingredient already exists in this size
      const exists = size.ingredients.some((ing) => {
        const currentId =
          typeof ing.ingredient === "object"
            ? ing.ingredient._id?.toString()
            : ing.ingredient?.toString();
        return currentId === newIngredientId.toString();
      });

      if (exists) {
        throw createHttpError(400, "Ingredient already exists in this size");
      }

      ingredientEntry.ingredient = newIngredientId;
    }

    // Update quantity if provided
    if (quantity !== undefined && quantity !== null) {
      if (typeof quantity !== "number" || quantity <= 0) {
        throw createHttpError(400, "Quantity must be a positive number");
      }
      ingredientEntry.quantity = quantity;
    }

    await menuItem.save();

    // Determine success message
    let message = "Updated successfully";
    if (newIngredientId && quantity !== undefined) {
      message = "Ingredient and quantity updated successfully";
    } else if (newIngredientId) {
      message = "Ingredient updated successfully";
    } else if (quantity !== undefined) {
      message = "Quantity updated successfully";
    }

    res.status(200).json({
      success: true,
      message,
      data: menuItem,
    });
  } catch (error) {
    next(error);
  }
};
export {
  addMenu,
  updateMenu,
  getAllMenu,
  getMenuById,
  deleteSizeIngredient,
  addSizeIngredient,
  updateSizeIngredientQuantity,
  updateSizeIngredient,
};
