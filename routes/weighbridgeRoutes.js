const express = require('express');
const weighbridgeController = require('../controllers/weighbridgeController');

const router = express.Router();

// create
router.post('/', weighbridgeController.createWeighbridgeEntry);

// special fetch routes
router.get('/today', weighbridgeController.getTodayEntries);
router.get('/open', weighbridgeController.getOpenEntries);
router.get('/summary/production', weighbridgeController.getProductionSummary);
router.get('/history/daily-summary', weighbridgeController.getDailyHistorySummary);
router.get('/day/:date', weighbridgeController.getEntriesByDay);
router.get('/vehicle/:vehicleNumber/previous-weight', weighbridgeController.getPreviousVehicleWeight);

// normal fetch
router.get('/', weighbridgeController.getAllWeighbridgeEntries);
router.get('/:id', weighbridgeController.getWeighbridgeEntryById);

// updates
router.patch('/:id/complete', weighbridgeController.completeWeighbridgeEntry);
router.patch('/:id', weighbridgeController.updateWeighbridgeEntry);

// delete
router.delete('/:id', weighbridgeController.deleteWeighbridgeEntry);

module.exports = router;