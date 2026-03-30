const Expense = require('../models/Expense');

exports.createExpense = async (req, res) => {
  try {
    const { expenseName, amount, date, notes } = req.body;

    const amountNumber = Number(amount);

    if (Number.isNaN(amountNumber) || amountNumber < 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Amount must be a valid positive number'
      });
    }

    const expense = await Expense.create({
      expenseName,
      amount: amountNumber,
      date,
      notes,
      createdBy: req.user._id
    });

    res.status(201).json({
      status: 'success',
      data: expense
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};

exports.getAllExpenses = async (req, res) => {
  try {
    const filter = { isDeleted: false, createdBy: req.user._id };

    if (req.query.date) {
      const targetDate = new Date(req.query.date);
      const nextDate = new Date(targetDate);
      nextDate.setDate(nextDate.getDate() + 1);

      filter.date = {
        $gte: targetDate,
        $lt: nextDate
      };
    }

    if (req.query.startDate && req.query.endDate) {
      const startDate = new Date(req.query.startDate);
      const endDate = new Date(req.query.endDate);
      endDate.setDate(endDate.getDate() + 1);

      filter.date = {
        $gte: startDate,
        $lt: endDate
      };
    }

    const expenses = await Expense.find(filter).sort({ date: -1, createdAt: -1 });

    res.status(200).json({
      status: 'success',
      results: expenses.length,
      data: expenses
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

exports.getSingleExpense = async (req, res) => {
  try {
    const expense = await Expense.findOne({
      _id: req.params.id,
      isDeleted: false,
      createdBy: req.user._id
    });

    if (!expense) {
      return res.status(404).json({
        status: 'error',
        message: 'Expense not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: expense
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

exports.updateExpense = async (req, res) => {
  try {
    const expense = await Expense.findOne({
      _id: req.params.id,
      isDeleted: false,
      createdBy: req.user._id
    });

    if (!expense) {
      return res.status(404).json({
        status: 'error',
        message: 'Expense not found'
      });
    }

    if (req.body.expenseName !== undefined) {
      expense.expenseName = req.body.expenseName;
    }

    if (req.body.amount !== undefined) {
      const amountNumber = Number(req.body.amount);

      if (Number.isNaN(amountNumber) || amountNumber < 0) {
        return res.status(400).json({
          status: 'error',
          message: 'Amount must be a valid positive number'
        });
      }

      expense.amount = amountNumber;
    }

    if (req.body.date !== undefined) {
      expense.date = req.body.date;
    }

    if (req.body.notes !== undefined) {
      expense.notes = req.body.notes;
    }

    await expense.save();

    res.status(200).json({
      status: 'success',
      data: expense
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};

exports.deleteExpense = async (req, res) => {
  try {
    const expense = await Expense.findOneAndUpdate(
      { _id: req.params.id, isDeleted: false, createdBy: req.user._id },
      { isDeleted: true },
      { new: true }
    );

    if (!expense) {
      return res.status(404).json({
        status: 'error',
        message: 'Expense not found'
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Expense deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

exports.getExpenseSummary = async (req, res) => {
  try {
    const matchFilter = { isDeleted: false, createdBy: req.user._id };

    if (req.query.date) {
      const targetDate = new Date(req.query.date);
      const nextDate = new Date(targetDate);
      nextDate.setDate(nextDate.getDate() + 1);

      matchFilter.date = {
        $gte: targetDate,
        $lt: nextDate
      };
    }

    if (req.query.startDate && req.query.endDate) {
      const startDate = new Date(req.query.startDate);
      const endDate = new Date(req.query.endDate);
      endDate.setDate(endDate.getDate() + 1);

      matchFilter.date = {
        $gte: startDate,
        $lt: endDate
      };
    }

    const overall = await Expense.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: null,
          totalExpenseAmount: { $sum: '$amount' },
          totalExpenseEntries: { $sum: 1 }
        }
      }
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        overview: overall[0] || {
          totalExpenseAmount: 0,
          totalExpenseEntries: 0
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};