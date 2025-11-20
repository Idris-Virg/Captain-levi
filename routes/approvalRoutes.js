const express = require('express');
const approvalController = require('../controllers/approvalController');

const router = express.Router();

// Get all approval requests (from new table)
router.get('/requests', approvalController.getApprovalRequests);

// Get all access requests (from old table)
router.get('/access-requests', approvalController.getAccessRequests);

// Get approval workflow for a request
router.get('/workflow/:request_id', approvalController.getApprovalWorkflow);

// Update approval status
router.post('/update-status', approvalController.updateApprovalStatus);

// Create new approval request
router.post('/requests', approvalController.createApprovalRequest);

// Get approval history for a request
router.get('/history/:request_id', approvalController.getApprovalHistory);

// Link approval request to access request
router.post('/link-requests', approvalController.linkApprovalToAccessRequest);

// Sync existing access requests to approval system
router.post('/sync-access-requests', approvalController.syncAccessRequests);

module.exports = router;