const pool = require('../db');

exports.createRequest = async ({ requester_name, requester_email, request_type, request_details }) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const insertReqText = `
      INSERT INTO access_requests
        (requester_name, requester_email, request_type, request_details, current_stage, status)
      VALUES ($1, $2, $3, $4, 'User', 'Pending')
      RETURNING *;
    `;
    const { rows } = await client.query(insertReqText, [
      requester_name, requester_email, request_type, request_details
    ]);
    const newRequest = rows[0];

    const approvalStages = [ 
      ['User', null, null],
      ['Admin', null, null], 
      ['Super_Admin', null, null], 
    ]; 
    
    for (const [role, name, email] of approvalStages) { 
      await client.query(
        `INSERT INTO approvals (request_id, approver_role, approver_name, approver_email, decision, comments, decided_at)
         VALUES ($1, $2, $3, $4, 'Pending', 'Waiting for review', NULL)`,
        [newRequest.id, role, name, email]
      );
    }

    await client.query('COMMIT');
    return newRequest;

  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

exports.getRequests = async () => {
  const result = await pool.query('SELECT * FROM access_requests ORDER BY id DESC');
  return result.rows;
};

exports.getRequestById = async (id) => {
  const result = await pool.query('SELECT * FROM access_requests WHERE id = $1', [id]);
  return result.rows[0];
};
