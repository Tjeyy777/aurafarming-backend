const mongoose = require('mongoose');

const machineSchema = new mongoose.Schema(
  {
    machineName: {
      type: String,
      required: [true, 'Machine name is required'],
      trim: true
    },
    machineCode: {
      type: String,
      required: [true, 'Machine code is required'],
      trim: true
    },
    machineType: {
      type: String,
      enum: [
        'excavator',
        'air_compressor',
        'loader',
        'drill_machine',
        'jackhammer',
        'other'
      ],
      required: [true, 'Machine type is required']
    },
    fuelType: {
      type: String,
      enum: ['diesel', 'electric', 'none'],
      default: 'diesel'
    },
    currentMeterReading: {
      type: Number,
      required: [true, 'Current meter reading is required'],
      min: [0, 'Meter reading cannot be negative']
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'maintenance'],
      default: 'active'
    },
    notes: {
      type: String,
      trim: true,
      default: ''
    },

    serviceReminderEnabled: {
      type: Boolean,
      default: false
    },
    serviceIntervalHours: {
      type: Number,
      default: 0,
      min: [0, 'Service interval cannot be negative']
    },
    lastServiceMeterReading: {
      type: Number,
      default: 0,
      min: [0, 'Last service meter reading cannot be negative']
    },
    nextServiceDueAt: {
      type: Number,
      default: 0
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

// Machine code must be unique per user
machineSchema.index({ machineCode: 1, createdBy: 1 }, { unique: true });

machineSchema.pre('save', function () {
  if (this.serviceReminderEnabled) {
    this.nextServiceDueAt =
      Number(this.lastServiceMeterReading || 0) +
      Number(this.serviceIntervalHours || 0);
  } else {
    this.nextServiceDueAt = 0;
  }
});

module.exports = mongoose.model('Machine', machineSchema);