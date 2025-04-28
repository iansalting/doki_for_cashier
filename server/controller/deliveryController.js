import Ingredient from "../model/ingredientModel.js";
import Delivery from "../model/deliveryModel.js";
import createHttpError from "http-errors";

const addDelivery = async ( req, res, next) => {
    try {
        const delivery = new Delivery(req.body);
        await delivery.save();

        for (const item of delivery.items) {
            const existingIngredient = await Ingredient.findById(item.ingredient);

            if (existingIngredient) {
                existingIngredient.quantity += item.quantity;
                await existingIngredient.save();
            } else {
                const error = createHttpError(404, "Item not found");
                return next(error);
            }
        }
        res.status(201).json({success:true, message: " Delivery added successfully", data: delivery});

    } catch (error) {
        next(error)
    }
}

const getDeliveryByDate = async (req, res, next) => {
    const { startDate, endDate} = req.query;
    if( !startDate || !endDate ) return res.status(400).json({message: "Please provide start and end date"});
    try {
        const  start = new Date(startDate);

        const end = new Date(endDate);

        if (start > end) {
            return res.status(400).json({
                message: 'startDate must be before endDate.'
            });
        }

        const deliveries = await Delivery.find({
            deliveryDate: {
                $gte: start,
                $lte: end
            }
        });

        
         return res.status(200).json(deliveries)
    } catch (error) {
        next(error)
    }
}

const getAllDelivery = async (req, res, next) => {
    try {
        const delivery = await Delivery.find().populate('items.ingredient');

        if(!delivery ) return res.status(404).json({message: "No delivery found"});
        return res.status(200).json(delivery);


    } catch (error) {
        next(error)
    }
}

const deleteDelivery = async (req, res, next) => {
    try {
        const {id} = req.params;
        const delivery = await Delivery.findByIdAndDelete(id);
        if(!delivery) return res.status(404).json({message: "No delivery found"})
        
        return res.status(200).json({success: true, message: "deleted succesfully",data: delivery});

    } catch (error) {
        next(error)
    }
}

export {addDelivery, getDeliveryByDate, getAllDelivery, deleteDelivery};