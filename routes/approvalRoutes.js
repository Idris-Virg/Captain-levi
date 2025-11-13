const express = require('express');
const router = express.Router();
const approvalController = require('../controllers/approvalController');

router.get('/approval', approvalController.getApprovals);
router.get('/approval/:request_id', approvalController.getApprovalsByRequest);
router.post('/approval', approvalController.createApproval);

module.exports = router;
