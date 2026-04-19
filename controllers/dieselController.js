const DieselEntry = require('../models/DieselEntry');
const Machine = require('../models/Machine');

exports.createDieselEntry = async (req, res) => {
  try {
    const { dieselFor, machineId, expenseName, date, litres, pricePerLitre, notes } = req.body;

    const litresNumber = Number(litres);
    const priceNumber = Number(pricePerLitre);

    if (Number.isNaN(litresNumber) || litresNumber <= 0) {
      return res.status(400).json({ status: 'error', message: 'Litres must be greater than 0' });
    }

    if (Number.isNaN(priceNumber) || priceNumber < 0) {
      return res.status(400).json({ status: 'error', message: 'Price per litre must be a valid positive number' });
    }

    if (dieselFor === 'machine') {
      if (!machineId) {
        return res.status(400).json({ status: 'error', message: 'Machine is required for machine diesel entry' });
      }

      const machine = await Machine.findOne({
        _id: machineId,
        isDeleted: false,
        createdBy: req.user._id
      });

      if (!machine) {
        return res.status(404).json({ status: 'error', message: 'Owned machine not found' });
      }
    }

    if (dieselFor === 'other') {
      if (!expenseName || !expenseName.trim()) {
        return res.status(400).json({ status: 'error', message: 'Expense name is required for other diesel expense' });
      }
    }

    const totalCost = litresNumber * priceNumber;

    const dieselEntry = await DieselEntry.create({
      dieselFor,
      machineId: dieselFor === 'machine' ? machineId : null,
      expenseName: dieselFor === 'other' ? expenseName : '',
      date,
      litres: litresNumber,
      pricePerLitre: priceNumber,
      totalCost,
      notes,
      createdBy: req.user._id
    });

    const populatedEntry = await DieselEntry.findById(dieselEntry._id).populate(
      'machineId',
      'machineName machineCode machineType'
    );

    res.status(201).json({ status: 'success', data: populatedEntry });
  } catch (error) {
    res.status(400).json({ status: 'error', message: error.message });
  }
};

exports.getAllDieselEntries = async (req, res) => {
  try {
    const filter = { createdBy: req.user._id };

    if (req.query.dieselFor) filter.dieselFor = req.query.dieselFor;
    if (req.query.machineId) filter.machineId = req.query.machineId;

    if (req.query.date) {
      const targetDate = new Date(req.query.date);
      const nextDate = new Date(targetDate);
      nextDate.setDate(nextDate.getDate() + 1);
      filter.date = { $gte: targetDate, $lt: nextDate };
    }

    const entries = await DieselEntry.find(filter)
      .populate('machineId', 'machineName machineCode machineType')
      .sort({ date: -1, createdAt: -1 });

    res.status(200).json({ status: 'success', results: entries.length, data: entries });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

exports.getSingleDieselEntry = async (req, res) => {
  try {
    const entry = await DieselEntry.findOne({
      _id: req.params.id,
      createdBy: req.user._id
    }).populate('machineId', 'machineName machineCode machineType');

    if (!entry) {
      return res.status(404).json({ status: 'error', message: 'Diesel entry not found' });
    }

    res.status(200).json({ status: 'success', data: entry });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

exports.updateDieselEntry = async (req, res) => {
  try {
    const existingEntry = await DieselEntry.findOne({
      _id: req.params.id,
      createdBy: req.user._id
    });

    if (!existingEntry) {
      return res.status(404).json({ status: 'error', message: 'Diesel entry not found' });
    }

    const dieselFor = req.body.dieselFor || existingEntry.dieselFor;
    const machineId = req.body.machineId !== undefined ? req.body.machineId : existingEntry.machineId;
    const expenseName = req.body.expenseName !== undefined ? req.body.expenseName : existingEntry.expenseName;
    const litres = req.body.litres !== undefined ? Number(req.body.litres) : existingEntry.litres;
    const pricePerLitre = req.body.pricePerLitre !== undefined ? Number(req.body.pricePerLitre) : existingEntry.pricePerLitre;

    if (Number.isNaN(litres) || litres <= 0) {
      return res.status(400).json({ status: 'error', message: 'Litres must be greater than 0' });
    }

    if (Number.isNaN(pricePerLitre) || pricePerLitre < 0) {
      return res.status(400).json({ status: 'error', message: 'Price per litre must be valid' });
    }

    if (dieselFor === 'machine') {
      if (!machineId) {
        return res.status(400).json({ status: 'error', message: 'Machine is required for machine diesel entry' });
      }

      const machine = await Machine.findOne({
        _id: machineId,
        isDeleted: false,
        createdBy: req.user._id
      });

      if (!machine) {
        return res.status(404).json({ status: 'error', message: 'Owned machine not found' });
      }

      existingEntry.machineId = machineId;
      existingEntry.expenseName = '';
    }

    if (dieselFor === 'other') {
      if (!expenseName || !expenseName.trim()) {
        return res.status(400).json({ status: 'error', message: 'Expense name is required for other diesel expense' });
      }

      existingEntry.machineId = null;
      existingEntry.expenseName = expenseName;
    }

    existingEntry.dieselFor = dieselFor;
    existingEntry.date = req.body.date || existingEntry.date;
    existingEntry.litres = litres;
    existingEntry.pricePerLitre = pricePerLitre;
    existingEntry.totalCost = litres * pricePerLitre;
    existingEntry.notes = req.body.notes !== undefined ? req.body.notes : existingEntry.notes;

    await existingEntry.save();

    const populatedEntry = await DieselEntry.findById(existingEntry._id).populate(
      'machineId',
      'machineName machineCode machineType'
    );

    res.status(200).json({ status: 'success', data: populatedEntry });
  } catch (error) {
    res.status(400).json({ status: 'error', message: error.message });
  }
};

exports.deleteDieselEntry = async (req, res) => {
  try {
    const entry = await DieselEntry.findOneAndDelete({
      _id: req.params.id,
      createdBy: req.user._id
    });

    if (!entry) {
      return res.status(404).json({ status: 'error', message: 'Diesel entry not found' });
    }

    res.status(200).json({ status: 'success', message: 'Diesel entry deleted successfully' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

exports.getOwnedMachinesForDiesel = async (req, res) => {
  try {
    const machines = await Machine.find({
      isDeleted: false,
      status: 'active',
      fuelType: 'diesel',
      createdBy: req.user._id
    })
      .select('machineName machineCode machineType currentMeterReading')
      .sort({ machineName: 1 });

    res.status(200).json({ status: 'success', results: machines.length, data: machines });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};