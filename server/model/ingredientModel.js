import mongoose from "mongoose";    

const IngredientSchema = new mongoose.Schema({
    name: {
      type: String,
      required: true,
      trim: true
    },
    quantity: {
      type: Number,
      required: true
    },
    unit: {
      type: String,
      required: true,
      enum: ['g', 'kg', 'ml', 'l', 'pcs']
    },
  }, {timestamps: true})

const ingredient = mongoose.model('Ingredient', IngredientSchema);

export default ingredient;