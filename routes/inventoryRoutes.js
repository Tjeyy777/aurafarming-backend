const express = require('express');
const inventoryController = require('../controllers/inventoryController');

const router = express.Router();

router.post('/items', inventoryController.createItem);
router.get('/items', inventoryController.getAllItems);
router.get('/items/low-stock', inventoryController.getLowStockItems);
router.get('/items/:id', inventoryController.getSingleItem);
router.patch('/items/:id', inventoryController.updateItem);

router.post('/transactions', inventoryController.addTransaction);
router.get('/transactions/:itemId', inventoryController.getItemTransactions);

module.exports = router;