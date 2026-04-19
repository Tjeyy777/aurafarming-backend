const Employee = require("../models/Employee");
const EmployeeRole = require("../models/EmployeeRole");

// ==========================
// ROLE CRUD
// ==========================

exports.createRole = async (req, res) => {
  try {
    const role = await EmployeeRole.create({
      ...req.body,
      createdBy: req.user._id,
    });
    res.status(201).json({ status: "success", data: role });
  } catch (error) {
    res.status(400).json({ status: "error", message: error.message });
  }
};

exports.getRoles = async (req, res) => {
  try {
    const roles = await EmployeeRole.find({ createdBy: req.user._id })
      .populate("parentRole", "title")
      .sort({ title: 1 });
    res.status(200).json({ status: "success", data: roles });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
};

exports.updateRole = async (req, res) => {
  try {
    const role = await EmployeeRole.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user._id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!role) return res.status(404).json({ status: "error", message: "Role not found" });
    res.status(200).json({ status: "success", data: role });
  } catch (error) {
    res.status(400).json({ status: "error", message: error.message });
  }
};

exports.deleteRole = async (req, res) => {
  try {
    const role = await EmployeeRole.findOneAndDelete({
      _id: req.params.id,
      createdBy: req.user._id,
    });
    if (!role) return res.status(404).json({ status: "error", message: "Role not found" });
    res.status(204).json({ status: "success", data: null });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
};


// ==========================
// EMPLOYEE CRUD
// ==========================

exports.createEmployee = async (req, res) => {
  try {
    const employee = await Employee.create({
      ...req.body,
      createdBy: req.user._id,
    });

    const populatedEmployee = await employee.populate([
      { path: "role", select: "title" },
      { path: "subRole", select: "title parentRole" },
    ]);

    res.status(201).json({
      status: "success",
      data: populatedEmployee,
    });
  } catch (error) {
    res.status(400).json({
      status: "error",
      message: error.message,
    });
  }
};

exports.getEmployees = async (req, res) => {
  try {
    const employees = await Employee.find({ createdBy: req.user._id })
      .populate("role", "title")
      .populate("subRole", "title parentRole");
    res.status(200).json({
      status: "success",
      results: employees.length,
      data: employees,
    });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
};

exports.updateEmployee = async (req, res) => {
  try {
    const employee = await Employee.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user._id },
      req.body,
      { new: true }
    )
      .populate("role", "title")
      .populate("subRole", "title parentRole");

    if (!employee) {
      return res.status(404).json({ status: "error", message: "Employee not found" });
    }

    res.status(200).json({
      status: "success",
      data: employee,
    });
  } catch (error) {
    res.status(400).json({ status: "error", message: error.message });
  }
};

exports.deleteEmployee = async (req, res) => {
  try {
    const employee = await Employee.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user._id },
      { isActive: false },
      { new: true }
    );

    if (!employee) {
      return res.status(404).json({ status: "error", message: "Employee not found" });
    }

    res.status(200).json({
      status: "success",
      message: "Employee deactivated successfully",
      data: employee
    });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
};
