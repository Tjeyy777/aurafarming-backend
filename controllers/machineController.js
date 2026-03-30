const mongoose = require("mongoose");
const Machine = require("../models/Machine");
const MachineLog = require("../models/MachineLog");

const getServiceStatus = (machine) => {
  if (!machine.serviceReminderEnabled) {
    return { serviceStatus: "disabled", remainingHours: null, overdueHours: 0 };
  }

  const remainingHours = machine.nextServiceDueAt - machine.currentMeterReading;

  if (remainingHours > 25) return { serviceStatus: "healthy", remainingHours, overdueHours: 0 };
  if (remainingHours > 0 && remainingHours <= 25) return { serviceStatus: "due_soon", remainingHours, overdueHours: 0 };
  if (remainingHours === 0) return { serviceStatus: "service_due", remainingHours: 0, overdueHours: 0 };
  return { serviceStatus: "overdue", remainingHours: 0, overdueHours: Math.abs(remainingHours) };
};

exports.createMachine = async (req, res) => {
  try {
    const machine = await Machine.create({ ...req.body, createdBy: req.user._id });

    res.status(201).json({
      status: "success",
      data: { ...machine.toObject(), ...getServiceStatus(machine) },
    });
  } catch (error) {
    res.status(400).json({ status: "error", message: error.message });
  }
};

exports.getAllMachines = async (req, res) => {
  try {
    const filter = { isDeleted: false, createdBy: req.user._id };

    if (req.query.machineType) filter.machineType = req.query.machineType;
    if (req.query.ownershipType) filter.ownershipType = req.query.ownershipType;
    if (req.query.status) filter.status = req.query.status;

    let machines = await Machine.find(filter).sort({ createdAt: -1 });
    machines = machines.map((m) => ({ ...m.toObject(), ...getServiceStatus(m) }));

    if (req.query.serviceStatus) {
      machines = machines.filter((m) => m.serviceStatus === req.query.serviceStatus);
    }

    res.status(200).json({ status: "success", results: machines.length, data: machines });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
};

exports.getSingleMachine = async (req, res) => {
  try {
    const machine = await Machine.findOne({ _id: req.params.id, isDeleted: false, createdBy: req.user._id });

    if (!machine) {
      return res.status(404).json({ status: "error", message: "Machine not found" });
    }

    res.status(200).json({
      status: "success",
      data: { ...machine.toObject(), ...getServiceStatus(machine) },
    });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
};

exports.updateMachine = async (req, res) => {
  try {
    const machine = await Machine.findOne({ _id: req.params.id, isDeleted: false, createdBy: req.user._id });

    if (!machine) {
      return res.status(404).json({ status: "error", message: "Machine not found" });
    }

    Object.assign(machine, req.body);
    await machine.save();

    res.status(200).json({
      status: "success",
      data: { ...machine.toObject(), ...getServiceStatus(machine) },
    });
  } catch (error) {
    res.status(400).json({ status: "error", message: error.message });
  }
};

exports.deleteMachine = async (req, res) => {
  try {
    const machine = await Machine.findOneAndUpdate(
      { _id: req.params.id, isDeleted: false, createdBy: req.user._id },
      { isDeleted: true },
      { new: true }
    );

    if (!machine) {
      return res.status(404).json({ status: "error", message: "Machine not found" });
    }

    res.status(200).json({ status: "success", message: "Machine deleted successfully" });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
};

exports.createMachineLog = async (req, res) => {
  try {
    const { machineId, date, closingMeterReading, notes } = req.body;

    const machine = await Machine.findOne({ _id: machineId, isDeleted: false, createdBy: req.user._id });

    if (!machine) {
      return res.status(404).json({ status: "error", message: "Machine not found" });
    }

    const openingMeterReading = Number(machine.currentMeterReading);
    const closing = Number(closingMeterReading);

    if (Number.isNaN(closing)) {
      return res.status(400).json({ status: "error", message: "Closing meter reading must be a valid number" });
    }

    if (closing < openingMeterReading) {
      return res.status(400).json({ status: "error", message: "Closing meter reading cannot be less than opening meter reading" });
    }

    const totalHoursWorked = closing - openingMeterReading;
    let operatingCost = 0;
    if (machine.ownershipType === "rented") {
      operatingCost = totalHoursWorked * Number(machine.hourlyRate || 0);
    }

    const log = await MachineLog.create({
      machineId, date, openingMeterReading, closingMeterReading: closing,
      totalHoursWorked, operatingCost, notes,
    });

    machine.currentMeterReading = closing;
    await machine.save();

    res.status(201).json({
      status: "success",
      data: { log, machine: { ...machine.toObject(), ...getServiceStatus(machine) } },
    });
  } catch (error) {
    res.status(400).json({ status: "error", message: error.message });
  }
};

exports.getMachineLogs = async (req, res) => {
  try {
    const filter = {};

    if (req.query.machineId) {
      // Verify machine belongs to user
      const machine = await Machine.findOne({ _id: req.query.machineId, createdBy: req.user._id });
      if (!machine) return res.status(404).json({ status: "error", message: "Machine not found" });
      filter.machineId = req.query.machineId;
    } else {
      // Restrict to logs for this user's machines
      const userMachines = await Machine.find({ createdBy: req.user._id, isDeleted: false }, "_id");
      filter.machineId = { $in: userMachines.map((m) => m._id) };
    }

    if (req.query.date) {
      const targetDate = new Date(req.query.date);
      const nextDate = new Date(targetDate);
      nextDate.setDate(nextDate.getDate() + 1);
      filter.date = { $gte: targetDate, $lt: nextDate };
    }

    const logs = await MachineLog.find(filter)
      .populate({ path: "machineId", match: { isDeleted: false }, select: "machineName machineCode machineType ownershipType currentMeterReading hourlyRate status" })
      .sort({ date: -1, createdAt: -1 });

    const filteredLogs = logs.filter((log) => log.machineId !== null);

    res.status(200).json({ status: "success", results: filteredLogs.length, data: filteredLogs });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
};

exports.getMachineLogHistory = async (req, res) => {
  try {
    const machine = await Machine.findOne({ _id: req.params.machineId, isDeleted: false, createdBy: req.user._id });

    if (!machine) {
      return res.status(404).json({ status: "error", message: "Machine not found" });
    }

    const logs = await MachineLog.find({ machineId: req.params.machineId }).sort({ date: -1, createdAt: -1 });

    res.status(200).json({ status: "success", results: logs.length, data: logs });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
};

exports.updateMachineLog = async (req, res) => {
  try {
    const log = await MachineLog.findById(req.params.id);

    if (!log) {
      return res.status(404).json({ status: "error", message: "Machine log not found" });
    }

    const machine = await Machine.findOne({ _id: log.machineId, isDeleted: false, createdBy: req.user._id });

    if (!machine) {
      return res.status(404).json({ status: "error", message: "Machine not found" });
    }

    const closingMeterReading = req.body.closingMeterReading !== undefined ? Number(req.body.closingMeterReading) : log.closingMeterReading;
    const openingMeterReading = req.body.openingMeterReading !== undefined ? Number(req.body.openingMeterReading) : log.openingMeterReading;

    if (closingMeterReading < openingMeterReading) {
      return res.status(400).json({ status: "error", message: "Closing meter reading cannot be less than opening meter reading" });
    }

    const totalHoursWorked = closingMeterReading - openingMeterReading;
    let operatingCost = 0;
    if (machine.ownershipType === "rented") {
      operatingCost = totalHoursWorked * Number(machine.hourlyRate || 0);
    }

    log.date = req.body.date || log.date;
    log.openingMeterReading = openingMeterReading;
    log.closingMeterReading = closingMeterReading;
    log.totalHoursWorked = totalHoursWorked;
    log.operatingCost = operatingCost;
    log.notes = req.body.notes !== undefined ? req.body.notes : log.notes;

    await log.save();

    const latestLog = await MachineLog.findOne({ machineId: machine._id }).sort({ date: -1, createdAt: -1 });

    if (latestLog) {
      machine.currentMeterReading = latestLog.closingMeterReading;
      await machine.save();
    }

    res.status(200).json({
      status: "success",
      data: { log, machine: { ...machine.toObject(), ...getServiceStatus(machine) } },
    });
  } catch (error) {
    res.status(400).json({ status: "error", message: error.message });
  }
};

exports.deleteMachineLog = async (req, res) => {
  try {
    const log = await MachineLog.findById(req.params.id);

    if (!log) {
      return res.status(404).json({ status: "error", message: "Machine log not found" });
    }

    const machine = await Machine.findOne({ _id: log.machineId, isDeleted: false, createdBy: req.user._id });

    if (!machine) {
      return res.status(403).json({ status: "error", message: "Not authorized to delete this log" });
    }

    await MachineLog.findByIdAndDelete(req.params.id);

    const latestLog = await MachineLog.findOne({ machineId: machine._id }).sort({ date: -1, createdAt: -1 });

    if (latestLog) {
      machine.currentMeterReading = latestLog.closingMeterReading;
    } else {
      machine.currentMeterReading = machine.lastServiceMeterReading || 0;
    }

    await machine.save();

    res.status(200).json({ status: "success", message: "Machine log deleted successfully" });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
};

exports.markServiceDone = async (req, res) => {
  try {
    const machine = await Machine.findOne({ _id: req.params.id, isDeleted: false, createdBy: req.user._id });

    if (!machine) {
      return res.status(404).json({ status: "error", message: "Machine not found" });
    }

    if (!machine.serviceReminderEnabled) {
      return res.status(400).json({ status: "error", message: "Service reminder is not enabled for this machine" });
    }

    machine.lastServiceMeterReading = machine.currentMeterReading;
    machine.nextServiceDueAt = Number(machine.currentMeterReading) + Number(machine.serviceIntervalHours || 0);

    await machine.save();

    res.status(200).json({
      status: "success",
      message: "Service marked as completed",
      data: { ...machine.toObject(), ...getServiceStatus(machine) },
    });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
};

exports.getServiceAlerts = async (req, res) => {
  try {
    const machines = await Machine.find({
      isDeleted: false,
      serviceReminderEnabled: true,
      createdBy: req.user._id,
    }).sort({ currentMeterReading: -1 });

    const mapped = machines.map((m) => ({ ...m.toObject(), ...getServiceStatus(m) }));

    res.status(200).json({
      status: "success",
      data: {
        dueSoon: mapped.filter((m) => m.serviceStatus === "due_soon"),
        serviceDue: mapped.filter((m) => m.serviceStatus === "service_due"),
        overdue: mapped.filter((m) => m.serviceStatus === "overdue"),
      },
    });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
};

exports.getMachineSummary = async (req, res) => {
  try {
    const machineId = new mongoose.Types.ObjectId(req.params.machineId);

    const machine = await Machine.findOne({ _id: machineId, isDeleted: false, createdBy: req.user._id });

    if (!machine) {
      return res.status(404).json({ status: "error", message: "Machine not found" });
    }

    const summary = await MachineLog.aggregate([
      { $match: { machineId } },
      {
        $group: {
          _id: "$machineId",
          totalHoursWorked: { $sum: "$totalHoursWorked" },
          totalOperatingCost: { $sum: "$operatingCost" },
          totalLogs: { $sum: 1 },
        },
      },
    ]);

    res.status(200).json({
      status: "success",
      data: {
        machine: { ...machine.toObject(), ...getServiceStatus(machine) },
        summary: summary[0] || { totalHoursWorked: 0, totalOperatingCost: 0, totalLogs: 0 },
      },
    });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
};
