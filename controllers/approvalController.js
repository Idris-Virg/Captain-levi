const approvalService = require('../services/approvalService');

exports.getApprovalWorkflow = async (req, res) => {
  try {
    const requestId = parseInt(req.params.request_id, 10);
    if (isNaN(requestId)) {
      return res.status(400).json({ error: 'Invalid request ID' });
    }
    
    const workflow = await approvalService.getApprovalWorkflow(requestId);
    res.json(workflow);
  } catch (err) {
    console.error('Error fetching approval workflow:', err);
    res.status(500).json({ error: 'Failed to fetch approval workflow' });
  }
};

exports.updateApprovalStatus = async (req, res) => {
  try {
    const { request_id, role, status, comment, approver_name, approver_email } = req.body;
    
    if (!request_id || !role || !status || !approver_email) {
      return res.status(400).json({ error: 'Request ID, role, status, and approver email are required' });
    }

    const result = await approvalService.updateApprovalStatus({
      request_id,
      role,
      status,
      comment,
      approver_name,
      approver_email
    });
    
    res.json({ message: 'Approval status updated', result });
  } catch (err) {
    console.error('Error updating approval status:', err);
    res.status(400).json({ error: err.message || 'Failed to update approval status' });
  }
};

exports.getApprovalRequests = async (req, res) => {
  try {
    const requests = await approvalService.getApprovalRequests();
    res.json(requests);
  } catch (err) {
    console.error('Error fetching approval requests:', err);
    res.status(500).json({ error: 'Failed to fetch approval requests' });
  }
};

exports.getAccessRequests = async (req, res) => {
  try {
    const requests = await approvalService.getAccessRequests();
    res.json(requests);
  } catch (err) {
    console.error('Error fetching access requests:', err);
    res.status(500).json({ error: 'Failed to fetch access requests' });
  }
};

exports.createApprovalRequest = async (req, res) => {
  try {
    const request = await approvalService.createApprovalRequest(req.body);
    res.status(201).json({ message: 'Approval request created', request });
  } catch (err) {
    console.error('Error creating approval request:', err);
    res.status(400).json({ error: err.message || 'Failed to create approval request' });
  }
};

exports.getApprovalHistory = async (req, res) => {
  try {
    const requestId = parseInt(req.params.request_id, 10);
    if (isNaN(requestId)) {
      return res.status(400).json({ error: 'Invalid request ID' });
    }
    
    const history = await approvalService.getApprovalHistory(requestId);
    res.json(history);
  } catch (err) {
    console.error('Error fetching approval history:', err);
    res.status(500).json({ error: 'Failed to fetch approval history' });
  }
};

exports.linkApprovalToAccessRequest = async (req, res) => {
  try {
    const { approval_request_id, access_request_id } = req.body;
    
    if (!approval_request_id || !access_request_id) {
      return res.status(400).json({ error: 'approval_request_id and access_request_id are required' });
    }

    const result = await approvalService.linkApprovalToAccessRequest(approval_request_id, access_request_id);
    res.json(result);
  } catch (err) {
    console.error('Error linking requests:', err);
    res.status(400).json({ error: err.message || 'Failed to link requests' });
  }
};

exports.syncAccessRequests = async (req, res) => {
  try {
    const result = await approvalService.syncExistingAccessRequests();
    res.json({ message: 'Sync completed', result });
  } catch (err) {
    console.error('Error syncing access requests:', err);
    res.status(500).json({ error: 'Failed to sync access requests' });
  }
};

// Get access request workflow (for old system)
exports.getAccessRequestWorkflow = async (req, res) => {
  try {
    const requestId = parseInt(req.params.request_id, 10);
    if (isNaN(requestId)) {
      return res.status(400).json({ error: 'Invalid request ID' });
    }
    
    const workflow = await approvalService.getAccessRequestWorkflow(requestId);
    res.json(workflow);
  } catch (err) {
    console.error('Error fetching access request workflow:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch workflow' });
  }
};

// Update approval status for access requests (old system)
exports.updateAccessRequestApproval = async (req, res) => {
  try {
    const { request_id, role, status, comment, approver_name, approver_email } = req.body;
    
    if (!request_id || !role || !status || !approver_email) {
      return res.status(400).json({ error: 'Request ID, role, status, and approver email are required' });
    }

    const result = await approvalService.updateAccessRequestApproval({
      request_id,
      role,
      status,
      comment,
      approver_name,
      approver_email
    });
    
    res.json({ message: 'Approval status updated', result });
  } catch (err) {
    console.error('Error updating access request approval:', err);
    res.status(400).json({ error: err.message || 'Failed to update approval status' });
  }
};

// Get pending access requests
exports.getPendingAccessRequests = async (req, res) => {
  try {
    const requests = await approvalService.getPendingAccessRequests();
    res.json(requests);
  } catch (err) {
    console.error('Error fetching pending access requests:', err);
    res.status(500).json({ error: 'Failed to fetch pending requests' });
  }
};