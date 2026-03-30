const express = require('express');
const expenseController = require('../controllers/expenseController');

const router = express.Router();

router.get('/summary', expenseController.getExpenseSummary);

router.post('/', expenseController.createExpense);
router.get('/', expenseController.getAllExpenses);
router.get('/:id', expenseController.getSingleExpense);
router.patch('/:id', expenseController.updateExpense);
router.delete('/:id', expenseController.deleteExpense);

module.exports = router;