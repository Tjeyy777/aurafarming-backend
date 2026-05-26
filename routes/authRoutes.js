const express = require("express");
const { body } = require("express-validator");
const {
  registerUser,
  loginUser,
  getMe,
  createStaff,
  getStaffList,
  updateStaff,
  deleteStaff,
} = require("../controllers/authController");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();

router.post(
  "/register",
  [
    body("name").notEmpty().withMessage("Name is required"),
    body("email").isEmail().withMessage("Valid email is required"),
    body("password")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters"),
  ],
  registerUser
);

router.post(
  "/login",
  [
    body("email").isEmail().withMessage("Valid email is required"),
    body("password").notEmpty().withMessage("Password is required"),
  ],
  loginUser
);

router.get("/me", protect, getMe);

// ─── Staff Management (Admin only) ───
router.post("/staff", protect, authorize("admin"), createStaff);
router.get("/staff", protect, authorize("admin"), getStaffList);
router.put("/staff/:id", protect, authorize("admin"), updateStaff);
router.delete("/staff/:id", protect, authorize("admin"), deleteStaff);

module.exports = router;