const InventoryItem = require('../models/InventoryItem');
const InventoryTransaction = require('../models/InventoryTransaction');
const Seller = require('../models/Seller');


// ==========================
// SELLER CRUD
// ==========================

exports.createSeller = async (req, res) => {
  try {
    const seller = await Seller.create({
      ...req.body,
      createdBy: req.user._id
    });

    res.status(201).json({ status: 'success', data: seller });
  } catch (error) {
    res.status(400).json({ status: 'error', message: error.message });
  }
};

exports.getAllSellers = async (req, res) => {
  try {
    const sellers = await Seller.find({ createdBy: req.user._id })
      .sort({ name: 1 });

    res.status(200).json({
      status: 'success',
      results: sellers.length,
      data: sellers
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

exports.updateSeller = async (req, res) => {
  try {
    const seller = await Seller.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user._id },
      req.body,
      { new: true, runValidators: true }
    );

    if (!seller) {
      return res.status(404).json({ status: 'error', message: 'Seller not found' });
    }

    res.status(200).json({ status: 'success', data: seller });
  } catch (error) {
    res.status(400).json({ status: 'error', message: error.message });
  }
};

exports.deleteSeller = async (req, res) => {
  try {
    const seller = await Seller.findOneAndDelete({
      _id: req.params.id,
      createdBy: req.user._id
    });

    if (!seller) {
      return res.status(404).json({ status: 'error', message: 'Seller not found' });
    }

    res.status(204).json({ status: 'success', data: null });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};


// ==========================
// ITEM CRUD
// ==========================

exports.createItem = async (req, res) => {
  try {

    // ✅ Seller validation
    if (req.body.seller) {
      const seller = await Seller.findOne({
        _id: req.body.seller,
        createdBy: req.user._id
      });

      if (!seller) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid seller selected'
        });
      }
    }

    const item = await InventoryItem.create({
      ...req.body,
      createdBy: req.user._id
    });

    // ✅ Populate seller for UI
    const populatedItem = await item.populate('seller', 'name licenseNumber');

    res.status(201).json({ status: 'success', data: populatedItem });

  } catch (error) {
    res.status(400).json({ status: 'error', message: error.message });
  }
};

exports.getAllItems = async (req, res) => {
  try {
    const items = await InventoryItem.find({
      createdBy: req.user._id
    })
      .populate('seller', 'name licenseNumber')
      .sort({ createdAt: -1 });

    res.status(200).json({
      status: 'success',
      results: items.length,
      data: items
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

exports.getSingleItem = async (req, res) => {
  try {
    const item = await InventoryItem.findOne({
      _id: req.params.id,
      createdBy: req.user._id
    }).populate('seller', 'name licenseNumber');

    if (!item) {
      return res.status(404).json({
        status: 'error',
        message: 'Item not found'
      });
    }

    res.status(200).json({ status: 'success', data: item });

  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

exports.updateItem = async (req, res) => {
  try {

    // ✅ Validate seller if updating
    if (req.body.seller) {
      const seller = await Seller.findOne({
        _id: req.body.seller,
        createdBy: req.user._id
      });

      if (!seller) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid seller selected'
        });
      }
    }

    const item = await InventoryItem.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user._id },
      req.body,
      { new: true, runValidators: true }
    ).populate('seller', 'name licenseNumber');

    if (!item) {
      return res.status(404).json({
        status: 'error',
        message: 'Item not found'
      });
    }

    res.status(200).json({ status: 'success', data: item });

  } catch (error) {
    res.status(400).json({ status: 'error', message: error.message });
  }
};

exports.deleteItem = async (req, res) => {
  try {
    const item = await InventoryItem.findOneAndDelete({
      _id: req.params.id,
      createdBy: req.user._id
    });

    if (!item) {
      return res.status(404).json({
        status: 'error',
        message: 'Item not found'
      });
    }

    res.status(204).json({ status: 'success', data: null });

  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};


// ==========================
// TRANSACTIONS
// ==========================

exports.addTransaction = async (req, res) => {
  try {
    const { itemId, date, type, quantity, reason, notes } = req.body;

    const item = await InventoryItem.findOne({
      _id: itemId,
      createdBy: req.user._id
    });

    if (!item) {
      return res.status(404).json({
        status: 'error',
        message: 'Item not found'
      });
    }

    const qty = Number(quantity);

    if (isNaN(qty) || qty === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid quantity'
      });
    }

    let newStock = item.currentStock;

    if (type === 'purchase') {
      if (qty < 0) {
        return res.status(400).json({ status: 'error', message: 'Purchase must be positive' });
      }
      newStock += qty;

    } else if (type === 'usage') {
      if (qty < 0) {
        return res.status(400).json({ status: 'error', message: 'Usage must be positive' });
      }
      if (qty > item.currentStock) {
        return res.status(400).json({ status: 'error', message: 'Insufficient stock' });
      }
      newStock -= qty;

    } else if (type === 'adjustment') {
      newStock += qty;

    } else {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid transaction type'
      });
    }

    if (newStock < 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Stock cannot be negative'
      });
    }

    item.currentStock = newStock;
    await item.save();

    const transaction = await InventoryTransaction.create({
      itemId,
      date,
      type,
      quantity: qty,
      cost: Math.abs(qty) * item.unitCost,
      reason,
      notes,
      createdBy: req.user._id   // ✅ important
    });

    res.status(201).json({
      status: 'success',
      data: {
        transaction,
        updatedStock: item.currentStock
      }
    });

  } catch (error) {
    res.status(400).json({ status: 'error', message: error.message });
  }
};


exports.getItemTransactions = async (req, res) => {
  try {

    const item = await InventoryItem.findOne({
      _id: req.params.itemId,
      createdBy: req.user._id
    });

    if (!item) {
      return res.status(404).json({
        status: 'error',
        message: 'Item not found'
      });
    }

    const transactions = await InventoryTransaction.find({
      itemId: req.params.itemId,
      createdBy: req.user._id   // ✅ secure
    })
      .populate('itemId', 'name category unit currentStock')
      .sort({ date: -1, createdAt: -1 });

    res.status(200).json({
      status: 'success',
      results: transactions.length,
      data: transactions
    });

  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};


// ==========================
// LOW STOCK
// ==========================

exports.getLowStockItems = async (req, res) => {
  try {
    const items = await InventoryItem.find({
      $expr: { $lte: ['$currentStock', '$lowStockLimit'] },
      status: 'active',
      createdBy: req.user._id
    })
      .populate('seller', 'name')
      .sort({ currentStock: 1 });

    res.status(200).json({
      status: 'success',
      results: items.length,
      data: items
    });

  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};