const mongoose = require("mongoose");
const { fetchBiometricData } = require("../services/biometricService");
const Employee = require("../models/Employee");
const Attendance = require("../models/Attendence");

// --- Helper Functions ---

/**
 * Cleans the time string from biometric data
 * Returns null if the time is a placeholder
 */
const cleanTime = (t) => (t === "--:--" ? null : t);

/**
 * Formats "DD/MM/YYYY" strings into a valid JS Date object
 */
const formatDate = (dateStr) => {
  const [d, m, y] = dateStr.split("/");
  return new Date(`${y}-${m}-${d}T00:00:00`);
};

// --- Biometric Sync Logic ---

// GET /api/attendance/sync?fromDate=01/03/2026&toDate=10/03/2026
exports.syncBiometric = async (req, res) => {
  try {
    const { fromDate, toDate } = req.query;

    if (!fromDate || !toDate) {
      return res.status(400).json({
        status: "error",
        message: "fromDate & toDate required",
      });
    }

    const apiResponse = await fetchBiometricData(fromDate, toDate);
    const records = apiResponse.InOutPunchData || [];
    const bulkOps = [];

    for (const item of records) {
      // Find or create employee belonging to this user
      let employee = await Employee.findOne({
        employeeCode: item.Empcode,
        createdBy: req.user._id,
      });

      if (!employee) {
        employee = await Employee.create({
          employeeCode: item.Empcode,
          name: item.Name || `Employee ${item.Empcode}`,
          dailyWage: 0,
          createdBy: req.user._id,
          isActive: true
        });
      } else {
        // Update name ONLY if it changed, DO NOT touch isActive
        if (item.Name && employee.name !== item.Name) {
          employee.name = item.Name;
          await employee.save();
        }
      }

      const inTime = cleanTime(item.INTime);
      const status = inTime ? "present" : "absent";

      // Calculate wage based on presence and base dailyWage
      const wage = status === "present" && employee.dailyWage ? employee.dailyWage : 0;

      bulkOps.push({
        updateOne: {
          filter: {
            employeeId: employee._id,
            date: formatDate(item.DateString),
          },
          update: {
            $set: {
              inTime,
              status,
              wage,
            },
          },
          upsert: true,
        },
      });
    }

    if (bulkOps.length > 0) {
      await Attendance.bulkWrite(bulkOps);
    }

    // ─── Auto-mark absent: employees who didn't appear in biometric at all ───
    // Collect all unique dates from the synced records
    const uniqueDates = [...new Set(records.map((r) => formatDate(r.DateString).toISOString()))];

    // Get all active employees for this user
    const allActiveEmployees = await Employee.find({
      createdBy: req.user._id,
      isActive: true,
    }, "_id");

    let absentCount = 0;
    for (const dateISO of uniqueDates) {
      const date = new Date(dateISO);

      // Find who already has a record for this date
      const existing = await Attendance.find({ date }, "employeeId");
      const existingIds = new Set(existing.map((r) => r.employeeId.toString()));

      // Create absent records for employees who don't have one
      const absentOps = allActiveEmployees
        .filter((emp) => !existingIds.has(emp._id.toString()))
        .map((emp) => ({
          updateOne: {
            filter: { employeeId: emp._id, date },
            update: {
              $setOnInsert: {
                status: "absent",
                inTime: null,
                wage: 0,
                overtimeHour: 0,
                perHourRate: 0,
              },
            },
            upsert: true,
          },
        }));

      if (absentOps.length > 0) {
        await Attendance.bulkWrite(absentOps);
        absentCount += absentOps.length;
      }
    }

    res.status(200).json({
      status: "success",
      message: `Biometric synced. ${bulkOps.length} records synced, ${absentCount} auto-marked absent.`,
      count: bulkOps.length,
      absentCount,
    });
  } catch (err) {
    console.error("Biometric Sync Error:", err);
    res.status(500).json({ status: "error", message: err.message });
  }
};

// --- Manual Attendance Logic ---

// POST /api/attendance/mark
exports.markAttendance = async (req, res) => {
  try {
    const { date, attendance } = req.body;

    const employeeIds = attendance.map((item) => item.employeeId);
    
    // Only fetch employees belonging to this user
    const employees = await Employee.find({
      _id: { $in: employeeIds },
      createdBy: req.user._id,
    });

    const employeeMap = new Map(
      employees.map((emp) => [emp._id.toString(), emp])
    );

    const bulkOps = attendance
      .map((item) => {
        const employee = employeeMap.get(item.employeeId.toString());
        if (!employee) return null;

        const extraHours = Number(item.overtimeHour) || 0;
        const hourRate = Number(item.perHourRate) || 0;
        const overtimePay = item.status === "present" ? extraHours * hourRate : 0;

        return {
          updateOne: {
            filter: { employeeId: item.employeeId, date },
            update: {
              $set: {
                status: item.status,
                overtimeHour: extraHours,
                perHourRate: hourRate,
                wage:
                  item.status === "present"
                    ? (employee.dailyWage || 0) + overtimePay
                    : 0,
              },
            },
            upsert: true,
          },
        };
      })
      .filter(Boolean);

    const result = await Attendance.bulkWrite(bulkOps);
    res.status(200).json({ status: "success", data: result });
  } catch (err) {
    res.status(400).json({ status: "error", message: err.message });
  }
};

// --- Attendance Retrieval & Reports ---

// GET /attendance?date=2026-04-19
exports.getDailyAttendance = async (req, res) => {
  try {
    const day = new Date(req.query.date);
    const nextDay = new Date(day);
    nextDay.setDate(nextDay.getDate() + 1);

    const userEmployees = await Employee.find({ createdBy: req.user._id, isActive: true }, "_id");
    const employeeIds = userEmployees.map((e) => e._id);

    const records = await Attendance.find({
      date: { $gte: day, $lt: nextDay },
      employeeId: { $in: employeeIds },
    }).populate({
      path: "employeeId",
      select: "name employeeCode position profileImage dailyWage role subRole",
      populate: [
        { path: "role", select: "title" },
        { path: "subRole", select: "title parentRole" },
      ],
    });

    res.status(200).json({
      status: "success",
      results: records.length,
      data: records,
    });
  } catch (err) {
    res.status(400).json({ status: "error", message: err.message });
  }
};

// GET /attendance/employee/:id
exports.getEmployeeAttendance = async (req, res) => {
  try {
    const employee = await Employee.findOne({
      _id: req.params.id,
      createdBy: req.user._id,
    });
    if (!employee) {
      return res.status(404).json({ status: "error", message: "Employee not found" });
    }

    const records = await Attendance.find({ employeeId: req.params.id }).sort({ date: -1 });

    res.status(200).json({
      status: "success",
      results: records.length,
      data: records,
    });
  } catch (err) {
    res.status(400).json({ status: "error", message: err.message });
  }
};

// GET /attendance/report/monthly?employeeId=X&year=2026&month=4
exports.getMonthlyReport = async (req, res) => {
  try {
    const { employeeId, month, year } = req.query;

    const employee = await Employee.findOne({
      _id: employeeId,
      createdBy: req.user._id,
    });
    if (!employee) {
      return res.status(404).json({ status: "error", message: "Employee not found" });
    }

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const report = await Attendance.aggregate([
      {
        $match: {
          employeeId: new mongoose.Types.ObjectId(employeeId),
          date: { $gte: startDate, $lte: endDate },
        },
      },
      { $sort: { date: 1 } },
      {
        $group: {
          _id: "$employeeId",
          presentDays: { $sum: { $cond: [{ $eq: ["$status", "present"] }, 1, 0] } },
          absentDays: { $sum: { $cond: [{ $eq: ["$status", "absent"] }, 1, 0] } },
          totalOvertimeHours: { $sum: "$overtimeHour" },
          totalSalary: { $sum: "$wage" },
          dailyRecords: {
            $push: {
              date: "$date",
              status: "$status",
              overtimeHour: "$overtimeHour",
              dailyEarnings: "$wage",
            },
          },
        },
      },
      {
        $lookup: {
          from: "employees",
          localField: "_id",
          foreignField: "_id",
          as: "employee",
        },
      },
      { $unwind: "$employee" },
      {
        $project: {
          _id: 0,
          employeeId: "$_id",
          employeeName: "$employee.name",
          employeePosition: "$employee.position",
          presentDays: 1,
          absentDays: 1,
          totalOvertimeHours: 1,
          totalSalary: 1,
          dailyRecords: 1,
        },
      },
    ]);

    res.status(200).json({
      status: "success",
      data: report[0] || null,
    });
  } catch (err) {
    res.status(400).json({ status: "error", message: err.message });
  }
};

// GET /api/attendance/report/weekly?employeeId=X&date=2026-03-10
exports.getWeeklyReport = async (req, res) => {
  try {
    const { employeeId, date } = req.query;

    const employee = await Employee.findOne({
      _id: employeeId,
      createdBy: req.user._id,
    });
    if (!employee) {
      return res.status(404).json({ status: "error", message: "Employee not found" });
    }

    const pivot = new Date(date);
    const day = pivot.getDay();
    const monday = new Date(pivot);
    monday.setDate(pivot.getDate() - ((day + 6) % 7));
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    const report = await Attendance.aggregate([
      {
        $match: {
          employeeId: new mongoose.Types.ObjectId(employeeId),
          date: { $gte: monday, $lte: sunday },
        },
      },
      { $sort: { date: 1 } },
      {
        $group: {
          _id: "$employeeId",
          presentDays: { $sum: { $cond: [{ $eq: ["$status", "present"] }, 1, 0] } },
          absentDays: { $sum: { $cond: [{ $eq: ["$status", "absent"] }, 1, 0] } },
          totalOvertimeHours: { $sum: "$overtimeHour" },
          totalSalary: { $sum: "$wage" },
          dailyRecords: {
            $push: {
              date: "$date",
              status: "$status",
              overtimeHour: "$overtimeHour",
              dailyEarnings: "$wage",
            },
          },
        },
      },
      {
        $lookup: {
          from: "employees",
          localField: "_id",
          foreignField: "_id",
          as: "employee",
        },
      },
      { $unwind: "$employee" },
      {
        $project: {
          _id: 0,
          employeeName: "$employee.name",
          employeePosition: "$employee.position",
          weekStart: monday,
          weekEnd: sunday,
          presentDays: 1,
          absentDays: 1,
          totalOvertimeHours: 1,
          totalSalary: 1,
          dailyRecords: 1,
        },
      },
    ]);

    res.status(200).json({ status: "success", data: report[0] || null });
  } catch (err) {
    res.status(400).json({ status: "error", message: err.message });
  }
};

// GET /api/attendance/report/daily?employeeId=X&date=2026-03-16
exports.getDailyReport = async (req, res) => {
  try {
    const { employeeId, date } = req.query;

    const employee = await Employee.findOne({
      _id: employeeId,
      createdBy: req.user._id,
    });
    if (!employee) {
      return res.status(404).json({ status: "error", message: "Employee not found" });
    }

    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    const record = await Attendance.findOne({
      employeeId: new mongoose.Types.ObjectId(employeeId),
      date: { $gte: start, $lte: end },
    }).populate("employeeId", "name position dailyWage");

    if (!record) {
      return res.status(200).json({ status: "success", data: null });
    }

    res.status(200).json({
      status: "success",
      data: {
        date: record.date,
        status: record.status,
        overtimeHour: record.overtimeHour,
        dailyEarnings: record.wage,
        employeeName: record.employeeId.name,
        employeePosition: record.employeeId.position,
      },
    });
  } catch (err) {
    res.status(400).json({ status: "error", message: err.message });
  }
};