const express = require('express');
const router = express.Router();
const requestController = require('../controllers/requestController');

// These match directly with /api/requests
router.post('/', requestController.createRequest);
router.get('/', requestController.getRequests);
router.get('/:id', requestController.getRequestById);

module.exports = router;
