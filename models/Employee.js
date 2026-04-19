const mongoose = require("mongoose");

const employeeSchema = new mongoose.Schema({
  employeeCode: {
    type: String,
    required: true,
    immutable: true, // 🔥 NEVER CHANGE
  },

  name: {
    type: String,
    default: "Unknown",
  },

  phone: String,
  position: String,

  role: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "EmployeeRole",
    required: false, // 🔥 now optional
  },

  subRole: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "EmployeeRole",
    default: null,
  },

  dailyWage: {
    type: Number,
    default: 0, // 🔥 optional
  },

  overtimeRate: {
    type: Number,
    default: 0,
  },

  isConfigured: {
    type: Boolean,
    default: false, // 🔥 mark after editing
  },

  joinDate: {
    type: Date,
    default: Date.now,
  },

  profileImage: String,
  idCardImage: String,

  documentType: {
    type: String,
    default: "Aadhar Card",
  },

  isActive: {
    type: Boolean,
    default: true,
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

// Unique employeeCode per user
employeeSchema.index({ employeeCode: 1, createdBy: 1 }, { unique: true });

module.exports = mongoose.model("Employee", employeeSchema);