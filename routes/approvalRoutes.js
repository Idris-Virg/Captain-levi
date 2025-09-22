const express = require('express');
const router = express.Router();
const approvalController = require('../controllers/approvalController');

router.get('/', approvalController.getApprovals);
router.get('/:request_id', approvalController.getApprovalsByRequest);
router.post('/', approvalController.createApproval);

module.exports = router;
