const express = require('express');
const rentedMachineController = require('../controllers/rentedMachineController');

const router = express.Router();

// ─── RENTED VEHICLE MASTER ROUTES ────────────────────────────────────────────

router.post('/vehicles', rentedMachineController.createRentedVehicle);
router.get('/vehicles', rentedMachineController.getAllRentedVehicles);
router.get('/vehicles/:id', rentedMachineController.getSingleRentedVehicle);
router.patch('/vehicles/:id', rentedMachineController.updateRentedVehicle);
router.delete('/vehicles/:id', rentedMachineController.deleteRentedVehicle);

// ─── SUMMARY/REPORTS ─────────────────────────────────────────────────────────

router.get('/summary', rentedMachineController.getRentedSummary);

// ─── TRIP ROUTES — must come BEFORE /logs/:id ────────────────────────────────

router.post('/logs/create-trip', rentedMachineController.createTripFromLog);

// ─── RENTED MACHINE LOG ROUTES ───────────────────────────────────────────────

router.post('/logs', rentedMachineController.createRentedLog);
router.get('/logs', rentedMachineController.getRentedLogs);
router.patch('/logs/:id', rentedMachineController.updateRentedLog);
router.delete('/logs/:id', rentedMachineController.deleteRentedLog);

module.exports = router;