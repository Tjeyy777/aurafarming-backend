const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema(
  {
    expenseName: {
      type: String,
      required: [true, 'Expense name is required'],
      trim: true
    },

    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0, 'Amount cannot be negative']
    },

    date: {
      type: Date,
      required: [true, 'Date is required']
    },

    notes: {
      type: String,
      trim: true,
      default: ''
    },

    isDeleted: {
      type: Boolean,
      default: false
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

expenseSchema.index({ date: 1 });
expenseSchema.index({ createdBy: 1 });

module.exports = mongoose.model('Expense', expenseSchema);