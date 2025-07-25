import mongoose from "mongoose";

const MenuItemSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    description: {
      type: String,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
      enum: [
        "ramen",
        "riceBowls", 
        "drinks",
        "sides",
        "toppings",
        "desserts",
        "appetizers",
        "specials",
      ],
    },
    available: {
      type: Boolean,
      default: true,
    },
    image: {
      type: String,
      trim: true,
    },
    imageAlt: {
      type: String,
      trim: true,
    },
    imageUrlPort5000: {
      type: String,
      trim: true,
    },
    imageUrlPort8000: {
      type: String,
      trim: true,
    },
    sizes: [
      {
        label: {
          type: String,
          enum: ["Classic", "Deluxe", "Supreme"],
          default: "Classic",
          required: true,
        },
        price: {
          type: Number,
          required: true,
        },
        ingredients: [
          {
            ingredient: {
              type: mongoose.Schema.ObjectId,
              ref: "Ingredient",
              required: true,
            },
            quantity: {
              type: Number,
              required: true,
            },
          },
        ],
      },
    ],
  },
  { timestamps: true }
);

// ADD THIS: Dynamic URL method that works for both systems
MenuItemSchema.methods.getImageUrl = function() {
  if (!this.image) return null;
  
  const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
  return `${baseUrl}/uploads/menu/${this.image}`;
};

// ADD THIS: Virtual field for easy access in JSON responses
MenuItemSchema.virtual('dynamicImageUrl').get(function() {
  return this.getImageUrl();
});

// Make sure virtuals are included when converting to JSON
MenuItemSchema.set('toJSON', { virtuals: true });
MenuItemSchema.set('toObject', { virtuals: true });

const MenuItem = mongoose.model("Menu", MenuItemSchema);
export default MenuItem;