const mongoose = require('mongoose');

const rentedMachineLogSchema = new mongoose.Schema(
  {
    vehicleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RentedVehicle',
      required: [true, 'Vehicle ID is required']
    },

    // Hierarchy for trips
    parentLogId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RentedMachineLog',
      default: null
    },
    isTrip: {
      type: Boolean,
      default: false
    },
    tripPurpose: {
      type: String,
      trim: true,
      default: ''
    },

    // Entry details
    date: {
      type: Date,
      required: [true, 'Date is required']
    },
    driverName: {
      type: String,
      trim: true,
      default: ''
    },

    // Meter readings
    openingMeter: {
      type: Number,
      required: [true, 'Opening meter reading is required'],
      min: [0, 'Opening meter cannot be negative']
    },
    closingMeter: {
      type: Number,
      default: null,
      // FIX: removed min validator here — null fails min:0 check in Mongoose
      validate: {
        validator: function (v) {
          // Allow null, but if a number is provided it must be >= 0
          return v === null || v === undefined || v >= 0;
        },
        message: 'Closing meter cannot be negative'
      }
    },
    totalHours: {
      type: Number,
      default: 0,
      min: [0, 'Total hours cannot be negative']
    },

    // Timing
    entryTime: {
      type: Date,
      default: Date.now
    },
    exitTime: {
      type: Date,
      default: null
    },

    // Billing (only for main entries, not trips)
    hourlyRate: {
      type: Number,
      default: 0
    },
    cost: {
      type: Number,
      default: 0,
      min: [0, 'Cost cannot be negative']
    },

    remarks: {
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

// Indexes for performance
rentedMachineLogSchema.index({ vehicleId: 1, date: -1 });
rentedMachineLogSchema.index({ parentLogId: 1 });
rentedMachineLogSchema.index({ createdBy: 1, date: -1 });

// FIX: Use async pre-save middleware — avoids "next is not a function" issues
rentedMachineLogSchema.pre('save', async function () {
  // Only calculate if closingMeter is a valid number
  if (this.closingMeter !== null && this.closingMeter !== undefined && !isNaN(this.closingMeter)) {
    this.totalHours = Math.max(0, this.closingMeter - this.openingMeter);

    // Calculate cost only for non-trip entries
    if (!this.isTrip && this.hourlyRate) {
      this.cost = this.totalHours * this.hourlyRate;
    }
  } else {
    // Reset if no closing meter
    this.totalHours = 0;
    this.cost = 0;
  }
});

module.exports = mongoose.model('RentedMachineLog', rentedMachineLogSchema);