import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
    type: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    date: {
      type: Date,
      default: Date.now,
    },
    details: {
      items: [
        {
          menuItemId: { type: mongoose.Schema.Types.ObjectId, ref: "MenuItem" },
          quantity: Number,
        },
      ],
      paymentMethod: String,
      cashier: String,
    },
    date: {
    type: Date,
    default: Date.now,
  },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

const Transaction = mongoose.model("Transaction", transactionSchema);
export default Transaction;
