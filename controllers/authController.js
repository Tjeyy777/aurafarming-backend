const User = require("../models/User");
const generateToken = require("../utils/generateToken");
const { validationResult } = require("express-validator");

exports.registerUser = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: "error",
        errors: errors.array(),
      });
    }

    const { name, email, password, role } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        status: "error",
        message: "User already exists",
      });
    }

    const user = await User.create({
      name,
      email,
      password,
      role: "admin", // Registration always creates an admin (workspace owner)
    });

    const token = generateToken(user._id, user.role);

    res.status(201).json({
      status: "success",
      message: "User registered successfully",
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          adminId: null,
        },
        token,
      },
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};

exports.loginUser = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: "error",
        errors: errors.array(),
      });
    }

    const { email, password } = req.body;

    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return res.status(401).json({
        status: "error",
        message: "Invalid email or password",
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        status: "error",
        message: "Account is deactivated. Contact your admin.",
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        status: "error",
        message: "Invalid email or password",
      });
    }

    user.lastLoginAt = new Date();
    await user.save();

    const token = generateToken(user._id, user.role);

    res.status(200).json({
      status: "success",
      message: "Login successful",
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          adminId: user.adminId || null,
        },
        token,
      },
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};

exports.getMe = async (req, res) => {
  try {
    res.status(200).json({
      status: "success",
      data: req.user,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// STAFF MANAGEMENT (Admin-only)
// ═══════════════════════════════════════════════════════════════════════════

exports.createStaff = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        status: "error",
        message: "Name, email, and password are required",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        status: "error",
        message: "Password must be at least 6 characters",
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        status: "error",
        message: "A user with this email already exists",
      });
    }

    const staff = await User.create({
      name,
      email,
      password,
      role: "staff",
      adminId: req.user._id, // Link staff to this admin's workspace
    });

    res.status(201).json({
      status: "success",
      message: "Staff account created successfully",
      data: {
        id: staff._id,
        name: staff.name,
        email: staff.email,
        role: staff.role,
        isActive: staff.isActive,
        createdAt: staff.createdAt,
      },
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};

exports.getStaffList = async (req, res) => {
  try {
    const staffList = await User.find({ adminId: req.user._id })
      .select("-password")
      .sort({ createdAt: -1 });

    res.status(200).json({
      status: "success",
      results: staffList.length,
      data: staffList,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};

exports.updateStaff = async (req, res) => {
  try {
    const staff = await User.findOne({
      _id: req.params.id,
      adminId: req.user._id,
    });

    if (!staff) {
      return res.status(404).json({
        status: "error",
        message: "Staff member not found",
      });
    }

    const { name, email, password, isActive } = req.body;

    if (name !== undefined) staff.name = name;
    if (email !== undefined) {
      // Check email isn't taken by another user
      const existing = await User.findOne({ email, _id: { $ne: staff._id } });
      if (existing) {
        return res.status(400).json({
          status: "error",
          message: "Email already in use",
        });
      }
      staff.email = email;
    }
    if (password !== undefined) {
      if (password.length < 6) {
        return res.status(400).json({
          status: "error",
          message: "Password must be at least 6 characters",
        });
      }
      staff.password = password;
    }
    if (isActive !== undefined) staff.isActive = isActive;

    await staff.save();

    res.status(200).json({
      status: "success",
      message: "Staff updated successfully",
      data: {
        id: staff._id,
        name: staff.name,
        email: staff.email,
        role: staff.role,
        isActive: staff.isActive,
      },
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};

exports.deleteStaff = async (req, res) => {
  try {
    const staff = await User.findOne({
      _id: req.params.id,
      adminId: req.user._id,
    });

    if (!staff) {
      return res.status(404).json({
        status: "error",
        message: "Staff member not found",
      });
    }

    // Soft delete — deactivate instead of removing
    staff.isActive = false;
    await staff.save();

    res.status(200).json({
      status: "success",
      message: "Staff account deactivated",
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};