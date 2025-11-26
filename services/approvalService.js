const pool = require('../db');

const nextStageMap = {
  'User': 'Admin',
  'Admin': 'Super_Admin',
  'Super_Admin': 'Completed'
};

// Map approval roles to access_request stages
const stageMap = {
  'User': 'User Review',
  'Admin': 'IT Help Desk', 
  'Super_Admin': 'Management Approval'
};

async function getApprovalWorkflow(requestId) {
  const client = await pool.connect();
  try {
    // Get all stages for this request
    const stagesResult = await client.query(
      `SELECT stage_role, stage_status, stage_comment, stage_order 
       FROM approval_stages 
       WHERE request_id = $1 
       ORDER BY stage_order`,
      [requestId]
    );

    if (stagesResult.rows.length === 0) {
      throw new Error('No approval stages found for this request');
    }

    // Get current request status
    const requestResult = await client.query(
      `SELECT current_stage, overall_status FROM approval_requests WHERE id = $1`,
      [requestId]
    );

    if (requestResult.rows.length === 0) {
      throw new Error('Approval request not found');
    }

    const { current_stage, overall_status } = requestResult.rows[0];

    const workflow = stagesResult.rows.map(stage => ({
      role: stage.stage_role,
      status: stage.stage_status,
      comment: stage.stage_comment || '',
      order: stage.stage_order
    }));

    return workflow;
  } catch (err) {
    console.error('Error building approval workflow:', err);
    throw err;
  } finally {
    client.release();
  }
}

async function updateApprovalStatus(data) {
  const { request_id, role, status, comment, approver_name, approver_email } = data;
  console.log('Updating approval status for request:', request_id, 'role:', role, 'status:', status);
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Get the stage to update
    const stageResult = await client.query(
      `SELECT id FROM approval_stages 
       WHERE request_id = $1 AND stage_role = $2`,
      [request_id, role]
    );

    if (stageResult.rows.length === 0) {
      throw new Error('Invalid approval stage for this request');
    }

    const stageId = stageResult.rows[0].id;

    // Update the approval stage
    await client.query(
      `UPDATE approval_stages 
       SET stage_status = $1, stage_comment = $2, completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [status, comment || null, stageId]
    );

    // Record the decision
    const decisionResult = await client.query(
      `INSERT INTO approval_decisions 
        (request_id, stage_id, approver_role, approver_name, approver_email, decision, comments)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [request_id, stageId, role, approver_name, approver_email, status, comment || null]
    );

    // Update the request status in approval_requests
    if (status === 'Approved') {
      const nextStage = nextStageMap[role];
      console.log('Next stage:', nextStage);
      if (nextStage && nextStage !== 'Completed') {
        await client.query(
          `UPDATE approval_requests SET current_stage = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
          [nextStage, request_id]
        );
      } else {
        await client.query(
          `UPDATE approval_requests SET current_stage = 'Completed', overall_status = 'Approved', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
          [request_id]
        );
      }
    } else if (status === 'Rejected') {
      await client.query(
        `UPDATE approval_requests SET overall_status = 'Rejected', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [request_id]
      );
    }

    // INTEGRATION: Update the access_requests table
    await updateAccessRequestStatus(request_id, role, status, approver_name, approver_email, comment, client);

    await client.query('COMMIT');

    // Return updated workflow
    const updatedWorkflow = await getApprovalWorkflow(request_id);
    console.log('Updated workflow:', updatedWorkflow);
    return updatedWorkflow;
  } catch (err) {
    console.log('Error in updateApprovalStatus:', err);
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// Improved helper function to update access_requests table
async function updateAccessRequestStatus(approvalRequestId, role, status, approver_name, approver_email, comment, client) {
  try {
    // Get the approval request details
    const approvalRequest = await client.query(
      `SELECT * FROM approval_requests WHERE id = $1`,
      [approvalRequestId]
    );

    if (approvalRequest.rows.length === 0) {
      console.log('Approval request not found for integration');
      return;
    }

    const apr = approvalRequest.rows[0];
    const requestDetails = typeof apr.request_details === 'string' 
      ? JSON.parse(apr.request_details) 
      : apr.request_details;
    
    console.log('Looking for access_request with email:', apr.requester_email);
    console.log('Request details:', requestDetails);

    // Better matching logic - look for access_requests with same requester email
    const accessRequest = await client.query(
      `SELECT id, current_stage, status FROM access_requests 
       WHERE requester_email = $1 
       ORDER BY created_at DESC 
       LIMIT 1`,
      [apr.requester_email]
    );

    if (accessRequest.rows.length === 0) {
      console.log('No access_request found for email:', apr.requester_email);
      // Create a new access_request if none exists
      await createAccessRequestFromApproval(apr, client);
      return;
    }

    const accessRequestId = accessRequest.rows[0].id;
    console.log('Found access_request:', accessRequestId);

    const accessRequestStage = stageMap[role] || role;

    if (status === 'Approved') {
      const nextStage = nextStageMap[role];
      if (nextStage && nextStage !== 'Completed') {
        const nextAccessStage = stageMap[nextStage] || nextStage;
        await client.query(
          `UPDATE access_requests SET current_stage = $1, status = 'In Progress' WHERE id = $2`,
          [nextAccessStage, accessRequestId]
        );
        console.log(`Updated access_request ${accessRequestId} to stage: ${nextAccessStage}`);
      } else {
        await client.query(
          `UPDATE access_requests SET current_stage = 'Completed', status = 'Approved' WHERE id = $1`,
          [accessRequestId]
        );
        console.log(`Completed access_request ${accessRequestId}`);
      }
    } else if (status === 'Rejected') {
      await client.query(
        `UPDATE access_requests SET status = 'Rejected' WHERE id = $1`,
        [accessRequestId]
      );
      console.log(`Rejected access_request ${accessRequestId}`);
    }
    // Also record the approval in the old approvals table
    await client.query(
      `INSERT INTO approvals 
        (request_id, approver_role, approver_name, approver_email, decision, comments, decided_at)
       VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)`,
      [accessRequestId, role, approver_name, approver_email, status, comment || null]
    );

    console.log(`Successfully integrated with access_request ${accessRequestId}`);
    
  } catch (err) {
    console.error('Error updating access_requests table:', err);
    // Don't throw here to avoid breaking the main transaction
  }
}

async function createApprovalRequest(data) {
  const { workflow_id, request_title, requester_name, requester_email, request_details } = data;

  if (!workflow_id || !request_title || !requester_name || !requester_email) {
    throw new Error('workflow_id, request_title, requester_name, and requester_email are required');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Get workflow stages
    const workflowResult = await client.query(
      `SELECT stages FROM approval_workflows WHERE id = $1 AND is_active = true`,
      [workflow_id]
    );

    if (workflowResult.rows.length === 0) {
      throw new Error('Workflow not found or inactive');
    }

    const stages = workflowResult.rows[0].stages;
    const firstStage = stages[0];

    // Create the approval request
    const requestResult = await client.query(
      `INSERT INTO approval_requests 
        (workflow_id, request_title, requester_name, requester_email, request_details, current_stage)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [workflow_id, request_title, requester_name, requester_email, JSON.stringify(request_details || {}), firstStage]
    );

    const request = requestResult.rows[0];

    // Create approval stages
    for (let i = 0; i < stages.length; i++) {
      await client.query(
        `INSERT INTO approval_stages (request_id, stage_role, stage_order)
         VALUES ($1, $2, $3)`,
        [request.id, stages[i], i + 1]
      );
    }

    // INTEGRATION: Also create an entry in access_requests table
    await createAccessRequestFromApproval(request, client);

    await client.query('COMMIT');
    return request;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// Improved helper function to create access_request from approval request
async function createAccessRequestFromApproval(approvalRequest, client) {
  try {
    const requestDetails = typeof approvalRequest.request_details === 'string' 
      ? JSON.parse(approvalRequest.request_details) 
      : approvalRequest.request_details;
    
    const databaseName = requestDetails.database_name || 'Application Database';
    const accessLevel = requestDetails.access_level || 'Read Only';
    const justification = requestDetails.justification || 'Database access request';

    const accessRequestResult = await client.query(
      `INSERT INTO access_requests 
        (requester_name, requester_email, request_type, request_details, summary, current_stage, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        approvalRequest.requester_name,
        approvalRequest.requester_email,
        'Database Access',
        `${databaseName} - ${accessLevel}`,
        justification,
        'User Review', // Map first approval stage to access_request stage
        'Pending'
      ]
    );

    console.log(`Created access_request ${accessRequestResult.rows[0].id} for approval_request ${approvalRequest.id}`);
    
    return accessRequestResult.rows[0];
  } catch (err) {
    console.error('Error creating access_request:', err);
    // Don't throw here to avoid breaking the main transaction
    return null;
  }
}

async function getApprovalRequests() {
  const result = await pool.query(
    `SELECT ar.*, wf.workflow_name,
            (SELECT COUNT(*) FROM approval_stages ast WHERE ast.request_id = ar.id AND ast.stage_status = 'Approved') as approved_stages,
            (SELECT COUNT(*) FROM approval_stages ast WHERE ast.request_id = ar.id) as total_stages
     FROM approval_requests ar
     JOIN approval_workflows wf ON ar.workflow_id = wf.id
     ORDER BY ar.created_at DESC`
  );
  return result.rows; 
}

async function getAccessRequests() {
  const result = await pool.query(
    `SELECT ar.*, 
            (SELECT COUNT(*) FROM approvals a WHERE a.request_id = ar.id AND a.decision = 'Approved') as approvals_count
     FROM access_requests ar 
     ORDER BY ar.created_at DESC`
  );
  return result.rows;
}

async function getApprovalHistory(requestId) {
  const result = await pool.query(
    `SELECT ad.*, ast.stage_role, ast.stage_order
     FROM approval_decisions ad
     JOIN approval_stages ast ON ad.stage_id = ast.id
     WHERE ad.request_id = $1
     ORDER BY ad.decided_at DESC`,
    [requestId]
  );
  return result.rows;
}

// Function to manually link approval_requests to access_requests
async function linkApprovalToAccessRequest(approvalRequestId, accessRequestId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Update the access_request to match the approval_request
    const approvalRequest = await client.query(
      `SELECT * FROM approval_requests WHERE id = $1`,
      [approvalRequestId]
    );

    if (approvalRequest.rows.length === 0) {
      throw new Error('Approval request not found');
    }

    const apr = approvalRequest.rows[0];
    const requestDetails = typeof apr.request_details === 'string' 
      ? JSON.parse(apr.request_details) 
      : apr.request_details;

    await client.query(
      `UPDATE access_requests 
       SET requester_name = $1, requester_email = $2, request_details = $3
       WHERE id = $4`,
      [
        apr.requester_name,
        apr.requester_email,
        `${requestDetails.database_name} - ${requestDetails.access_level}`,
        accessRequestId
      ]
    );

    await client.query('COMMIT');
    return { message: 'Successfully linked approval request to access request' };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// Get approval workflow for access_requests (old system)
async function getAccessRequestWorkflow(requestId) {
  const client = await pool.connect();
  try {
    // Get the access request
    const requestResult = await client.query(
      `SELECT * FROM access_requests WHERE id = $1`,
      [requestId]
    );

    if (requestResult.rows.length === 0) {
      throw new Error('Access request not found');
    }

    // Get all approval stages for this request
    const approvalsResult = await client.query(
      `SELECT * FROM approvals 
       WHERE request_id = $1 
       ORDER BY 
         CASE approver_role 
           WHEN 'User' THEN 1 
           WHEN 'Admin' THEN 2 
           WHEN 'Super_Admin' THEN 3 
           ELSE 4 
         END`,
      [requestId]
    );

    const workflow = approvalsResult.rows.map(approval => ({
      role: approval.approver_role,
      status: approval.decision,
      comment: approval.comments || '',
      approver_name: approval.approver_name,
      approver_email: approval.approver_email,
      decided_at: approval.decided_at
    }));

    return {
      request: requestResult.rows[0],
      workflow: workflow
    };
  } catch (err) {
    console.error('Error getting access request workflow:', err);
    throw err;
  } finally {
    client.release();
  }
}

// Update approval status for access_requests (old system)
async function updateAccessRequestApproval(data) {
  const { request_id, role, status, comment, approver_name, approver_email } = data;
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Update the approval record
    await client.query(
      `UPDATE approvals 
       SET decision = $1, comments = $2, approver_name = $3, approver_email = $4, decided_at = CURRENT_TIMESTAMP
       WHERE request_id = $5 AND approver_role = $6 AND decision = 'Pending'`,
      [status, comment || null, approver_name, approver_email, request_id, role]
    );

    // Check if this approval was updated
    const checkResult = await client.query(
      `SELECT * FROM approvals WHERE request_id = $1 AND approver_role = $2`,
      [request_id, role]
    );

    if (checkResult.rows.length === 0) {
      throw new Error('Approval stage not found');
    }

    // Update access_request status based on approval
    if (status === 'Approved') {
      const nextStage = nextStageMap[role];
      if (nextStage && nextStage !== 'Completed') {
        const nextAccessStage = stageMap[nextStage] || nextStage;
        await client.query(
          `UPDATE access_requests SET current_stage = $1, status = 'In Progress' WHERE id = $2`,
          [nextAccessStage, request_id]
        );
      } else {
        // All stages approved
        await client.query(
          `UPDATE access_requests SET current_stage = 'Completed', status = 'Approved' WHERE id = $1`,
          [request_id]
        );
      }
    } else if (status === 'Rejected') {
      await client.query(
        `UPDATE access_requests SET status = 'Rejected' WHERE id = $1`,
        [request_id]
      );
    }

    await client.query('COMMIT');

    // Return updated workflow
    const updatedWorkflow = await getAccessRequestWorkflow(request_id);
    return updatedWorkflow.workflow;
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error updating access request approval:', err);
    throw err;
  } finally {
    client.release();
  }
}

// Get pending access requests for approval
async function getPendingAccessRequests() {
  const result = await pool.query(
    `SELECT ar.*, 
            (SELECT COUNT(*) FROM approvals a WHERE a.request_id = ar.id AND a.decision = 'Approved') as approved_count,
            (SELECT COUNT(*) FROM approvals a WHERE a.request_id = ar.id) as total_approvals,
            (SELECT approver_role FROM approvals a WHERE a.request_id = ar.id AND a.decision = 'Pending' ORDER BY 
              CASE approver_role 
                WHEN 'User' THEN 1 
                WHEN 'Admin' THEN 2 
                WHEN 'Super_Admin' THEN 3 
                ELSE 4 
              END LIMIT 1) as current_approver_role
     FROM access_requests ar 
     WHERE ar.status IN ('Pending', 'In Progress')
     ORDER BY ar.created_at DESC`
  );
  return result.rows;
}

module.exports = {
  getApprovalWorkflow,
  updateApprovalStatus,
  createApprovalRequest,
  getApprovalRequests,
  getAccessRequests,
  getApprovalHistory,
  linkApprovalToAccessRequest,
  getAccessRequestWorkflow,
  updateAccessRequestApproval,
  getPendingAccessRequests,
  syncExistingAccessRequests: async () => {
    // Placeholder function - can be implemented if needed
    return { message: 'Sync function not yet implemented' };
  }
};