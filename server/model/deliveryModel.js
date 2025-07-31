import mongoose from "mongoose";

const deliverySchema = new mongoose.Schema({
  supplier: {
    type: String,
    required: true,
    trim: true,
  },
  deliveryNumber: {
    type: String,
    required: true,
  },
  deliveryDate: {
    type: Date,
    required: true,
    default: Date.now,
  },
  address: {
    type: String,
    required: true,
    trim: true,
  },
  items: [
    {
      ingredient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Ingredient",
        required: true,
      },
      quantity: {
        type: Number,
        required: true,
        min: 0,
      },
      unitPerPcs: {
        type: Number,
        required: true,
        min: 0,
      },
      price: {
        type: Number,
        required: true,
      },
      expirationDate: {
        type: Date,
        required: true,
      },
    },
  ],
}, { timestamps: true });

const Delivery = mongoose.model("Delivery", deliverySchema);

export default Delivery;
