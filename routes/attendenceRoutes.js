const express = require("express");
const mongoose = require("mongoose");
const attendanceController = require("../controllers/attendenceController");

const router = express.Router();

router.post("/", attendanceController.markAttendance);
router.get("/", attendanceController.getDailyAttendance);
router.get("/employee/:id", attendanceController.getEmployeeAttendance);
router.get("/report/monthly", attendanceController.getMonthlyReport);

router.get("/report/weekly", attendanceController.getWeeklyReport);
router.get("/report/daily", attendanceController.getDailyReport);

module.exports = router;
