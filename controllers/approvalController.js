const approvalService = require('../services/approvalService');

exports.getApprovals = async (req, res) => {
  try {
    const approvals = await approvalService.getAllApprovals();
    res.json(approvals);
  } catch (err) {
    console.error('Error fetching approvals:', err);
    res.status(500).json({ error: 'Failed to fetch approvals' });
  }
}; 

exports.getApprovalsByRequest = async (req, res) => {
  try {
    const requestId = parseInt(req.params.request_id, 10);
    if (isNaN(requestId)) {
      return res.status(400).json({ error: 'Invalid request ID' });
  } 
    const approvals = await approvalService.getApprovalsByRequestId(requestId);
    res.json(approvals);
  } catch (err) { 
    console.error('Error fetching approvals:', err);
    res.status(500).json({ error: 'Failed to fetch approvals' });
  }
};  

exports.createApproval = async (req, res) => {
  try {
    const approval = await approvalService.createApproval(req.body);
    res.status(201).json({ message: 'Approval recorded', approval });
  } catch (err) {
    console.error('Error recording approval:', err);
    res.status(400).json({ error: err.message || 'Failed to record approval' });
  }
};
