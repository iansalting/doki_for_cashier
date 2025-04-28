import mongoose from "mongoose"

const orderSchema = new mongoose.Schema({
    tableNumber: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'completed', 'cancelled'],
        default: 'pending'
    },
    orderDate: {
        type: Date,
        default : Date.now()
    },
    bills: {
        total: { type: Number, required: true},
    },
    items: [
         {
            menuItem: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Menu",
                required: true
            },
            quantity: {
                type: Number,
                required: true,
                default: 1
            }
         }
    ],
    paymennt: {
        type: String,
        default: "cashless",
        required:true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
},{timestamps: true});

const Order = mongoose.model('Order', orderSchema);
export default Order;
