const mongoose = require('mongoose');

const consumableItemSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Item name is required'],
      trim: true
    },
    category: {
      type: String,
      enum: [
        'drill_bit',
        'jackhammer_part',
        'iron_bar',
        'tool',
        'spare_part',
        'other'
      ],
      required: [true, 'Category is required']
    },
    unit: {
      type: String,
      required: [true, 'Unit is required'],
      trim: true
    },
    currentStock: {
      type: Number,
      required: true,
      default: 0,
      min: [0, 'Stock cannot be negative']
    },
    unitCost: {
      type: Number,
      required: [true, 'Unit cost is required'],
      min: [0, 'Unit cost cannot be negative']
    },
    lowStockLimit: {
      type: Number,
      default: 0,
      min: [0, 'Low stock limit cannot be negative']
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active'
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  {
    timestamps: true
  }
);

// Item name must be unique per user
consumableItemSchema.index({ name: 1, createdBy: 1 }, { unique: true });

module.exports = mongoose.model('ConsumableItem', consumableItemSchema);