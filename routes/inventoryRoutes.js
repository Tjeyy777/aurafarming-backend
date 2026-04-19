const express = require('express');
const inventoryController = require('../controllers/inventoryController');

const router = express.Router();

// ==========================
// SELLER ROUTES
// ==========================
router.route('/sellers')
  .get(inventoryController.getAllSellers)
  .post(inventoryController.createSeller);

router.route('/sellers/:id')
  // ❌ removed getSingleSeller (was causing crash)
  .patch(inventoryController.updateSeller)
  .delete(inventoryController.deleteSeller);


// ==========================
// ITEM ROUTES
// ==========================
router.route('/items')
  .get(inventoryController.getAllItems)
  .post(inventoryController.createItem);

// ✅ IMPORTANT: keep this BEFORE /:id
router.get('/items/low-stock', inventoryController.getLowStockItems);

router.route('/items/:id')
  .get(inventoryController.getSingleItem)
  .patch(inventoryController.updateItem)
  .delete(inventoryController.deleteItem);


// ==========================
// TRANSACTION ROUTES
// ==========================
router.post('/transactions', inventoryController.addTransaction);
router.get('/transactions/:itemId', inventoryController.getItemTransactions);

module.exports = router;