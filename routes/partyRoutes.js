const express = require('express');
const partyController = require('../controllers/partyController');

const router = express.Router();

router.post('/', partyController.createParty);
router.get('/', partyController.getParties);
router.patch('/:id', partyController.updateParty);
router.delete('/:id', partyController.deleteParty);

module.exports = router;
