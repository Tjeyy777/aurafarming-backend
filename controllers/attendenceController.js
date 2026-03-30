const mongoose = require("mongoose");
const Attendance = require("../models/Attendence");
const Employee = require("../models/Employee");

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

        const overtimePay =
          item.status === "present"
            ? (item.overtimeHour || 0) * (employee.overtimeRate || 0)
            : 0;

        return {
          updateOne: {
            filter: { employeeId: item.employeeId, date },
            update: {
              $set: {
                status: item.status,
                overtimeHour: item.overtimeHour || 0,
                wage:
                  item.status === "present"
                    ? employee.dailyWage + overtimePay
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

// GET /attendance?date=2024-06-10
exports.getDailyAttendance = async (req, res) => {
  try {
    const day = new Date(req.query.date);
    const nextDay = new Date(day);
    nextDay.setDate(nextDay.getDate() + 1);

    // Get only this user's employees
    const userEmployees = await Employee.find(
      { createdBy: req.user._id },
      "_id"
    );
    const employeeIds = userEmployees.map((e) => e._id);

    const records = await Attendance.find({
      date: { $gte: day, $lt: nextDay },
      employeeId: { $in: employeeIds },
    }).populate("employeeId", "name position profileImage dailyWage");

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
    // Verify the employee belongs to this user
    const employee = await Employee.findOne({
      _id: req.params.id,
      createdBy: req.user._id,
    });
    if (!employee) {
      return res.status(404).json({ status: "error", message: "Employee not found" });
    }

    const records = await Attendance.find({
      employeeId: req.params.id,
    }).sort({ date: -1 });

    res.status(200).json({
      status: "success",
      results: records.length,
      data: records,
    });
  } catch (err) {
    res.status(400).json({ status: "error", message: err.message });
  }
};

// GET /attendance/report/monthly?employeeId=X&year=2024&month=6
exports.getMonthlyReport = async (req, res) => {
  try {
    const { employeeId, month, year } = req.query;

    // Verify the employee belongs to this user
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
      {
        $sort: { date: 1 },
      },
      {
        $group: {
          _id: "$employeeId",
          presentDays: {
            $sum: { $cond: [{ $eq: ["$status", "present"] }, 1, 0] },
          },
          absentDays: {
            $sum: { $cond: [{ $eq: ["$status", "absent"] }, 1, 0] },
          },
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

    // Verify the employee belongs to this user
    const employee = await Employee.findOne({
      _id: employeeId,
      createdBy: req.user._id,
    });
    if (!employee) {
      return res.status(404).json({ status: "error", message: "Employee not found" });
    }

    const pivot = new Date(date);
    const day   = pivot.getDay();
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
          presentDays:        { $sum: { $cond: [{ $eq: ["$status", "present"] }, 1, 0] } },
          absentDays:         { $sum: { $cond: [{ $eq: ["$status", "absent"]  }, 1, 0] } },
          totalOvertimeHours: { $sum: "$overtimeHour" },
          totalSalary:        { $sum: "$wage" },
          dailyRecords: {
            $push: {
              date:         "$date",
              status:       "$status",
              overtimeHour: "$overtimeHour",
              dailyEarnings:"$wage",
            },
          },
        },
      },
      {
        $lookup: {
          from: "employees", localField: "_id",
          foreignField: "_id", as: "employee",
        },
      },
      { $unwind: "$employee" },
      {
        $project: {
          _id: 0,
          employeeName:     "$employee.name",
          employeePosition: "$employee.position",
          weekStart: monday,
          weekEnd:   sunday,
          presentDays: 1, absentDays: 1,
          totalOvertimeHours: 1, totalSalary: 1,
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

    // Verify the employee belongs to this user
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
        date:             record.date,
        status:           record.status,
        overtimeHour:     record.overtimeHour,
        dailyEarnings:    record.wage,
        employeeName:     record.employeeId.name,
        employeePosition: record.employeeId.position,
      },
    });
  } catch (err) {
    res.status(400).json({ status: "error", message: err.message });
  }
};