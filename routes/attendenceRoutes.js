const express = require("express");
const attendanceController = require("../controllers/attendenceController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// Biometric sync
router.post("/sync-biometric", protect, attendanceController.syncBiometric);

// Manual attendance marking + daily fetch
router.post("/", protect, attendanceController.markAttendance);
router.get("/", protect, attendanceController.getDailyAttendance);

// Employee history
router.get("/employee/:id", protect, attendanceController.getEmployeeAttendance);

// Reports
router.get("/report/monthly", protect, attendanceController.getMonthlyReport);
router.get("/report/weekly", protect, attendanceController.getWeeklyReport);
router.get("/report/daily", protect, attendanceController.getDailyReport);

module.exports = router;
