const express = require('express');
const consumableController = require('../controllers/ConsumableController');

const router = express.Router();

router.post('/items', consumableController.createItem);
router.get('/items', consumableController.getAllItems);
router.get('/items/low-stock', consumableController.getLowStockItems);
router.get('/items/:id', consumableController.getSingleItem);
router.patch('/items/:id', consumableController.updateItem);
router.delete('/items/:id', consumableController.deleteItem);

router.post('/transactions', consumableController.addTransaction);
router.get('/transactions/:itemId', consumableController.getItemTransactions);

module.exports = router;