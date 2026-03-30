const mongoose = require('mongoose');

const weighbridgeEntrySchema = new mongoose.Schema(
  {
    vehicleNumber: {
      type: String,
      required: [true, 'Vehicle number is required'],
      trim: true,
      uppercase: true
    },

    driverName: {
      type: String,
      trim: true,
      default: ''
    },

    entryTime: {
      type: Date,
      default: Date.now
    },

    emptyWeight: {
      type: Number,
      required: [true, 'Empty weight is required'],
      min: [0, 'Empty weight cannot be negative']
    },

    loadedWeight: {
      type: Number,
      default: null,
      min: [0, 'Loaded weight cannot be negative']
    },

    exitTime: {
      type: Date,
      default: null
    },

    netWeight: {
      type: Number,
      default: 0
    },

    status: {
      type: String,
      enum: ['open', 'completed'],
      default: 'open'
    },

    remarks: {
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

weighbridgeEntrySchema.pre('save', function () {
  if (this.loadedWeight !== null && this.loadedWeight !== undefined) {
    this.netWeight = this.loadedWeight - this.emptyWeight;
    this.status = 'completed';

    if (!this.exitTime) {
      this.exitTime = new Date();
    }
  } else {
    this.netWeight = 0;
    this.status = 'open';
    this.exitTime = null;
  }
});

module.exports = mongoose.model('WeighbridgeEntry', weighbridgeEntrySchema);