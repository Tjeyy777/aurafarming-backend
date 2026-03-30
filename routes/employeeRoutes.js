const express = require("express");

const employeeController = require("../controllers/employeeController");

const router = express.Router();

router
  .route("/")
  .post(employeeController.createEmployee)
  .get(employeeController.getEmployees);

router
  .route("/:id")
  .patch(employeeController.updateEmployee)
  .delete(employeeController.deleteEmployee);

module.exports = router;
