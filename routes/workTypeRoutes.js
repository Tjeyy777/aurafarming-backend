const express = require('express');
const workTypeController = require('../controllers/workTypeController');

const router = express.Router();

router.post('/', workTypeController.createWorkType);
router.get('/', workTypeController.getWorkTypes);
router.delete('/:id', workTypeController.deleteWorkType);

module.exports = router;
