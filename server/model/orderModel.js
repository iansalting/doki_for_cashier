import mongoose from "mongoose";

const OrderSchema = new mongoose.Schema(
  {
    tableNumber: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "completed"],
      default: "pending",
    },
    orderDate: {
      type: Date,
      default: Date.now,
    },
    bills: {
      total: {
        type: Number,
        required: true,
      },
      tax: {
        type: Number,
        required: true,
      },
      totalWithTax: {
        type: Number,
        required: true,
      },
    },
    payment: {
      type: String,
      enum: ["cash"],
      default: "cash",
      required: true,
    },
    items: [
      {
        menuItem: {
          type: mongoose.Schema.ObjectId,
          ref: "Menu",
          required: true,
        },
        selectedSize: {
          type: String,
          enum: ["Classic", "Deluxe", "Supreme"],
          required: true,
          default: "Classic"
        },
        quantity: {
          type: Number,
          required: true,
          min: 1,
          default: 1,
        },
        price: {
          type: Number,
          required: true,
        },
      },
    ],
  },
  { timestamps: true }
);

const Order = mongoose.model("Order", OrderSchema);
export default Order;