const mongoose = require("mongoose");

const attendenceSchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employee",
    required: true,
  },

  date: {
    type: Date,
    required: true,
  },

  inTime: {
    type: String, // biometric check-in time
  },

  status: {
    type: String,
    enum: ["present", "absent"],
    required: true,
  },

  overtimeHour: {
    type: Number,
    default: 0, // extra hours worked
  },

  perHourRate: {
    type: Number,
    default: 0, // rate per extra hour (₹)
  },

  wage: {
    type: Number,
    default: 0, // dailyWage + (overtimeHour × perHourRate)
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// prevent duplicates
attendenceSchema.index({ employeeId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model("Attendance", attendenceSchema);