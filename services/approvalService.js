const pool = require('../db');

const nextStageMap = {
  'IT Help Desk': 'Line Manager',
  'Line Manager': 'Head of Software Engineering',
  'Head of Software Engineering': 'Head of IT',
  'Head of IT': 'Completed',
};

async function getAllApprovals() {
  const result = await pool.query(
    'SELECT * FROM approvals ORDER BY decided_at NULLS FIRST, id'
  );
  return result.rows;
}

async function getApprovalsByRequestId(requestId) {
  const result = await pool.query(
    `SELECT * FROM approvals WHERE request_id = $1 ORDER BY decided_at NULLS FIRST, id`,
    [requestId]
  );
  return result.rows;
}

async function createApproval(data) {
  const { request_id, approver_role, approver_name, approver_email, decision, comments } = data;

  if (!request_id || !approver_role || !decision) { 
    throw new Error('request_id, approver_role and decision are required');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN'); 

    const r = await client.query(
      `SELECT current_stage FROM access_requests WHERE id = $1`,
      [request_id]
    );
    if (r.rows.length === 0) {
      throw new Error('Request not found');
    }

    const currentStage = r.rows[0].current_stage;
    const nextStage = nextStageMap[currentStage];

    const insertApproval =`
      INSERT INTO approvals  
        (request_id, approver_role, approver_name, approver_email, decision, comments, decided_at)
      VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP) 
      RETURNING *; 
    `;
 
    const inserted = await client.query(insertApproval, [
      request_id,
      approver_role,
      approver_name || null,
      approver_email || null,
      decision,
      comments || null,
    ]);

    if (decision === 'Approved') {
      if (nextStage && nextStage !== 'Completed') {
        await client.query(
          `UPDATE access_requests SET current_stage = $1 WHERE id = $2`,
          [nextStage, request_id]
        );
      } else {
        await client.query(
          `UPDATE access_requests SET current_stage = 'Completed', status = 'Approved' WHERE id = $1`,
          [request_id]
        );
      }
    } else if (decision === 'Rejected') {
      await client.query(
        `UPDATE access_requests SET current_stage = 'User', status = 'Needs Revision' WHERE id = $1`,
        [request_id]
      );
    }

    await client.query('COMMIT');
    return inserted.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  getAllApprovals,
  getApprovalsByRequestId,
  createApproval,
};

