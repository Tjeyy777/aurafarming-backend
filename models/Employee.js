const mongoose = require("mongoose");

const employeeSchema = new mongoose.Schema({
  employeeCode: {
    type: String,
    required: true,
  },

  name: {
    type: String,
    required: true,
  },

  phone: {
    type: String,
  },

  position: {
    type: String,
  },

  dailyWage: {
    type: Number,
    required: true,
  },

  overtimeRate: {
    type: Number,
    default: 0,
  },

  joinDate: {
    type: Date,
    default: Date.now,
  },
  profileImage: {
    type: String,
  },
  idCardImage: {
    type: String,
  },
  documentType: {
    type: String,
    default: "Aadhar Card",
  },

  status: {
    type: String,
    enum: ["active", "inactive"],
    default: "active",
  },

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Employee code must be unique per user
employeeSchema.index({ employeeCode: 1, createdBy: 1 }, { unique: true });

module.exports = mongoose.model("Employee", employeeSchema);
