const requestService = require('../services/requestService');

exports.createRequest = async (req, res) => {
  try {
    const { requester_name, requester_email, request_type, request_details } = req.body;
    if (!requester_name || !requester_email || !request_type) {
      return res.status(400).json({ error: 'requester_name, requester_email and request_type are required' });
  }

    const newRequest = await requestService.createRequest({ requester_name, requester_email, request_type, request_details });
    res.status(201).json({ message: 'Request created with approval stages', request: newRequest });
  } catch (err) {
    console.error('Error creating request:', err);
    res.status(500).json({ error: 'Failed to create request' });
  }
};

exports.getRequests = async (req, res) => {
  try {
    const requests = await requestService.getRequests();
    res.json(requests);
  } catch (err) {
    console.error('Error fetching requests:', err);
    res.status(500).json({ error: 'Failed to fetch requests' });
  }
};  

exports.getRequestById = async (req, res) => {
  try {
    const requestId = parseInt(req.params.id, 10);
    if (isNaN(requestId)) return res.status(400).json({ error: 'Invalid request ID' });

    const request = await requestService.getRequestById(requestId);
    if (!request) return res.status(404).json({ error: 'Request not found' });

    res.json(request);
  } catch (err) { 
    console.error('Error fetching request:', err);
    res.status(500).json({ error: 'Failed to fetch request' });
  }
};
