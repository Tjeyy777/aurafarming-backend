const express = require("express");
const employeeController = require("../controllers/employeeController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// Role Routes
router.route("/roles")
  .get(protect, employeeController.getRoles)
  .post(protect, employeeController.createRole);

router.route("/roles/:id")
  .patch(protect, employeeController.updateRole)
  .delete(protect, employeeController.deleteRole);

// Employee Routes
router.route("/")
  .get(protect, employeeController.getEmployees)
  .post(protect, employeeController.createEmployee);

router.route("/:id")
  .patch(protect, employeeController.updateEmployee)
  .delete(protect, employeeController.deleteEmployee);

module.exports = router;
