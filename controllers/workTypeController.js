const WorkType = require('../models/WorkType');
const { getOwnerId } = require('../middleware/authMiddleware');

exports.createWorkType = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({
        status: 'error',
        message: 'Type of Work name is required',
      });
    }

    const workType = await WorkType.create({
      name,
      createdBy: getOwnerId(req),
    });

    res.status(201).json({
      status: 'success',
      data: workType,
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message,
    });
  }
};

exports.getWorkTypes = async (req, res) => {
  try {
    const workTypes = await WorkType.find({
      createdBy: getOwnerId(req),
      isDeleted: false,
    }).sort({ name: 1 });

    res.status(200).json({
      status: 'success',
      results: workTypes.length,
      data: workTypes,
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message,
    });
  }
};

exports.deleteWorkType = async (req, res) => {
  try {
    const workType = await WorkType.findOneAndUpdate(
      { _id: req.params.id, createdBy: getOwnerId(req), isDeleted: false },
      { isDeleted: true },
      { new: true }
    );

    if (!workType) {
      return res.status(404).json({
        status: 'error',
        message: 'Work Type not found',
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Work Type deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message,
    });
  }
};
