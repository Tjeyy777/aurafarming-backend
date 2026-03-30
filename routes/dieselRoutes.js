const express = require('express');
const dieselController = require('../controllers/dieselController');

const router = express.Router();

router.get('/owned-machines', dieselController.getOwnedMachinesForDiesel);

router.post('/', dieselController.createDieselEntry);
router.get('/', dieselController.getAllDieselEntries);
router.get('/:id', dieselController.getSingleDieselEntry);
router.patch('/:id', dieselController.updateDieselEntry);
router.delete('/:id', dieselController.deleteDieselEntry);

module.exports = router;