const mongoose = require('mongoose');

const consumableTransactionSchema = new mongoose.Schema(
  {
    itemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ConsumableItem',
      required: [true, 'Item ID is required']
    },
    date: {
      type: Date,
      required: [true, 'Date is required']
    },
    type: {
      type: String,
      enum: ['purchase', 'usage', 'adjustment'],
      required: [true, 'Transaction type is required']
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required']
    },
    cost: {
      type: Number,
      default: 0
    },
    reason: {
      type: String,
      trim: true,
      default: ''
    },
    notes: {
      type: String,
      trim: true,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('ConsumableTransaction', consumableTransactionSchema);