import Ingredient from "../model/ingredientModel.js";
import Delivery from "../model/deliveryModel.js";
import createHttpError from "http-errors";

const addDelivery = async (req, res, next) => {
    try {
        const { supplier, deliveryNumber, deliveryDate, items, address } = req.body;

        // Validate required fields
        if (!supplier || !deliveryNumber || !address || !items || !Array.isArray(items) || items.length === 0) {
            const error = createHttpError(400, "Supplier, delivery number, address, and items are required");
            return next(error);
        }

        // Validate each item
        for (const item of items) {
            if (!item.ingredient || !item.quantity || item.quantity <= 0) {
                return next(createHttpError(400, "Each item must have a valid ingredient ID and positive quantity"));
            }

            if (!item.expirationDate) {
                return next(createHttpError(400, "Each item must have an expiration date"));
            }

            if (item.price === undefined || item.price < 0) {
                return next(createHttpError(400, "Each item must have a valid price"));
            }
        }

        const deliveryData = {
            supplier: supplier.trim(),
            deliveryNumber: deliveryNumber.trim(),
            address: address.trim(),
            items: items.map(item => ({
                ...item,
                expirationDate: new Date(item.expirationDate),
            })),
            updatedAt: new Date()
        };

        if (deliveryDate) {
            deliveryData.deliveryDate = new Date(deliveryDate);
        }

        const delivery = new Delivery(deliveryData);
        await delivery.save();

        for (const item of delivery.items) {
            const ingredient = await Ingredient.findById(item.ingredient);

            if (ingredient) {
                let quantityToAdd = item.quantity;

                if (item.unitPerPcs) {
                    quantityToAdd = item.quantity * item.unitPerPcs;
                }

                // Add new batch to ingredient
                await ingredient.addBatch(quantityToAdd, item.expirationDate, delivery._id);

                console.log(`✅ Added batch: ${quantityToAdd}${ingredient.unit} of ${ingredient.name} - Expires: ${item.expirationDate.toDateString()}`);
            } else {
                await Delivery.findByIdAndDelete(delivery._id);
                return next(createHttpError(404, `Ingredient with ID ${item.ingredient} not found`));
            }
        }

        await delivery.populate('items.ingredient', 'name unit');

        res.status(201).json({
            success: true,
            message: "Delivery added successfully",
            data: delivery
        });
    } catch (error) {
        next(error);
    }
};


const getDeliveryByDate = async (req, res, next) => {
  const { startDate, endDate } = req.query;

  if (!startDate || !endDate) {
    return res.status(400).json({
      success: false,
      message: "Please provide start and end date"
    });
  }

  try {
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid date format"
      });
    }

    if (start > end) {
      return res.status(400).json({
        success: false,
        message: "startDate must be before endDate"
      });
    }

    end.setUTCHours(23, 59, 59, 999);

    const deliveries = await Delivery.find({
      deliveryDate: { $gte: start, $lte: end }
    }).populate('items.ingredient', 'name unit');

    const formatted = deliveries.map(delivery => ({
      deliveryNumber: delivery.deliveryNumber,
      deliveryDate: delivery.deliveryDate,
      supplier: delivery.supplier,
      address: delivery.address,
      notes: delivery.notes,
      items: delivery.items.map(item => ({
        ingredientName: item.ingredient?.name || "N/A",
        unit: item.ingredient?.unit || "N/A",
        quantity: item.quantity,
        unitPerPcs: item.unitPerPcs,
        price: item.price,
        expirationDate: item.expirationDate
      }))
    }));

    return res.status(200).json({
      success: true,
      message: "Deliveries retrieved successfully",
      data: formatted
    });
  } catch (error) {
    next(error);
  }
};



const getAllDelivery = async (req, res, next) => {
  try {
    const deliveries = await Delivery.find().populate('items.ingredient', 'name unit');

    if (!deliveries || deliveries.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No deliveries found"
      });
    }

    const formatted = deliveries.map(delivery => ({
      deliveryNumber: delivery.deliveryNumber,
      deliveryDate: delivery.deliveryDate,
      supplier: delivery.supplier,
      address: delivery.address,
      notes: delivery.notes,
      items: delivery.items.map(item => ({
        ingredientName: item.ingredient?.name || "N/A",
        unit: item.ingredient?.unit || "N/A",
        quantity: item.quantity,
        unitPerPcs: item.unitPerPcs,
        price: item.price,
        expirationDate: item.expirationDate
      }))
    }));

    return res.status(200).json({
      success: true,
      message: "Deliveries retrieved successfully",
      data: formatted
    });
  } catch (error) {
    next(error);
  }
};



const deleteDelivery = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Delivery ID is required",
      });
    }

    const deletedDelivery = await Delivery.findByIdAndDelete(id);

    if (!deletedDelivery) {
      return res.status(404).json({
        success: false,
        message: "Delivery not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Delivery deleted successfully",
      data: deletedDelivery,
    });
  } catch (error) {
    next(error);
  }
};

export { addDelivery, getDeliveryByDate, getAllDelivery, deleteDelivery };