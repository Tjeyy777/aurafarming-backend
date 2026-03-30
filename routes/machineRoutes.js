const express = require('express');
const machineController = require('../controllers/machineController');

const router = express.Router();

router.get('/service-alerts', machineController.getServiceAlerts);
router.get('/summary/:machineId', machineController.getMachineSummary);

router.post('/logs', machineController.createMachineLog);
router.get('/logs', machineController.getMachineLogs);
router.get('/logs/history/:machineId', machineController.getMachineLogHistory);
router.patch('/logs/:id', machineController.updateMachineLog);
router.delete('/logs/:id', machineController.deleteMachineLog);

router.post('/', machineController.createMachine);
router.get('/', machineController.getAllMachines);
router.get('/:id', machineController.getSingleMachine);
router.patch('/:id', machineController.updateMachine);
router.delete('/:id', machineController.deleteMachine);
router.post('/:id/mark-service-done', machineController.markServiceDone);

module.exports = router;