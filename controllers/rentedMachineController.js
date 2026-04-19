const RentedVehicle = require('../models/Rentedvehicle');
const RentedMachineLog = require('../models/RentedMachinelog');

// ─── RENTED VEHICLE MASTER CRUD ──────────────────────────────────────────────

exports.createRentedVehicle = async (req, res) => {
  try {
    const vehicle = await RentedVehicle.create({
      ...req.body,
      createdBy: req.user._id
    });

    res.status(201).json({
      status: 'success',
      data: vehicle
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};

exports.getAllRentedVehicles = async (req, res) => {
  try {
    const filter = {
      isDeleted: false,
      createdBy: req.user._id
    };

    if (req.query.status) {
      filter.status = req.query.status;
    }

    if (req.query.vehicleType) {
      filter.vehicleType = req.query.vehicleType;
    }

    const vehicles = await RentedVehicle.find(filter).sort({ vehicleNumber: 1 });

    res.status(200).json({
      status: 'success',
      results: vehicles.length,
      data: vehicles
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

exports.getSingleRentedVehicle = async (req, res) => {
  try {
    const vehicle = await RentedVehicle.findOne({
      _id: req.params.id,
      isDeleted: false,
      createdBy: req.user._id
    });

    if (!vehicle) {
      return res.status(404).json({
        status: 'error',
        message: 'Vehicle not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: vehicle
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

exports.updateRentedVehicle = async (req, res) => {
  try {
    const vehicle = await RentedVehicle.findOne({
      _id: req.params.id,
      isDeleted: false,
      createdBy: req.user._id
    });

    if (!vehicle) {
      return res.status(404).json({
        status: 'error',
        message: 'Vehicle not found'
      });
    }

    Object.assign(vehicle, req.body);
    await vehicle.save();

    res.status(200).json({
      status: 'success',
      data: vehicle
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};

exports.deleteRentedVehicle = async (req, res) => {
  try {
    const vehicle = await RentedVehicle.findOneAndUpdate(
      {
        _id: req.params.id,
        isDeleted: false,
        createdBy: req.user._id
      },
      { isDeleted: true },
      { new: true }
    );

    if (!vehicle) {
      return res.status(404).json({
        status: 'error',
        message: 'Vehicle not found'
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Vehicle deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// ─── RENTED MACHINE LOGS CRUD ────────────────────────────────────────────────

exports.createRentedLog = async (req, res) => {
  try {
    const { vehicleId, date, openingMeter, closingMeter, driverName, remarks, isTrip, parentLogId, tripPurpose } = req.body;

    // Verify vehicle exists and belongs to user
    const vehicle = await RentedVehicle.findOne({
      _id: vehicleId,
      isDeleted: false,
      createdBy: req.user._id
    });

    if (!vehicle) {
      return res.status(404).json({
        status: 'error',
        message: 'Vehicle not found'
      });
    }

    // Validate closing meter if provided
    if (closingMeter !== null && closingMeter !== undefined) {
      if (Number(closingMeter) < Number(openingMeter)) {
        return res.status(400).json({
          status: 'error',
          message: 'Closing meter cannot be less than opening meter'
        });
      }
    }

    const log = await RentedMachineLog.create({
      vehicleId,
      date,
      openingMeter: Number(openingMeter),
      closingMeter: closingMeter !== null && closingMeter !== undefined ? Number(closingMeter) : null,
      driverName: driverName || '',
      remarks: remarks || '',
      isTrip: isTrip || false,
      parentLogId: parentLogId || null,
      tripPurpose: tripPurpose || '',
      hourlyRate: vehicle.hourlyRate,
      createdBy: req.user._id
    });

    // Populate vehicle details
    await log.populate('vehicleId', 'vehicleNumber vehicleType hourlyRate ownerName');

    res.status(201).json({
      status: 'success',
      data: log
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};

exports.getRentedLogs = async (req, res) => {
  try {
    const filter = {
      createdBy: req.user._id
    };

    // Filter by vehicle
    if (req.query.vehicleId) {
      const vehicle = await RentedVehicle.findOne({
        _id: req.query.vehicleId,
        createdBy: req.user._id
      });
      
      if (!vehicle) {
        return res.status(404).json({
          status: 'error',
          message: 'Vehicle not found'
        });
      }
      
      filter.vehicleId = req.query.vehicleId;
    }

    // Filter by date range
    if (req.query.dateFrom || req.query.dateTo) {
      filter.date = {};
      if (req.query.dateFrom) {
        filter.date.$gte = new Date(req.query.dateFrom);
      }
      if (req.query.dateTo) {
        const toDate = new Date(req.query.dateTo);
        toDate.setHours(23, 59, 59, 999);
        filter.date.$lte = toDate;
      }
    }

    // Filter by specific date
    if (req.query.date) {
      const targetDate = new Date(req.query.date);
      const nextDate = new Date(targetDate);
      nextDate.setDate(nextDate.getDate() + 1);
      filter.date = { $gte: targetDate, $lt: nextDate };
    }

    const logs = await RentedMachineLog.find(filter)
      .populate('vehicleId', 'vehicleNumber vehicleType hourlyRate ownerName')
      .sort({ date: -1, createdAt: -1 });

    res.status(200).json({
      status: 'success',
      results: logs.length,
      data: logs
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

exports.updateRentedLog = async (req, res) => {
  try {
    const log = await RentedMachineLog.findById(req.params.id);

    if (!log) {
      return res.status(404).json({
        status: 'error',
        message: 'Log not found'
      });
    }

    // Verify ownership
    const vehicle = await RentedVehicle.findOne({
      _id: log.vehicleId,
      isDeleted: false,
      createdBy: req.user._id
    });

    if (!vehicle) {
      return res.status(404).json({
        status: 'error',
        message: 'Vehicle not found'
      });
    }

    // Validate closing meter if being updated
    const newClosing = req.body.closingMeter !== undefined ? Number(req.body.closingMeter) : log.closingMeter;
    const newOpening = req.body.openingMeter !== undefined ? Number(req.body.openingMeter) : log.openingMeter;

    if (newClosing !== null && newClosing < newOpening) {
      return res.status(400).json({
        status: 'error',
        message: 'Closing meter cannot be less than opening meter'
      });
    }

    // Update fields
    if (req.body.date !== undefined) log.date = req.body.date;
    if (req.body.openingMeter !== undefined) log.openingMeter = Number(req.body.openingMeter);
    if (req.body.closingMeter !== undefined) {
      log.closingMeter = req.body.closingMeter !== null ? Number(req.body.closingMeter) : null;
    }
    if (req.body.driverName !== undefined) log.driverName = req.body.driverName;
    if (req.body.remarks !== undefined) log.remarks = req.body.remarks;
    if (req.body.tripPurpose !== undefined) log.tripPurpose = req.body.tripPurpose;
    if (req.body.entryTime !== undefined) log.entryTime = req.body.entryTime;
    if (req.body.exitTime !== undefined) log.exitTime = req.body.exitTime;

    await log.save();
    await log.populate('vehicleId', 'vehicleNumber vehicleType hourlyRate ownerName');

    res.status(200).json({
      status: 'success',
      data: log
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};

exports.deleteRentedLog = async (req, res) => {
  try {
    const log = await RentedMachineLog.findById(req.params.id);

    if (!log) {
      return res.status(404).json({
        status: 'error',
        message: 'Log not found'
      });
    }

    // Verify ownership
    const vehicle = await RentedVehicle.findOne({
      _id: log.vehicleId,
      createdBy: req.user._id
    });

    if (!vehicle) {
      return res.status(403).json({
        status: 'error',
        message: 'Not authorized to delete this log'
      });
    }

    // If this is a parent log, also delete all child trips
    if (!log.isTrip) {
      await RentedMachineLog.deleteMany({ parentLogId: log._id });
    }

    await RentedMachineLog.findByIdAndDelete(req.params.id);

    res.status(200).json({
      status: 'success',
      message: 'Log deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// ─── CREATE TRIP FROM EXISTING LOG ──────────────────────────────────────────

exports.createTripFromLog = async (req, res) => {
  try {
    const { parentLogId, tripPurpose, openingMeter, closingMeter, date } = req.body;

    // Find parent log
    const parentLog = await RentedMachineLog.findById(parentLogId).populate('vehicleId');

    if (!parentLog) {
      return res.status(404).json({
        status: 'error',
        message: 'Parent log not found'
      });
    }

    // Verify ownership
    if (parentLog.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        status: 'error',
        message: 'Not authorized'
      });
    }

    // Create trip log
    const tripLog = await RentedMachineLog.create({
      vehicleId: parentLog.vehicleId._id,
      parentLogId: parentLogId,
      isTrip: true,
      tripPurpose: tripPurpose || '',
      date: date || parentLog.date,
      openingMeter: Number(openingMeter),
      closingMeter: closingMeter !== null && closingMeter !== undefined ? Number(closingMeter) : null,
      hourlyRate: parentLog.vehicleId.hourlyRate,
      createdBy: req.user._id
    });

    await tripLog.populate('vehicleId', 'vehicleNumber vehicleType hourlyRate ownerName');

    res.status(201).json({
      status: 'success',
      data: tripLog
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};

// ─── GET SUMMARY/STATISTICS ──────────────────────────────────────────────────

exports.getRentedSummary = async (req, res) => {
  try {
    const { vehicleId, dateFrom, dateTo } = req.query;

    const filter = {
      createdBy: req.user._id
    };

    if (vehicleId) {
      filter.vehicleId = vehicleId;
    }

    if (dateFrom || dateTo) {
      filter.date = {};
      if (dateFrom) filter.date.$gte = new Date(dateFrom);
      if (dateTo) {
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999);
        filter.date.$lte = toDate;
      }
    }

    const logs = await RentedMachineLog.find(filter);

    // Separate main entries and trips
    const mainEntries = logs.filter(l => !l.isTrip && l.closingMeter !== null);
    const trips = logs.filter(l => l.isTrip && l.closingMeter !== null);

    const ourHours = mainEntries.reduce((sum, l) => sum + (l.totalHours || 0), 0);
    const tripHours = trips.reduce((sum, l) => sum + (l.totalHours || 0), 0);
    const totalCost = mainEntries.reduce((sum, l) => sum + (l.cost || 0), 0);

    res.status(200).json({
      status: 'success',
      data: {
        ourHours,
        tripHours,
        totalHours: ourHours + tripHours,
        totalCost,
        totalEntries: mainEntries.length,
        totalTrips: trips.length
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};