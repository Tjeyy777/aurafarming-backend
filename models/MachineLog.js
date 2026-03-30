const mongoose = require('mongoose');

const machineLogSchema = new mongoose.Schema(
  {
    machineId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Machine',
      required: [true, 'Machine ID is required']
    },
    date: {
      type: Date,
      required: [true, 'Date is required']
    },
    openingMeterReading: {
      type: Number,
      required: [true, 'Opening meter reading is required'],
      min: [0, 'Opening meter reading cannot be negative']
    },
    closingMeterReading: {
      type: Number,
      required: [true, 'Closing meter reading is required'],
      min: [0, 'Closing meter reading cannot be negative']
    },
    totalHoursWorked: {
      type: Number,
      required: true,
      min: [0, 'Total hours cannot be negative']
    },
    operatingCost: {
      type: Number,
      default: 0,
      min: [0, 'Operating cost cannot be negative']
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

machineLogSchema.index({ machineId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('MachineLog', machineLogSchema);