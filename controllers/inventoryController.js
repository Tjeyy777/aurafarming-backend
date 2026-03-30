const InventoryItem = require('../models/InventoryItem');
const InventoryTransaction = require('../models/InventoryTransaction');

exports.createItem = async (req, res) => {
  try {
    const item = await InventoryItem.create({
      ...req.body,
      createdBy: req.user._id,
    });

    res.status(201).json({ status: 'success', data: item });
  } catch (error) {
    res.status(400).json({ status: 'error', message: error.message });
  }
};

exports.getAllItems = async (req, res) => {
  try {
    const items = await InventoryItem.find({ createdBy: req.user._id }).sort({ createdAt: -1 });

    res.status(200).json({ status: 'success', results: items.length, data: items });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

exports.getSingleItem = async (req, res) => {
  try {
    const item = await InventoryItem.findOne({
      _id: req.params.id,
      createdBy: req.user._id,
    });

    if (!item) {
      return res.status(404).json({ status: 'error', message: 'Item not found' });
    }

    res.status(200).json({ status: 'success', data: item });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

exports.updateItem = async (req, res) => {
  try {
    const item = await InventoryItem.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user._id },
      req.body,
      { new: true, runValidators: true }
    );

    if (!item) {
      return res.status(404).json({ status: 'error', message: 'Item not found' });
    }

    res.status(200).json({ status: 'success', data: item });
  } catch (error) {
    res.status(400).json({ status: 'error', message: error.message });
  }
};

exports.addTransaction = async (req, res) => {
  try {
    const { itemId, date, type, quantity, reason, notes } = req.body;

    const item = await InventoryItem.findOne({
      _id: itemId,
      createdBy: req.user._id,
    });

    if (!item) {
      return res.status(404).json({ status: 'error', message: 'Inventory item not found' });
    }

    const qty = Number(quantity);

    if (Number.isNaN(qty) || qty === 0) {
      return res.status(400).json({ status: 'error', message: 'Quantity must be a valid non-zero number' });
    }

    let newStock = item.currentStock;
    let cost = 0;

    if (type === 'purchase') {
      if (qty < 0) return res.status(400).json({ status: 'error', message: 'Purchase quantity must be positive' });
      newStock += qty;
      cost = qty * item.unitCost;
    } else if (type === 'usage') {
      if (qty < 0) return res.status(400).json({ status: 'error', message: 'Usage quantity must be positive' });
      if (qty > item.currentStock) return res.status(400).json({ status: 'error', message: 'Insufficient stock for usage entry' });
      newStock -= qty;
      cost = qty * item.unitCost;
    } else if (type === 'adjustment') {
      newStock += qty;
      if (newStock < 0) return res.status(400).json({ status: 'error', message: 'Adjustment would make stock negative' });
      cost = Math.abs(qty) * item.unitCost;
    } else {
      return res.status(400).json({ status: 'error', message: 'Invalid transaction type' });
    }

    item.currentStock = newStock;
    await item.save();

    const transaction = await InventoryTransaction.create({
      itemId, date, type, quantity: qty, cost, reason, notes
    });

    res.status(201).json({
      status: 'success',
      data: { transaction, updatedStock: item.currentStock }
    });
  } catch (error) {
    res.status(400).json({ status: 'error', message: error.message });
  }
};

exports.getItemTransactions = async (req, res) => {
  try {
    // Verify the item belongs to this user first
    const item = await InventoryItem.findOne({
      _id: req.params.itemId,
      createdBy: req.user._id,
    });

    if (!item) {
      return res.status(404).json({ status: 'error', message: 'Item not found' });
    }

    const transactions = await InventoryTransaction.find({ itemId: req.params.itemId })
      .populate('itemId', 'name category unit currentStock')
      .sort({ date: -1, createdAt: -1 });

    res.status(200).json({ status: 'success', results: transactions.length, data: transactions });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

exports.getLowStockItems = async (req, res) => {
  try {
    const items = await InventoryItem.find({
      $expr: { $lte: ['$currentStock', '$lowStockLimit'] },
      status: 'active',
      createdBy: req.user._id,
    }).sort({ currentStock: 1 });

    res.status(200).json({ status: 'success', results: items.length, data: items });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};