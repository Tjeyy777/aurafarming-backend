const mongoose = require('mongoose');

const dieselEntrySchema = new mongoose.Schema(
  {
    dieselFor: {
      type: String,
      enum: ['machine', 'other'],
      required: [true, 'Diesel type is required']
    },

    machineId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Machine',
      default: null
    },

    expenseName: {
      type: String,
      trim: true,
      default: ''
    },

    date: {
      type: Date,
      required: [true, 'Date is required']
    },

    litres: {
      type: Number,
      required: [true, 'Litres is required'],
      min: [0, 'Litres cannot be negative']
    },

    pricePerLitre: {
      type: Number,
      required: [true, 'Price per litre is required'],
      min: [0, 'Price per litre cannot be negative']
    },

    totalCost: {
      type: Number,
      required: true,
      min: [0, 'Total cost cannot be negative']
    },

    notes: {
      type: String,
      trim: true,
      default: ''
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

module.exports = mongoose.model('DieselEntry', dieselEntrySchema);