const WeighbridgeEntry = require('../models/weighbridgeModel');

const normalizeVehicleNumber = (vehicleNumber = '') =>
  vehicleNumber.trim().toUpperCase();

const getStartOfDay = (date = new Date()) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const getEndOfDay = (date = new Date()) => {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
};

const getStartOfWeek = (date = new Date()) => {
  const d = new Date(date);
  const day = d.getDay(); // sunday = 0
  const diff = day === 0 ? 6 : day - 1; // monday start
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

const getEndOfWeek = (date = new Date()) => {
  const d = getStartOfWeek(date);
  d.setDate(d.getDate() + 6);
  d.setHours(23, 59, 59, 999);
  return d;
};

const getStartOfMonth = (date = new Date()) => {
  const d = new Date(date.getFullYear(), date.getMonth(), 1);
  d.setHours(0, 0, 0, 0);
  return d;
};

const getEndOfMonth = (date = new Date()) => {
  const d = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  d.setHours(23, 59, 59, 999);
  return d;
};

const isValidDate = (value) => {
  const d = new Date(value);
  return !Number.isNaN(d.getTime());
};

const getPaginationValues = (page, limit, defaultLimit = 20) => {
  const currentPage = Math.max(parseInt(page, 10) || 1, 1);
  const perPage = Math.max(parseInt(limit, 10) || defaultLimit, 1);
  const skip = (currentPage - 1) * perPage;

  return { currentPage, perPage, skip };
};

// 1. Create entry when vehicle enters
exports.createWeighbridgeEntry = async (req, res) => {
  try {
    const { vehicleNumber, driverName, emptyWeight, remarks, entryTime } = req.body;

    if (!vehicleNumber || emptyWeight === undefined || emptyWeight === null) {
      return res.status(400).json({
        status: 'error',
        message: 'Vehicle number and empty weight are required'
      });
    }

    const normalizedVehicleNumber = normalizeVehicleNumber(vehicleNumber);

    const existingOpenEntry = await WeighbridgeEntry.findOne({
      vehicleNumber: normalizedVehicleNumber,
      status: 'open',
      isDeleted: false,
      createdBy: req.user._id
    });

    if (existingOpenEntry) {
      return res.status(400).json({
        status: 'error',
        message: 'This vehicle already has an open entry'
      });
    }

    const payload = {
      vehicleNumber: normalizedVehicleNumber,
      driverName,
      emptyWeight,
      remarks,
      createdBy: req.user._id
    };

    if (entryTime !== undefined) {
      if (!isValidDate(entryTime)) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid entry time'
        });
      }
      payload.entryTime = new Date(entryTime);
    }

    const entry = await WeighbridgeEntry.create(payload);

    return res.status(201).json({
      status: 'success',
      message: 'Vehicle entry recorded successfully',
      data: entry
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// 2. Complete entry when vehicle exits
exports.completeWeighbridgeEntry = async (req, res) => {
  try {
    const { id } = req.params;
    const { loadedWeight, exitTime, remarks } = req.body;

    if (loadedWeight === undefined || loadedWeight === null) {
      return res.status(400).json({
        status: 'error',
        message: 'Loaded weight is required'
      });
    }

    const entry = await WeighbridgeEntry.findOne({
      _id: id,
      isDeleted: false,
      createdBy: req.user._id
    });

    if (!entry) {
      return res.status(404).json({
        status: 'error',
        message: 'Weighbridge entry not found'
      });
    }

    if (entry.status === 'completed') {
      return res.status(400).json({
        status: 'error',
        message: 'This entry is already completed'
      });
    }

    if (loadedWeight < entry.emptyWeight) {
      return res.status(400).json({
        status: 'error',
        message: 'Loaded weight cannot be less than empty weight'
      });
    }

    entry.loadedWeight = loadedWeight;

    if (exitTime !== undefined) {
      if (!isValidDate(exitTime)) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid exit time'
        });
      }
      entry.exitTime = new Date(exitTime);
    } else {
      entry.exitTime = new Date();
    }

    if (remarks !== undefined) {
      entry.remarks = remarks;
    }

    await entry.save();

    return res.status(200).json({
      status: 'success',
      message: 'Vehicle exit recorded successfully',
      data: entry
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// 3. Get previous empty weight by vehicle number
exports.getPreviousVehicleWeight = async (req, res) => {
  try {
    const { vehicleNumber } = req.params;

    if (!vehicleNumber) {
      return res.status(400).json({
        status: 'error',
        message: 'Vehicle number is required'
      });
    }

    const normalizedVehicleNumber = normalizeVehicleNumber(vehicleNumber);

    const previousEntry = await WeighbridgeEntry.findOne({
      vehicleNumber: normalizedVehicleNumber,
      isDeleted: false,
      createdBy: req.user._id
    }).sort({ entryTime: -1, createdAt: -1 });

    if (!previousEntry) {
      return res.status(404).json({
        status: 'error',
        message: 'No previous entry found for this vehicle'
      });
    }

    return res.status(200).json({
      status: 'success',
      message: 'Previous vehicle weight fetched successfully',
      data: {
        vehicleNumber: previousEntry.vehicleNumber,
        previousEmptyWeight: previousEntry.emptyWeight,
        lastEntryTime: previousEntry.entryTime
      }
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// 4. Get all entries with filters + pagination
exports.getAllWeighbridgeEntries = async (req, res) => {
  try {
    const {
      status,
      vehicleNumber,
      date,
      fromDate,
      toDate,
      page = 1,
      limit = 20
    } = req.query;

    const { currentPage, perPage, skip } = getPaginationValues(page, limit, 20);

    const filter = { isDeleted: false, createdBy: req.user._id };

    if (status) {
      filter.status = status;
    }

    if (vehicleNumber) {
      filter.vehicleNumber = normalizeVehicleNumber(vehicleNumber);
    }

    if (date) {
      if (!isValidDate(date)) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid date'
        });
      }

      const selectedDate = new Date(date);
      filter.entryTime = {
        $gte: getStartOfDay(selectedDate),
        $lte: getEndOfDay(selectedDate)
      };
    }

    if (fromDate || toDate) {
      filter.entryTime = {};

      if (fromDate) {
        if (!isValidDate(fromDate)) {
          return res.status(400).json({
            status: 'error',
            message: 'Invalid fromDate'
          });
        }
        filter.entryTime.$gte = getStartOfDay(new Date(fromDate));
      }

      if (toDate) {
        if (!isValidDate(toDate)) {
          return res.status(400).json({
            status: 'error',
            message: 'Invalid toDate'
          });
        }
        filter.entryTime.$lte = getEndOfDay(new Date(toDate));
      }
    }

    const [entries, totalRecords] = await Promise.all([
      WeighbridgeEntry.find(filter)
        .sort({ entryTime: -1, createdAt: -1 })
        .skip(skip)
        .limit(perPage),
      WeighbridgeEntry.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(totalRecords / perPage);

    return res.status(200).json({
      status: 'success',
      results: entries.length,
      pagination: {
        totalRecords,
        totalPages,
        currentPage,
        perPage,
        hasNextPage: currentPage < totalPages,
        hasPrevPage: currentPage > 1
      },
      data: entries
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// 5. Get single entry by id
exports.getWeighbridgeEntryById = async (req, res) => {
  try {
    const { id } = req.params;

    const entry = await WeighbridgeEntry.findOne({
      _id: id,
      isDeleted: false
    });

    if (!entry) {
      return res.status(404).json({
        status: 'error',
        message: 'Weighbridge entry not found'
      });
    }

    return res.status(200).json({
      status: 'success',
      data: entry
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// 6. Update/edit entry
exports.updateWeighbridgeEntry = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      vehicleNumber,
      driverName,
      emptyWeight,
      loadedWeight,
      entryTime,
      exitTime,
      remarks
    } = req.body;

    const entry = await WeighbridgeEntry.findOne({
      _id: id,
      isDeleted: false,
      createdBy: req.user._id
    });

    if (!entry) {
      return res.status(404).json({
        status: 'error',
        message: 'Weighbridge entry not found'
      });
    }

    let nextVehicleNumber = entry.vehicleNumber;
    let nextLoadedWeight = entry.loadedWeight;

    if (vehicleNumber !== undefined) {
      nextVehicleNumber = normalizeVehicleNumber(vehicleNumber);
    }

    if (loadedWeight !== undefined) {
      nextLoadedWeight = loadedWeight;
    }

    const willBeOpen =
      nextLoadedWeight === null || nextLoadedWeight === undefined;

    if (nextVehicleNumber !== entry.vehicleNumber && willBeOpen) {
      const existingOpenEntry = await WeighbridgeEntry.findOne({
        _id: { $ne: id },
        vehicleNumber: nextVehicleNumber,
        status: 'open',
        isDeleted: false,
        createdBy: req.user._id
      });

      if (existingOpenEntry) {
        return res.status(400).json({
          status: 'error',
          message: 'Another open entry already exists for this vehicle'
        });
      }
    }

    if (vehicleNumber !== undefined) {
      entry.vehicleNumber = nextVehicleNumber;
    }

    if (driverName !== undefined) {
      entry.driverName = driverName;
    }

    if (emptyWeight !== undefined) {
      entry.emptyWeight = emptyWeight;
    }

    if (loadedWeight !== undefined) {
      entry.loadedWeight = loadedWeight === null ? null : loadedWeight;
    }

    if (entryTime !== undefined) {
      if (!isValidDate(entryTime)) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid entry time'
        });
      }
      entry.entryTime = new Date(entryTime);
    }

    if (exitTime !== undefined) {
      if (exitTime === null || exitTime === '') {
        entry.exitTime = null;
      } else {
        if (!isValidDate(exitTime)) {
          return res.status(400).json({
            status: 'error',
            message: 'Invalid exit time'
          });
        }
        entry.exitTime = new Date(exitTime);
      }
    }

    if (remarks !== undefined) {
      entry.remarks = remarks;
    }

    if (
      entry.loadedWeight !== null &&
      entry.loadedWeight !== undefined &&
      entry.loadedWeight < entry.emptyWeight
    ) {
      return res.status(400).json({
        status: 'error',
        message: 'Loaded weight cannot be less than empty weight'
      });
    }

    await entry.save();

    return res.status(200).json({
      status: 'success',
      message: 'Weighbridge entry updated successfully',
      data: entry
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// 7. Soft delete entry
exports.deleteWeighbridgeEntry = async (req, res) => {
  try {
    const { id } = req.params;

    const entry = await WeighbridgeEntry.findOne({
      _id: id,
      isDeleted: false,
      createdBy: req.user._id
    });

    if (!entry) {
      return res.status(404).json({
        status: 'error',
        message: 'Weighbridge entry not found'
      });
    }

    entry.isDeleted = true;
    await entry.save();

    return res.status(200).json({
      status: 'success',
      message: 'Weighbridge entry deleted successfully'
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// 8. Get open entries + pagination
exports.getOpenEntries = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const { currentPage, perPage, skip } = getPaginationValues(page, limit, 20);

    const filter = {
      status: 'open',
      isDeleted: false,
      createdBy: req.user._id
    };

    const [entries, totalRecords] = await Promise.all([
      WeighbridgeEntry.find(filter)
        .sort({ entryTime: 1 })
        .skip(skip)
        .limit(perPage),
      WeighbridgeEntry.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(totalRecords / perPage);

    return res.status(200).json({
      status: 'success',
      results: entries.length,
      pagination: {
        totalRecords,
        totalPages,
        currentPage,
        perPage,
        hasNextPage: currentPage < totalPages,
        hasPrevPage: currentPage > 1
      },
      data: entries
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// 9. Get today's entries + pagination
exports.getTodayEntries = async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const { currentPage, perPage, skip } = getPaginationValues(page, limit, 50);

    const now = new Date();

    const filter = {
      isDeleted: false,
      createdBy: req.user._id,
      entryTime: {
        $gte: getStartOfDay(now),
        $lte: getEndOfDay(now)
      }
    };

    const [entries, totalRecords] = await Promise.all([
      WeighbridgeEntry.find(filter)
        .sort({ entryTime: 1, createdAt: 1 })
        .skip(skip)
        .limit(perPage),
      WeighbridgeEntry.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(totalRecords / perPage);

    return res.status(200).json({
      status: 'success',
      results: entries.length,
      pagination: {
        totalRecords,
        totalPages,
        currentPage,
        perPage,
        hasNextPage: currentPage < totalPages,
        hasPrevPage: currentPage > 1
      },
      data: entries
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// 10. Daily / weekly / monthly production summary
exports.getProductionSummary = async (req, res) => {
  try {
    const now = new Date();

    const [daily, weekly, monthly] = await Promise.all([
      WeighbridgeEntry.aggregate([
        {
          $match: {
            isDeleted: false,
            status: 'completed',
            createdBy: req.user._id,
            entryTime: {
              $gte: getStartOfDay(now),
              $lte: getEndOfDay(now)
            }
          }
        },
        {
          $group: {
            _id: null,
            totalNetWeight: { $sum: '$netWeight' },
            totalTrips: { $sum: 1 }
          }
        }
      ]),
      WeighbridgeEntry.aggregate([
        {
          $match: {
            isDeleted: false,
            status: 'completed',
            createdBy: req.user._id,
            entryTime: {
              $gte: getStartOfWeek(now),
              $lte: getEndOfWeek(now)
            }
          }
        },
        {
          $group: {
            _id: null,
            totalNetWeight: { $sum: '$netWeight' },
            totalTrips: { $sum: 1 }
          }
        }
      ]),
      WeighbridgeEntry.aggregate([
        {
          $match: {
            isDeleted: false,
            status: 'completed',
            createdBy: req.user._id,
            entryTime: {
              $gte: getStartOfMonth(now),
              $lte: getEndOfMonth(now)
            }
          }
        },
        {
          $group: {
            _id: null,
            totalNetWeight: { $sum: '$netWeight' },
            totalTrips: { $sum: 1 }
          }
        }
      ])
    ]);

    return res.status(200).json({
      status: 'success',
      data: {
        daily: daily[0] || { totalNetWeight: 0, totalTrips: 0 },
        weekly: weekly[0] || { totalNetWeight: 0, totalTrips: 0 },
        monthly: monthly[0] || { totalNetWeight: 0, totalTrips: 0 }
      }
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// 11. Daily history summary + pagination
exports.getDailyHistorySummary = async (req, res) => {
  try {
    const { page = 1, limit = 15 } = req.query;
    const { currentPage, perPage, skip } = getPaginationValues(page, limit, 15);

    const summary = await WeighbridgeEntry.aggregate([
      {
        $match: {
          isDeleted: false,
          createdBy: req.user._id
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$entryTime' },
            month: { $month: '$entryTime' },
            day: { $dayOfMonth: '$entryTime' }
          },
          totalEntries: { $sum: 1 },
          completedEntries: {
            $sum: {
              $cond: [{ $eq: ['$status', 'completed'] }, 1, 0]
            }
          },
          openEntries: {
            $sum: {
              $cond: [{ $eq: ['$status', 'open'] }, 1, 0]
            }
          },
          totalNetWeight: { $sum: '$netWeight' }
        }
      },
      {
        $sort: {
          '_id.year': -1,
          '_id.month': -1,
          '_id.day': -1
        }
      },
      {
        $facet: {
          metadata: [{ $count: 'totalRecords' }],
          data: [{ $skip: skip }, { $limit: perPage }]
        }
      }
    ]);

    const metadata = summary[0]?.metadata?.[0] || { totalRecords: 0 };
    const rows = summary[0]?.data || [];

    const formatted = rows.map((item) => ({
      date: `${item._id.year}-${String(item._id.month).padStart(2, '0')}-${String(item._id.day).padStart(2, '0')}`,
      totalEntries: item.totalEntries,
      completedEntries: item.completedEntries,
      openEntries: item.openEntries,
      totalNetWeight: item.totalNetWeight
    }));

    const totalRecords = metadata.totalRecords || 0;
    const totalPages = Math.ceil(totalRecords / perPage);

    return res.status(200).json({
      status: 'success',
      results: formatted.length,
      pagination: {
        totalRecords,
        totalPages,
        currentPage,
        perPage,
        hasNextPage: currentPage < totalPages,
        hasPrevPage: currentPage > 1
      },
      data: formatted
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// 12. Get entries by one specific day + pagination
exports.getEntriesByDay = async (req, res) => {
  try {
    const { date } = req.params;
    const { page = 1, limit = 50 } = req.query;

    if (!isValidDate(date)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid date'
      });
    }

    const { currentPage, perPage, skip } = getPaginationValues(page, limit, 50);
    const selectedDate = new Date(date);

    const filter = {
      isDeleted: false,
      createdBy: req.user._id,
      entryTime: {
        $gte: getStartOfDay(selectedDate),
        $lte: getEndOfDay(selectedDate)
      }
    };

    const [entries, totalRecords, totals] = await Promise.all([
      WeighbridgeEntry.find(filter)
        .sort({ entryTime: 1, createdAt: 1 })
        .skip(skip)
        .limit(perPage),
      WeighbridgeEntry.countDocuments(filter),
      WeighbridgeEntry.aggregate([
        {
          $match: {
            isDeleted: false,
            status: 'completed',
            entryTime: {
              $gte: getStartOfDay(selectedDate),
              $lte: getEndOfDay(selectedDate)
            }
          }
        },
        {
          $group: {
            _id: null,
            totalNetWeight: { $sum: '$netWeight' },
            totalTrips: { $sum: 1 }
          }
        }
      ])
    ]);

    const totalPages = Math.ceil(totalRecords / perPage);

    return res.status(200).json({
      status: 'success',
      date,
      results: entries.length,
      pagination: {
        totalRecords,
        totalPages,
        currentPage,
        perPage,
        hasNextPage: currentPage < totalPages,
        hasPrevPage: currentPage > 1
      },
      summary: totals[0] || { totalNetWeight: 0, totalTrips: 0 },
      data: entries
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};