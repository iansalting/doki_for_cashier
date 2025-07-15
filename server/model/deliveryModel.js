import mongoose from "mongoose";


const deliverySchema = new mongoose.Schema({
    supplier: {
        type: String,
        required: true,
        trim: true
    },
    deliveryDate: {
        type: Date,
        required: true,
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
            required: true,
            min: 0
        }
    }],
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});


const delivery  = mongoose.model('delivery', deliverySchema);

export default delivery;