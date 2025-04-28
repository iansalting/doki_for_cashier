import mongoose from "mongoose";

const deliverySchema = new mongoose.Schema({
    deliveryDate: {
        type: Date,
        default: Date.now
    },
    items: [{
        ingredient: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Ingredient',
            required: true
        },
        quantity: {
         type: Number,
         required: true
        }
    }]
})

const delivery = mongoose.model("delivery", deliverySchema);
export default delivery;