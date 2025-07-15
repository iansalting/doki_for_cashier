import Ingredient from "../model/ingredientModel.js";
import Delivery from "../model/deliveryModel.js";
import createHttpError from "http-errors";

const addDelivery = async (req, res, next) => {
    try {
        // Validate required fields
        const { supplier, deliveryDate, items } = req.body;
        
        if (!supplier || !items || !Array.isArray(items) || items.length === 0) {
            const error = createHttpError(400, "Supplier and items are required");
            return next(error);
        }

        // Validate each item
        for (const item of items) {
            if (!item.ingredient || !item.quantity || item.quantity <= 0) {
                const error = createHttpError(400, "Each item must have a valid ingredient ID and positive quantity");
                return next(error);
            }
        }

        // Create delivery with updatedAt timestamp
        const deliveryData = {
            supplier: supplier.trim(),
            items,
            updatedAt: new Date()
        };

        // Only set deliveryDate if provided, otherwise use default
        if (deliveryDate) {
            deliveryData.deliveryDate = new Date(deliveryDate);
        }

        const delivery = new Delivery(deliveryData);
        await delivery.save();

        // Update ingredient quantities
        for (const item of delivery.items) {
            const existingIngredient = await Ingredient.findById(item.ingredient);

            if (existingIngredient) {
                existingIngredient.quantity += item.quantity;
                existingIngredient.updatedAt = new Date(); // Update timestamp if Ingredient model has this field
                await existingIngredient.save();
            } else {
                // If ingredient not found, remove the delivery that was just created
                await Delivery.findByIdAndDelete(delivery._id);
                const error = createHttpError(404, `Ingredient with ID ${item.ingredient} not found`);
                return next(error);
            }
        }

        // Populate ingredient details in response
        await delivery.populate('items.ingredient', 'name unit'); // Adjust fields based on your Ingredient model
        
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

        // Check for invalid dates
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

        // Set end date to end of day to include the full end date
        end.setUTCHours(23, 59, 59, 999);

        const deliveries = await Delivery.find({
            deliveryDate: {
                $gte: start,
                $lte: end
            }
        }).populate('items.ingredient');

        return res.status(200).json({
            success: true,
            message: "Deliveries retrieved successfully",
            data: deliveries
        });
    } catch (error) {
        next(error);
    }
};

const getAllDelivery = async (req, res, next) => {
    try {
        const deliveries = await Delivery.find().populate('items.ingredient');

        if (!deliveries || deliveries.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No deliveries found"
            });
        }
        
        return res.status(200).json({
            success: true,
            message: "Deliveries retrieved successfully",
            data: deliveries
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
                message: "Delivery ID is required"
            });
        }

        const delivery = await Delivery.findById(id);
        
        if (!delivery) {
            return res.status(404).json({
                success: false,
                message: "Delivery not found"
            });
        }

        // Reverse the inventory changes before deleting
        for (const item of delivery.items) {
            const existingIngredient = await Ingredient.findById(item.ingredient);
            
            if (existingIngredient) {
                existingIngredient.quantity -= item.quantity;
                // Ensure quantity doesn't go negative
                if (existingIngredient.quantity < 0) {
                    existingIngredient.quantity = 0;
                }
                await existingIngredient.save();
            }
        }

        await Delivery.findByIdAndDelete(id);

        return res.status(200).json({
            success: true,
            message: "Delivery deleted successfully",
            data: delivery
        });
    } catch (error) {
        next(error);
    }
};

export { addDelivery, getDeliveryByDate, getAllDelivery, deleteDelivery };