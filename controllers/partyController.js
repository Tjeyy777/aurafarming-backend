const Party = require('../models/Party');
const { getOwnerId } = require('../middleware/authMiddleware');

exports.createParty = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({
        status: 'error',
        message: 'Party name is required',
      });
    }

    const party = await Party.create({
      name,
      createdBy: getOwnerId(req),
    });

    res.status(201).json({
      status: 'success',
      data: party,
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message,
    });
  }
};

exports.getParties = async (req, res) => {
  try {
    const parties = await Party.find({
      createdBy: getOwnerId(req),
      isDeleted: false,
    }).sort({ name: 1 });

    res.status(200).json({
      status: 'success',
      results: parties.length,
      data: parties,
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message,
    });
  }
};

exports.updateParty = async (req, res) => {
  try {
    const party = await Party.findOneAndUpdate(
      { _id: req.params.id, createdBy: getOwnerId(req), isDeleted: false },
      { name: req.body.name },
      { new: true, runValidators: true }
    );

    if (!party) {
      return res.status(404).json({
        status: 'error',
        message: 'Party not found',
      });
    }

    res.status(200).json({
      status: 'success',
      data: party,
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message,
    });
  }
};

exports.deleteParty = async (req, res) => {
  try {
    const party = await Party.findOneAndUpdate(
      { _id: req.params.id, createdBy: getOwnerId(req), isDeleted: false },
      { isDeleted: true },
      { new: true }
    );

    if (!party) {
      return res.status(404).json({
        status: 'error',
        message: 'Party not found',
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Party deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message,
    });
  }
};
