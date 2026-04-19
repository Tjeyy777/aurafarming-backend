const mongoose = require("mongoose");

const employeeRoleSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, "Role title is required"],
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  // If null → top-level role (e.g. "Driller")
  // If set → sub-role under that parent (e.g. "Helper" under "Driller")
  parentRole: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "EmployeeRole",
    default: null,
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

// Role title must be unique per user within the same parent
employeeRoleSchema.index({ title: 1, parentRole: 1, createdBy: 1 }, { unique: true });

module.exports = mongoose.model("EmployeeRole", employeeRoleSchema);
