const mongoose = require('mongoose');

const rentedVehicleSchema = new mongoose.Schema(
  {
    vehicleNumber: {
      type: String,
      required: [true, 'Vehicle number is required'],
      trim: true,
      uppercase: true
    },
    vehicleType: {
      type: String,
      enum: [
        'excavator',
        'loader',
        'tipper',
        'dozer',
        'grader',
        'other'
      ],
      required: [true, 'Vehicle type is required']
    },
    hourlyRate: {
      type: Number,
      required: [true, 'Hourly rate is required'],
      min: [0, 'Hourly rate cannot be negative']
    },
    ownerName: {
      type: String,
      required: [true, 'Owner name is required'],
      trim: true
    },
    ownerContact: {
      type: String,
      trim: true,
      default: ''
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active'
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

// Vehicle number must be unique per user
rentedVehicleSchema.index({ vehicleNumber: 1, createdBy: 1 }, { unique: true });

module.exports = mongoose.model('RentedVehicle', rentedVehicleSchema);