const mongoose = require('mongoose');

const partySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Company/Party name is required'],
      trim: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

partySchema.index({ createdBy: 1 });

module.exports = mongoose.model('Party', partySchema);
