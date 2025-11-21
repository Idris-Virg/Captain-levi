const express = require('express');
const router = express.Router();
const requestController = require('../controllers/requestController');
const authenticateUser = require('../middlewares/auth');


// These match directly with /api/requests
router.post('/request',  requestController.createRequest);
router.get('/request',authenticateUser, requestController.getRequests);
router.get('/request/:id', requestController.getRequestById);

module.exports = router;
