const Employee = require("../models/Employee");

exports.createEmployee = async (req, res) => {
  try {
    const employee = await Employee.create({
      ...req.body,
      createdBy: req.user._id,
    });

    res.status(201).json({
      status: "success",
      data: employee,
    });
  } catch (error) {
    res.status(400).json({
      status: "error",
      message: error.message,
    });
  }
};

exports.getEmployees = async (req, res) => {
  const employees = await Employee.find({ createdBy: req.user._id });

  res.status(200).json({
    status: "success",
    results: employees.length,
    data: employees,
  });
};

exports.updateEmployee = async (req, res) => {
  const employee = await Employee.findOneAndUpdate(
    { _id: req.params.id, createdBy: req.user._id },
    req.body,
    { new: true }
  );

  if (!employee) {
    return res.status(404).json({ status: "error", message: "Employee not found" });
  }

  res.status(200).json({
    status: "success",
    data: employee,
  });
};

exports.deleteEmployee = async (req, res) => {
  const employee = await Employee.findOneAndDelete({
    _id: req.params.id,
    createdBy: req.user._id,
  });

  if (!employee) {
    return res.status(404).json({ status: "error", message: "Employee not found" });
  }

  res.status(204).json({
    status: "success",
  });
};
