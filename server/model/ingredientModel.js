import mongoose from "mongoose";

const IngredientSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    unit: {
        type: String,
        required: true,
        enum: ['g', 'kg', 'ml', 'l', 'pcs']
    },
    batches: [{
        quantity: {
            type: Number,
            required: true,
            min: 0
        },
        expirationDate: {
            type: Date,
            required: true
        },
        deliveryId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'delivery',
            required: true
        },
        addedDate: {
            type: Date,
            default: Date.now
        }
    }]
}, { timestamps: true });

// Virtual to get total quantity across all batches
IngredientSchema.virtual('totalQuantity').get(function() {
    return this.batches.reduce((total, batch) => total + batch.quantity, 0);
});

// Method to add a new batch
IngredientSchema.methods.addBatch = function(quantity, expirationDate, deliveryId) {
    this.batches.push({
        quantity,
        expirationDate,
        deliveryId
    });
    return this.save();
};

//
IngredientSchema.methods.consume = function(amount) {
    // Sort batches by expiration date (oldest first)
    this.batches.sort((a, b) => new Date(a.expirationDate) - new Date(b.expirationDate));
    
    let remaining = amount;
    
    for (let batch of this.batches) {
        if (remaining <= 0) break;
        
        if (batch.quantity > 0) {
            const toConsume = Math.min(remaining, batch.quantity);
            batch.quantity -= toConsume;
            remaining -= toConsume;
        }
    }
    
    // Remove empty batches
    this.batches = this.batches.filter(batch => batch.quantity > 0);
    
    return this.save();
};

const Ingredient = mongoose.model('Ingredient', IngredientSchema);

export default Ingredient;