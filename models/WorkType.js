const mongoose = require('mongoose');

const workTypeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Type of Work name is required'],
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

const WorkType = mongoose.model('WorkType', workTypeSchema);
module.exports = WorkType;
