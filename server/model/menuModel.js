import mongoose from "mongoose";

const MenuItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  description: {
    type: String,
    trim: true
  },
  price: {
    type: Number,
    required: true
  },
  category: {
    type: String,
    required: true,
    trim: true
  },
  available: {
    type: Boolean,
    default: true
  },
  ingredients: [
    {
      ingredient: {
        type: mongoose.Schema.ObjectId,
        ref: 'Ingredient',
        required: true
      },
      quantity: {
        type: Number,
        required: true
      }
    }
  ],

},{timestamps: true});

const MenuItem = mongoose.model('Menu', MenuItemSchema);

export default MenuItem;